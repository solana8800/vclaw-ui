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
            "text-[10px] uppercase px-1.5 py-0 h-4 font-bold tracking-tighter flex items-center gap-1",
            chatType === "group" 
              ? "border-indigo-200 text-indigo-700 bg-indigo-50/50" 
              : "border-emerald-200 text-emerald-700 bg-emerald-50/50"
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
          className="text-[10px] uppercase px-1.5 py-0 h-4 border-slate-200 text-slate-600 bg-slate-50 font-bold tracking-tighter flex items-center gap-1"
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
            "text-[9px] px-1.5 py-0 h-4 border-none font-medium flex items-center gap-1",
            origin === "AI Handler" || origin.includes("AI") 
              ? "bg-amber-100 text-amber-700" 
              : origin === "Webhook" 
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500"
          )}
        >
          {showIcon && (origin === "AI Handler" || origin.includes("AI") ? <Cpu className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />)}
          {origin}
        </Badge>
      )}
    </div>
  );
}
