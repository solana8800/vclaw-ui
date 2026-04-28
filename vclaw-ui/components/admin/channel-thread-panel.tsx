"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getAdminPath } from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";
import { sendChannelMessage } from "@/lib/zalouser/zalouser-cli-actions";
import { cn } from "@/lib/shared";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const backHref = getAdminPath(locale, "/admin/inbox");

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || !openclawSessionKey) return;

    startTransition(async () => {
      // Extract provider and target from session key: agent:main:PROVIDER:TARGET
      const parts = openclawSessionKey.split(":");
      const provider = parts[2] || "zalouser";
      const target = parts[parts.length - 1];

      const res = await sendChannelMessage(target, msg, provider);
      if (res.success) {
        setText("");
        router.refresh(); // Refresh to see the new message in the list
      }
    });
  };

  return (
    <Card className="mt-6 border-[color:var(--line-strong)] bg-[color:var(--surface-strong)]/80 backdrop-blur-md shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[color:var(--brand)] to-sky-500" />
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-[color:var(--line-soft)]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[color:var(--brand)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {messages.back}
        </Link>
        <CardTitle className="text-base flex-1 truncate">{messages.threadTitle}: {conversationTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {openclawSessionKey ? (
          <p className="text-[10px] text-[color:var(--muted)] flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[color:var(--surface)] border border-[color:var(--line)] font-mono uppercase">
              {openclawSessionKey.split(":")[2]}
            </span>
            <code className="text-[color:var(--foreground-strong)]">{openclawSessionKey}</code>
          </p>
        ) : null}
        <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[color:var(--line)]">
          {rows.map((m) => (
            <li
              key={m.id}
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-1",
                m.direction === "IN"
                  ? "bg-[color:var(--surface-soft)] border border-[color:var(--line)] mr-12 text-[color:var(--foreground-strong)]"
                  : "bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-strong)] text-white ml-12 border-none shadow-[0_4px_12px_rgba(var(--brand-rgb),0.2)]"
              )}
            >
              <div className={cn(
                "text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70",
                m.direction === "IN" ? "text-[color:var(--muted)]" : "text-white/80"
              )}>
                {m.direction} · {new Date(m.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t border-[color:var(--line-soft)] bg-[color:var(--surface-soft)]/50 p-4">
        <div className="flex w-full items-center gap-2">
          <Input
            placeholder="Nhập nội dung phản hồi..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={isPending || !openclawSessionKey}
            className="flex-1 bg-[color:var(--surface)] border-[color:var(--line)] focus-visible:ring-[color:var(--brand)]"
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={isPending || !text.trim() || !openclawSessionKey}
            className="rounded-full bg-[color:var(--brand)] hover:opacity-90 shadow-lg shadow-[color:var(--brand-soft)]/50"
          >
            <Send className={cn("h-4 w-4", isPending && "animate-pulse")} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
