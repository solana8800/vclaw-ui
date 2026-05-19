"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, CheckCheck, Trash2, CheckCircle, XCircle, Info, AlertTriangle, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  getNotifications,
  markAllSeen,
  clearAll,
  subscribe,
  EMPTY_NOTIFICATIONS,
} from "@/lib/notifications/store";
import type { NotificationItem, NotificationType } from "@/lib/notifications/store";
import { cn } from "@/lib/shared";

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  info: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  default: <MessageSquare className="h-4 w-4 text-[color:var(--muted)] shrink-0" />,
};

export function NotificationBell() {
  const t = useTranslations("common.notifications");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const notifications = useSyncExternalStore(
    subscribe,
    getNotifications,
    () => EMPTY_NOTIFICATIONS
  );
  const unseenCount = notifications.filter((n) => !n.seen).length;

  function formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return t("justNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("minutesAgo", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("hoursAgo", { count: h });
    return t("daysAgo", { count: Math.floor(h / 24) });
  }

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) markAllSeen();
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--muted)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] sm:h-9 sm:w-9",
          open && "border-[color:var(--brand)] bg-[color:var(--brand-softer)] text-[color:var(--foreground-strong)]"
        )}
        aria-label={t("ariaLabel")}
      >
        <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        {unseenCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unseenCount > 99 ? "99" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] shadow-[0_32px_70px_-20px_var(--shadow-color)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3">
            <span className="text-sm font-semibold text-[color:var(--foreground-strong)]">
              {t("title")}
            </span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => markAllSeen()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--muted)] transition hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]"
                  title={t("markAllSeenTitle")}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t("markAllSeen")}
                </button>
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
                  title={t("clearTitle")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("clear")}
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[min(480px,60vh)] overflow-y-auto vclaw-custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-[color:var(--muted)] opacity-40" />
                <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--line)]">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      !n.seen && "bg-[color:var(--brand-softer)]"
                    )}
                  >
                    <div className="mt-0.5">{TYPE_ICON[n.type]}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm leading-snug",
                        n.seen
                          ? "text-[color:var(--foreground)]"
                          : "font-medium text-[color:var(--foreground-strong)]"
                      )}>
                        {n.message}
                      </p>
                      {n.description && (
                        <p className="mt-0.5 text-xs text-[color:var(--muted)]">{n.description}</p>
                      )}
                      <p className="mt-1 text-[11px] text-[color:var(--muted)] opacity-70">
                        {formatTime(n.timestamp)}
                      </p>
                    </div>
                    {!n.seen && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
