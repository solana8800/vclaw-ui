import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getAdminPath } from "@/lib/admin-content";
import type { AppLocale } from "@/i18n/routing";

export type ThreadMessageRow = {
  id: string;
  direction: string;
  body: string;
  createdAt: string;
};

type Messages = {
  back: string;
  threadTitle: string;
  openclawHint: string;
};

export function ChannelThreadPanel({
  locale,
  conversationTitle,
  openclawSessionKey,
  messages,
  rows,
}: {
  locale: AppLocale;
  conversationTitle: string;
  openclawSessionKey: string | null;
  messages: Messages;
  rows: ThreadMessageRow[];
}) {
  const backHref = getAdminPath(locale, "/admin/inbox");

  return (
    <Card className="mt-6 border-[color:var(--line-strong)]">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[color:var(--brand)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {messages.back}
        </Link>
        <CardTitle className="text-base flex-1">{messages.threadTitle}: {conversationTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {openclawSessionKey ? (
          <p className="text-xs text-[color:var(--muted)]">
            {messages.openclawHint}: <code className="text-[color:var(--foreground-strong)]">{openclawSessionKey}</code>
          </p>
        ) : null}
        <ul className="space-y-3 max-h-[420px] overflow-y-auto">
          {rows.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                m.direction === "IN"
                  ? "border-[color:var(--line)] bg-[color:var(--surface-soft)] ml-0 mr-8"
                  : "border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)] ml-8 mr-0"
              }`}
            >
              <div className="text-[10px] uppercase text-[color:var(--muted)] mb-1">
                {m.direction} · {new Date(m.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
              </div>
              <div className="text-[color:var(--foreground-strong)] whitespace-pre-wrap">{m.body}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
