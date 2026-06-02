"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/notifications/toast";
import { getUiUpdateNotification } from "@/lib/release/ui-update-notifications";
import type { UiUpdateStatus } from "@/lib/release/ui-update-status";

const SEEN_EVENTS_KEY = "vclaw:ui-update-events";

function readSeenEvents(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_EVENTS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveSeenEvents(events: Set<string>) {
  localStorage.setItem(
    SEEN_EVENTS_KEY,
    JSON.stringify([...events].slice(-100)),
  );
}

export function UiUpdateToastListener() {
  const t = useTranslations("common.notifications.uiUpdate");

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/vclaw/ui-update-status", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const status = (await response.json()) as UiUpdateStatus;
        const seen = readSeenEvents();
        for (const event of status.events ?? []) {
          if (seen.has(event.id)) continue;
          seen.add(event.id);
          const notification = getUiUpdateNotification(event.phase);
          if (!notification) continue;
          toast[notification.type](
            t(notification.messageKey, { version: event.uiVersion }),
            event.phase === "failed"
              ? { description: t("failedDescription") }
              : undefined,
          );
        }
        saveSeenEvents(seen);
      } catch {
        // App vẫn hoạt động bình thường nếu launcher chưa tạo file trạng thái.
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [t]);

  return null;
}
