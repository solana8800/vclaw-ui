"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import { MessageSquare, Users, User, Zap, Globe, Cpu } from "lucide-react";

type ChannelBadgeProps = {
  chatType?: "group" | "direct";
  sourceLabel?: string;
  origin?: string;
  className?: string;
  showIcon?: boolean;
};

export function ChannelBadge({ 
  chatType, 
  sourceLabel, 
  origin, 
  className,
  showIcon = true 
}: ChannelBadgeProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Badge Loại hội thoại: Nhóm / Cá nhân */}
      {chatType && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] uppercase px-2 py-0 h-4.5 font-bold tracking-tight flex items-center gap-1 border-none text-white",
            chatType === "group" 
              ? "bg-indigo-600 shadow-sm" 
              : "bg-emerald-600 shadow-sm"
          )}
        >
          {showIcon && (chatType === "group" ? <Users className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />)}
          {chatType === "group" ? "Nhóm" : "Cá nhân"}
        </Badge>
      )}

      {/* Badge Kênh: Zalo, Telegram, OpenAI... */}
      {sourceLabel && (
        <Badge 
          variant="outline" 
          className="text-[10px] uppercase px-2 py-0 h-4.5 bg-[color:var(--brand)] text-white border-none font-bold tracking-tight flex items-center gap-1 shadow-sm"
        >
          {showIcon && <Globe className="h-2.5 w-2.5" />}
          {sourceLabel}
        </Badge>
      )}

      {/* Badge Nguồn gốc: Webhook, AI, Gateway... */}
      {origin && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[9px] px-2 py-0 h-4.5 border-none font-bold text-white flex items-center gap-1 shadow-sm",
            origin === "AI Handler" || origin.includes("AI") 
              ? "bg-amber-600" 
              : origin === "Webhook" 
                ? "bg-blue-600"
                : "bg-slate-600"
          )}
        >
          {showIcon && (origin === "AI Handler" || origin.includes("AI") ? <Cpu className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />)}
          {origin}
        </Badge>
      )}
    </div>
  );
}
