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
import { generateAndSendLinkedInAutoReply } from "@/lib/recruitment/auto-reply";

const POLL_INTERVAL_MS = 60_000;
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000;
const CDP_TASK_TYPE = "listen_inbox_poll";
// Delay ngẫu nhiên trước khi gửi reply — tránh LinkedIn phát hiện pattern bot
const REPLY_DELAY_MIN_MS = 90_000;   // 1.5 phút
const REPLY_DELAY_MAX_MS = 240_000;  // 4 phút

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

          console.log(
            `[InboxListener] poll xong — ${res.newMessages.length} tin mới:`,
            res.newMessages.map((m) => m.senderName),
          );

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

          // Enqueue get_profile → auto_reply (chain) hoặc auto_reply trực tiếp
          for (const msg of res.newMessages) {
            const { candidateId, senderName, senderProfileUrl, needsProfile } = msg;
            if (!candidateId) continue;

            const enqueueAutoReply = () => {
              const delayMs =
                Math.floor(Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS)) +
                REPLY_DELAY_MIN_MS;
              const delaySec = Math.round(delayMs / 1000);
              console.log(`[InboxListener] auto_reply ${senderName} — chờ ${delaySec}s rồi gửi`);

              setTimeout(() => {
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
            };

            if (needsProfile && senderProfileUrl) {
              const r = enqueueCdpRef.current({
                type: `get_profile:${candidateId}`,
                label: `Lấy profile · ${senderName}`,
                fn: async () => {
                  console.log(`[InboxListener] get_profile bắt đầu: ${senderName}`);
                  await enrichCandidateLinkedInByProfileUrl(senderProfileUrl);
                  console.log(`[InboxListener] get_profile xong: ${senderName}`);
                },
                onSuccess: enqueueAutoReply,
                onError: (err) => {
                  console.error(`[InboxListener] get_profile lỗi ${senderName}:`, err);
                  // Profile không lấy được — vẫn thử auto_reply với thông tin hiện có
                  enqueueAutoReply();
                },
              });
              console.log(`[InboxListener] enqueue get_profile ${senderName} → ${r}`);
            } else {
              enqueueAutoReply();
            }
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
