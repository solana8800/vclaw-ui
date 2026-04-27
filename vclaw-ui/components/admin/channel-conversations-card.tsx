import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
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

  const providers = [
    { label: "Tất cả", value: "" },
    { label: "Zalo", value: "zalouser" },
    { label: "Messenger", value: "messenger" },
  ];

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-[color:var(--brand)]" />
              {messages.title}
            </CardTitle>
            <p className="text-sm text-[color:var(--muted)]">{messages.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <Link
                key={p.value}
                href={p.value ? `${base}?provider=${p.value}` : base}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-colors",
                  "hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand)]",
                  // Chỗ này nếu có useSearchParams thì check active được, nhưng để đơn giản ta dùng URL
                  "border-[color:var(--line)] text-[color:var(--muted)]"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)] py-6 text-center">{messages.empty}</p>
        ) : (
          <ul className="divide-y divide-[color:var(--line)]">
            {rows.map((r) => (
              <li key={r.id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[color:var(--foreground-strong)] truncate">
                      {r.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase px-1 py-0 h-4 border-[color:var(--brand-soft)] text-[color:var(--brand)]">
                      {r.provider === "zalouser" ? "Zalo" : r.provider}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-0.5">
                    ID: {r.externalThreadId} · {new Date(r.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </div>
                  {r.lastSnippet ? (
                    <p className="text-xs text-[color:var(--foreground)] mt-2 line-clamp-2 bg-[color:var(--surface)] p-2 rounded border border-[color:var(--line-soft)]">
                      {r.lastSnippet}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`${base}?thread=${encodeURIComponent(r.id)}`}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-[color:var(--brand)] rounded-md hover:opacity-90 transition-opacity shrink-0"
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
