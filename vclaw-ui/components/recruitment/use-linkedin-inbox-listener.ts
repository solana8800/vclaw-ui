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
import { syncInboxAndGetNewMessages } from "@/lib/recruitment/actions";
import { enrichCandidateLinkedInByProfileUrl } from "@/lib/actions/recruitment/actions";

const POLL_INTERVAL_MS = 60_000;
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000;
const CDP_TASK_TYPE = "listen_inbox_poll";

export function useLinkedInInboxListener() {
  const state = useSyncExternalStore(
    subscribeInboxListener,
    getInboxListenerState,
    () => INBOX_LISTENER_SERVER_SNAPSHOT,
  );

  const { enqueue: enqueueCdp } = useCdpQueue();
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
          const res = await syncInboxAndGetNewMessages(sinceMs);

          if (!res.success) {
            console.error(`[InboxListener] syncInboxAndGetNewMessages lỗi:`, res.error);
            setInboxListenerError(res.error ?? "Lỗi không xác định");
            toast.error(`LinkedIn Listener: ${res.error ?? "Lỗi không xác định"}`, { duration: 8_000 });
            throw new Error(res.error ?? "Lỗi");
          }

          setInboxListenerOk(Date.now());

          if (isFirstPoll) {
            lastSeenAtRef.current = Date.now();
          }

          if (res.newMessages.length === 0) {
            console.log(`[InboxListener] poll xong — không có tin mới`);
            return;
          }

          console.log(`[InboxListener] poll xong — ${res.newMessages.length} tin mới:`, res.newMessages.map(m => m.senderName));

          for (const msg of res.newMessages) {
            if (msg.deliveredAt > lastSeenAtRef.current) {
              lastSeenAtRef.current = msg.deliveredAt;
            }
          }

          // Toast từng tin nhắn mới
          for (const msg of res.newMessages) {
            toast.info(msg.senderName, {
              description: msg.lastMessageText.slice(0, 150) || "(không có nội dung)",
              duration: 30_000,
            });
          }

          // Enqueue get_profile cho candidate chưa có profile
          for (const msg of res.newMessages) {
            if (!msg.needsProfile || !msg.senderProfileUrl) continue;
            const enqueueResult = enqueueCdpRef.current({
              type: `get_profile:${msg.candidateId}`,
              label: `Lấy profile · ${msg.senderName}`,
              fn: async () => {
                console.log(`[InboxListener] get_profile bắt đầu: ${msg.senderName}`);
                await enrichCandidateLinkedInByProfileUrl(msg.senderProfileUrl!);
                console.log(`[InboxListener] get_profile xong: ${msg.senderName}`);
              },
              onError: (err) =>
                console.error(`[InboxListener] get_profile lỗi ${msg.senderName}:`, err),
            });
            console.log(`[InboxListener] enqueue get_profile ${msg.senderName} → ${enqueueResult}`);
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
