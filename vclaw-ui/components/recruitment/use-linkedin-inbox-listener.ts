"use client";

import { useSyncExternalStore, useEffect, useRef } from "react";
import { toast } from "@/lib/notifications/toast";
import { useCdpQueue } from "@/components/recruitment/use-cdp-queue";
import {
  subscribeInboxListener,
  getInboxListenerState,
  INBOX_LISTENER_SERVER_SNAPSHOT,
  setInboxListenerActive,
  setInboxListenerPolling,
  setInboxListenerOk,
  setInboxListenerError,
} from "@/lib/recruitment/inbox-listener-state";
import {
  listenLinkedInNewMessages,
  processInboxMessages,
} from "@/lib/recruitment/actions";
import { enrichCandidateLinkedInByProfileUrl } from "@/lib/actions/recruitment/actions";

const POLL_INTERVAL_MS = 60_000;
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000; // lần đầu nhìn lại 10 phút
const CDP_TASK_TYPE = "listen_inbox_poll";

export function useLinkedInInboxListener() {
  const state = useSyncExternalStore(
    subscribeInboxListener,
    getInboxListenerState,
    () => INBOX_LISTENER_SERVER_SNAPSHOT,
  );

  const { enqueue: enqueueCdp } = useCdpQueue();
  // 0 = chưa poll lần nào (dùng lookback 10 phút cho lần đầu)
  const lastSeenAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enqueueCdpRef = useRef(enqueueCdp);
  enqueueCdpRef.current = enqueueCdp;

  useEffect(() => {
    if (!state.active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset để lần bật tiếp theo dùng lại lookback 10 phút
      lastSeenAtRef.current = 0;
      return;
    }

    function doPoll() {
      const isFirstPoll = lastSeenAtRef.current === 0;
      const sinceMs = isFirstPoll ? Date.now() - INITIAL_LOOKBACK_MS : lastSeenAtRef.current;
      const sinceLabel = isFirstPoll
        ? "10 phút trước"
        : new Date(sinceMs).toLocaleTimeString("vi-VN");

      console.log(`[InboxListener] interval fired — since=${sinceLabel} isFirstPoll=${isFirstPoll}`);

      const result = enqueueCdpRef.current({
        type: CDP_TASK_TYPE,
        label: "Kiểm tra tin nhắn LinkedIn mới",
        fn: async () => {
          console.log(`[InboxListener] bắt đầu poll since=${sinceLabel}`);
          setInboxListenerPolling();
          const res = await listenLinkedInNewMessages(sinceMs);

          if (!res.success) {
            console.error(`[InboxListener] listenLinkedInNewMessages lỗi:`, res.error);
            setInboxListenerError(res.error ?? "Lỗi không xác định");
            toast.error(`LinkedIn Listener: ${res.error ?? "Lỗi không xác định"}`, { duration: 8_000 });
            throw new Error(res.error ?? "Lỗi");
          }

          setInboxListenerOk(Date.now());

          // Sau lần đầu dù có hay không có tin nhắn mới, cập nhật lastSeenAt
          if (isFirstPoll) {
            lastSeenAtRef.current = Date.now();
          }

          if (res.newMessages.length === 0) {
            console.log(`[InboxListener] poll xong — không có tin mới`);
            return;
          }

          console.log(`[InboxListener] poll xong — ${res.newMessages.length} tin mới:`, res.newMessages.map(m => m.senderName));

          // Cập nhật lastSeenAt về timestamp tin nhắn mới nhất
          for (const msg of res.newMessages) {
            if (msg.deliveredAt > lastSeenAtRef.current) {
              lastSeenAtRef.current = msg.deliveredAt;
            }
          }

          // Lưu vào DB: upsert Candidate + Conversation + ConversationMessage
          const processed = await processInboxMessages(res.newMessages);

          if (!processed.success) {
            console.error("[InboxListener] processInboxMessages lỗi:", processed.error);
          } else {
            console.log(`[InboxListener] processInboxMessages xong —`, processed.entries.map(e => `${e.candidateName}(isNew=${e.isNew} needsProfile=${e.needsProfile})`));
          }

          // Toast từng tin nhắn mới
          for (const msg of res.newMessages) {
            toast.info(msg.senderName, {
              description: msg.lastMessageText.slice(0, 150) || "(không có nội dung)",
              duration: 30_000,
            });
          }

          // Enqueue get_profile cho candidate chưa có profile (isNew hoặc thiếu extractedInfo)
          for (const entry of processed.entries) {
            if (!entry.needsProfile || !entry.profileUrl) continue;
            const enqueueResult = enqueueCdpRef.current({
              type: `get_profile:${entry.candidateId}`,
              label: `Lấy profile · ${entry.candidateName}`,
              fn: async () => {
                console.log(`[InboxListener] get_profile bắt đầu: ${entry.candidateName}`);
                await enrichCandidateLinkedInByProfileUrl(entry.profileUrl!);
                console.log(`[InboxListener] get_profile xong: ${entry.candidateName}`);
              },
              onError: (err) =>
                console.error(`[InboxListener] get_profile lỗi ${entry.candidateName}:`, err),
            });
            console.log(`[InboxListener] enqueue get_profile ${entry.candidateName} → ${enqueueResult}`);
          }
        },
        onError: (err) => {
          setInboxListenerError(err);
          toast.error(`LinkedIn Listener: ${err}`, { duration: 8_000 });
        },
      });

      if (result !== "queued") {
        console.log(`[InboxListener] interval bị bỏ qua — queue trả: ${result}`);
      }
    }

    doPoll();
    intervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.active]);

  return {
    ...state,
    toggle: () => setInboxListenerActive(!state.active),
  };
}
