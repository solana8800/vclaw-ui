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
import { generateAndSendLinkedInAutoReply } from "@/lib/recruitment/auto-reply";

const POLL_MIN_MS = 2 * 60_000;  // 2 phút
const POLL_MAX_MS = 4 * 60_000;  // 4 phút
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000;
const CDP_TASK_TYPE = "listen_inbox_poll";
// Delay ngẫu nhiên trước khi gửi reply — tránh LinkedIn phát hiện pattern bot
const REPLY_DELAY_MIN_MS = 30_000;   // 30 giây
const REPLY_DELAY_MAX_MS = 75_000;   // 75 giây, luôn ngắn hơn poll tối thiểu

export function useLinkedInInboxListener() {
  const state = useSyncExternalStore(
    subscribeInboxListener,
    getInboxListenerState,
    () => INBOX_LISTENER_SERVER_SNAPSHOT,
  );

  const { enqueue: enqueueCdp } = useCdpQueue();
  const lastSeenAtRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const enqueueCdpRef = useRef(enqueueCdp);
  enqueueCdpRef.current = enqueueCdp;

  useEffect(() => {
    if (!state.active) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      for (const timer of replyTimeoutsRef.current.values()) {
        clearTimeout(timer);
      }
      replyTimeoutsRef.current.clear();
      lastSeenAtRef.current = 0;
      return;
    }

    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * (POLL_MAX_MS - POLL_MIN_MS)) + POLL_MIN_MS;
      const delaySec = Math.round(delay / 1000);
      console.log(`[InboxListener] poll tiếp theo sau ${delaySec}s`);
      timeoutRef.current = setTimeout(() => {
        doPoll();
      }, delay);
    };

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

          console.log(
            `[InboxListener] poll xong — ${res.newMessages.length} người có tin mới:`,
            res.newMessages.map((m) => `${m.senderName} (${m.messageCount} tin)`),
          );

          for (const msg of res.newMessages) {
            if (msg.deliveredAt > lastSeenAtRef.current) {
              lastSeenAtRef.current = msg.deliveredAt;
            }
          }

          // Toast từng tin nhắn mới
          for (const msg of res.newMessages) {
            toast.info(msg.senderName, {
              description:
                msg.messageCount > 1
                  ? `Gom ${msg.messageCount} tin: ${msg.lastMessageText.slice(0, 120)}`
                  : msg.lastMessageText.slice(0, 150) || "(không có nội dung)",
              duration: 30_000,
            });
          }

          // auto_reply trực tiếp — không get_profile (tránh navigate profile gây detect)
          for (const msg of res.newMessages) {
            const { candidateId, senderName } = msg;
            if (!candidateId) {
              console.warn(
                `[InboxListener] bỏ qua auto_reply vì thiếu candidateId — sender="${senderName}" thread=${msg.threadId}`,
              );
              continue;
            }
            if (replyTimeoutsRef.current.has(candidateId)) {
              console.log(
                `[InboxListener] bỏ qua đặt lịch auto_reply trùng — ${senderName} (${candidateId})`,
              );
              continue;
            }

            const delayMs =
              Math.floor(Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS)) +
              REPLY_DELAY_MIN_MS;
            const delaySec = Math.round(delayMs / 1000);
            console.log(
              `[InboxListener] auto_reply ${senderName} — gom ${msg.messageCount} tin, chờ ${delaySec}s rồi gửi`,
            );

            const timer = setTimeout(() => {
              replyTimeoutsRef.current.delete(candidateId);
              const r = enqueueCdpRef.current({
                type: `auto_reply:${candidateId}`,
                label: `Soạn & gửi phản hồi · ${senderName}`,
                fn: async () => {
                  console.log(`[InboxListener] auto_reply bắt đầu: ${senderName}`);
                  const result = await generateAndSendLinkedInAutoReply(candidateId);
                  if (!result.success) throw new Error(result.error ?? "Lỗi không xác định");
                  console.log(
                    `[InboxListener] auto_reply xong: ${senderName} — "${result.reply?.slice(0, 80)}"`,
                  );
                  toast.success(`Đã trả lời ${senderName}`, {
                    description: result.reply?.slice(0, 120),
                    duration: 10_000,
                  });
                },
                onError: (err) => {
                  console.error(`[InboxListener] auto_reply lỗi ${senderName}:`, err);
                  toast.error(`Trả lời tự động thất bại · ${senderName}`, {
                    description: err,
                    duration: 8_000,
                  });
                },
              });
              console.log(`[InboxListener] enqueue auto_reply ${senderName} → ${r}`);
            }, delayMs);
            replyTimeoutsRef.current.set(candidateId, timer);
          }
        },
        onError: (err) => {
          setInboxListenerError(err);
          toast.error(`LinkedIn Listener: ${err}`, { duration: 8_000 });
        },
      });

      if (result !== "queued") {
        console.log(`[InboxListener] poll bị bỏ qua — queue trả: ${result}`);
      }
      scheduleNext();
    }

    doPoll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      for (const timer of replyTimeoutsRef.current.values()) {
        clearTimeout(timer);
      }
      replyTimeoutsRef.current.clear();
    };
  }, [state.active]);

  return {
    ...state,
    toggle: () => setInboxListenerActive(!state.active),
  };
}
