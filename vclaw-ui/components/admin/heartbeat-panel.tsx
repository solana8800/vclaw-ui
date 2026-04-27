"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Play, CheckCircle2, XCircle } from "lucide-react";
import { executeHeartbeatAction } from "@/lib/actions/automation-actions";

type HeartbeatPanelProps = {
  messages: {
    title: string;
    description: string;
    triggerBtn: string;
    triggerSuccess: string;
    triggerError: string;
    running: string;
  };
};

export function HeartbeatPanel({ messages }: HeartbeatPanelProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);
  
  // Track stats for the last run
  const [lastStats, setLastStats] = useState<{
    drafts: number;
    cross: number;
    friends: number;
    groups: number;
  } | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setStatus(null);
    setLastStats(null);
    try {
      const results = await executeHeartbeatAction();
      
      let drafts = 0;
      let cross = 0;
      let friends = 0;
      let groups = 0;

      results.forEach((res: any) => {
        if (res.ok) {
          if (res.type === "draft_followup") drafts++;
          if (res.type === "reengage") cross++;
          if (res.type === "spam_friend") friends++;
          if (res.type === "spam_group") groups++;
        }
      });

      setLastStats({ drafts, cross, friends, groups });
      
      const successMsg = messages.triggerSuccess
        .replace("{{draft}}", String(drafts))
        .replace("{{cross}}", String(cross))
        .replace("{{friend}}", String(friends))
        .replace("{{group}}", String(groups));

      setStatus({ msg: successMsg, type: "success" });
    } catch {
      setStatus({ msg: messages.triggerError, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-8 overflow-hidden border-brand/20 bg-gradient-to-br from-background to-brand/5">
      <CardHeader className="border-b bg-brand/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-brand">
              <Activity className="h-5 w-5 stroke-brand animate-pulse" />
              {messages.title}
              <Badge className="bg-red-500 hover:bg-red-600 text-[10px] uppercase tracking-wider animate-bounce">Tự Động</Badge>
            </CardTitle>
            <CardDescription>{messages.description}</CardDescription>
          </div>
          <div>
            <Button size="sm" onClick={handleTrigger} disabled={loading} className="bg-brand text-white hover:bg-brand/90">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {loading ? messages.running : messages.triggerBtn}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {status && (
        <CardContent className="p-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-all ${
            status.type === "success" ? "bg-green-50 text-green-700 border-green-200" :
            status.type === "error" ? "bg-red-50 text-red-700 border-red-200" :
            "bg-blue-50 text-blue-700 border-blue-200"
          }`}>
            {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <span>{status.msg}</span>
          </div>
          
          {lastStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Đơn Nháp</div>
                <div className="text-xl font-bold text-brand">{lastStats.drafts}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quảng Bá Chéo</div>
                <div className="text-xl font-bold text-brand">{lastStats.cross}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bạn Bè Nhận Tin</div>
                <div className="text-xl font-bold text-brand">{lastStats.friends}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Nhóm Được Spam</div>
                <div className="text-xl font-bold text-brand">{lastStats.groups}</div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
