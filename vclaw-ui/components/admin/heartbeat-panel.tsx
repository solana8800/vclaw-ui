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
    badgeAuto: string;
    statsDrafts: string;
    statsCross: string;
    statsFriends: string;
    statsGroups: string;
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
    <Card className="overflow-hidden border-[color:var(--brand-soft)] bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-soft)]">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-[color:var(--brand)]">
              <Activity className="h-5 w-5 shrink-0 animate-pulse" />
              <span>{messages.title}</span>
              <Badge className="bg-[color:var(--brand)] text-white shadow-[0_4px_12px_rgba(var(--brand-rgb),0.3)] border-none text-[10px] uppercase tracking-wider shrink-0 px-2 py-0.5">{messages.badgeAuto}</Badge>
            </CardTitle>
            <CardDescription className="text-[color:var(--muted)]">{messages.description}</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleTrigger}
            disabled={loading}
            className="shrink-0 bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand-strong)]"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {loading ? messages.running : messages.triggerBtn}
          </Button>
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
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{messages.statsDrafts}</div>
                <div className="text-xl font-bold text-brand">{lastStats.drafts}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{messages.statsCross}</div>
                <div className="text-xl font-bold text-brand">{lastStats.cross}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{messages.statsFriends}</div>
                <div className="text-xl font-bold text-brand">{lastStats.friends}</div>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{messages.statsGroups}</div>
                <div className="text-xl font-bold text-brand">{lastStats.groups}</div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>

  );
}
