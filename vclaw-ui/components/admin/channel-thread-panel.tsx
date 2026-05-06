"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getAdminPath } from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";
import { sendChannelMessage } from "@/lib/zalouser/zalouser-cli-actions";
import { cn } from "@/lib/shared";
import { ChannelBadge } from "./channel-badge";

type ThreadMessageRow = {
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
  onClose,
  backHref,
}: {
  locale: AppLocale;
  conversationTitle: string;
  openclawSessionKey: string | null;
  messages: Messages;
  rows: ThreadMessageRow[];
  onClose?: () => void;
  backHref?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const defaultBackHref = backHref || getAdminPath(locale, "/admin/customers");

  const handleClose = () => {
    if (onClose) onClose();
    else router.push(defaultBackHref);
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-[color:var(--foreground)]/20 backdrop-blur-[2px]" 
        onClick={handleClose}
      />
      <Card className="relative w-full max-w-5xl max-h-[85vh] flex flex-col border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[color:var(--brand)] to-sky-500 z-10" />
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-[color:var(--line-soft)] shrink-0 bg-[color:var(--surface-soft)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--brand)] hover:text-[color:var(--brand-strong)] transition-colors p-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            {messages.back}
          </Button>
          <CardTitle className="text-base flex-1 truncate">{messages.threadTitle}: {conversationTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4 scrollbar-thin scrollbar-thumb-[color:var(--line)]">
        {openclawSessionKey ? (
          <div className="mb-2">
            <ChannelBadge 
              chatType={openclawSessionKey.includes("group:") ? "group" : "direct"}
              sourceLabel={openclawSessionKey.split(":")[2]?.toUpperCase() || "GATEWAY"}
              origin={
                openclawSessionKey.includes(":webhook:") ? "Webhook" :
                openclawSessionKey.includes(":vclaw:") ? "AI Handler" :
                openclawSessionKey.includes(":admin:") ? "Admin Dash" :
                openclawSessionKey.includes(":openai:") ? "OpenAI AI" : "Gateway"
              }
            />
            <code className="text-[10px] text-[color:var(--muted)] px-1.5 py-0.5 rounded bg-[color:var(--surface)] border border-[color:var(--line)] font-mono mt-2 block w-fit">
              {openclawSessionKey}
            </code>
          </div>
        ) : null}
        <ul className="space-y-3 pr-2">
          {rows.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex flex-col",
                m.direction === "IN" ? "items-start" : "items-end"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-1 w-fit max-w-[85%]",
                  m.direction === "IN"
                    ? "bg-[color:var(--surface-soft)] border border-[color:var(--line)] text-[color:var(--foreground-strong)]"
                    : "bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-strong)] text-white border-none shadow-[0_4px_12px_rgba(var(--brand-rgb),0.2)]"
                )}
              >
                <div className={cn(
                  "text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70",
                  m.direction === "IN" ? "text-[color:var(--muted)]" : "text-white/80"
                )}>
                  {m.direction} · {new Date(m.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
              </div>
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
    </div>
  );
}
