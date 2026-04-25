import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminPath } from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";

export type ChannelConversationRow = {
  id: string;
  provider: string;
  title: string | null;
  externalThreadId: string;
  updatedAt: string;
  lastSnippet: string | null;
};

type Messages = {
  title: string;
  description: string;
  empty: string;
  viewThread: string;
};

export function ChannelConversationsCard({
  locale,
  rows,
  messages,
}: {
  locale: AppLocale;
  rows: ChannelConversationRow[];
  messages: Messages;
}) {
  const base = getAdminPath(locale, "/admin/inbox");

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-[color:var(--brand)]" />
          {messages.title}
        </CardTitle>
        <p className="text-sm text-[color:var(--muted)]">{messages.description}</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)] py-6 text-center">{messages.empty}</p>
        ) : (
          <ul className="divide-y divide-[color:var(--line)]">
            {rows.map((r) => (
              <li key={r.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-[color:var(--foreground-strong)] truncate">
                    {r.title ?? r.externalThreadId}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {r.provider} · {new Date(r.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </div>
                  {r.lastSnippet ? (
                    <p className="text-xs text-[color:var(--foreground)] mt-1 line-clamp-2">{r.lastSnippet}</p>
                  ) : null}
                </div>
                <Link
                  href={`${base}?thread=${encodeURIComponent(r.id)}`}
                  className="text-xs font-semibold text-[color:var(--brand)] shrink-0 hover:underline"
                >
                  {messages.viewThread}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
