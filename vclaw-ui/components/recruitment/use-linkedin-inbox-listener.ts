"use client";

import { useSyncExternalStore, useEffect, useRef } from "react";
import { toast } from "sonner";
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

      enqueueCdpRef.current({
        type: CDP_TASK_TYPE,
        label: "Kiểm tra tin nhắn LinkedIn mới",
        fn: async () => {
          setInboxListenerPolling();
          const res = await listenLinkedInNewMessages(sinceMs);

          if (!res.success) {
            setInboxListenerError(res.error ?? "Lỗi không xác định");
            toast.error(`LinkedIn Listener: ${res.error ?? "Lỗi không xác định"}`, { duration: 8_000 });
            throw new Error(res.error ?? "Lỗi");
          }

          setInboxListenerOk(Date.now());

          // Sau lần đầu dù có hay không có tin nhắn mới, cập nhật lastSeenAt
          if (isFirstPoll) {
            lastSeenAtRef.current = Date.now();
          }

          if (res.newMessages.length === 0) return;

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
            enqueueCdpRef.current({
              type: `get_profile:${entry.candidateId}`,
              label: `Lấy profile · ${entry.candidateName}`,
              fn: async () => {
                await enrichCandidateLinkedInByProfileUrl(entry.profileUrl!);
              },
              onError: (err) =>
                console.error(`[InboxListener] get_profile ${entry.candidateName}:`, err),
            });
          }
        },
        onError: (err) => {
          setInboxListenerError(err);
          toast.error(`LinkedIn Listener: ${err}`, { duration: 8_000 });
        },
      });
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
