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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Search, Send, MessageSquare, Users, User } from "lucide-react";
import { getStalledCandidates, runMarketingCampaign } from "@/lib/actions/automation-actions";
import { cn } from "@/lib/shared";
import { ChannelBadge } from "./channel-badge";

type Candidate = {
  id: string;
  customerName: string;
  lastMessage: string;
  updatedAt: Date;
  provider: string;
  chatType?: "group" | "direct";
  sourceLabel?: string;
  origin?: string;
};

type MarketingCampaignManagerProps = {
  messages: {
    title: string;
    description: string;
    scanButton: string;
    reengageAllButton: string;
    statusStalled: string;
    hoursAgo: string;
    lastMessage: string;
    reengageSuccess: string;
    reengageError: string;
    candidateListTitle: string;
    emptyCandidates: string;
    reengageSingle: string;
    generating: string;
    sent: string;
    badgePriority: string;
    interval: string;
  };
};

export function MarketingCampaignManager({ messages }: MarketingCampaignManagerProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reengaging, setReengaging] = useState<Record<string, boolean>>({});
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  async function handleScan() {
    setLoading(true);
    setStatus(null);
    try {
      const data = await getStalledCandidates(4);
      setCandidates(data);
      if (data.length === 0) {
        setStatus({ msg: messages.emptyCandidates, type: "info" });
      }
    } catch {
      setStatus({ msg: messages.reengageError, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReengageAll() {
    const ids = candidates.filter(c => !sentIds.has(c.id)).map(c => c.id);
    if (ids.length === 0) return;

    setLoading(true);
    setStatus(null);
    try {
      const results = await runMarketingCampaign(ids);
      const successCount = results.filter(r => r.ok).length;
      setStatus({ 
        msg: messages.reengageSuccess.replace("{{count}}", String(successCount)), 
        type: "success" 
      });
      setSentIds(prev => new Set([...prev, ...ids]));
    } catch {
      setStatus({ msg: messages.reengageError, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReengageSingle(id: string) {
    setReengaging(prev => ({ ...prev, [id]: true }));
    setStatus(null);
    try {
      const results = await runMarketingCampaign([id]);
      if (results[0]?.ok) {
        setStatus({ 
          msg: messages.reengageSuccess.replace("{{count}}", "1"), 
          type: "success" 
        });
        setSentIds(prev => new Set([...prev, id]));
      } else {
        setStatus({ msg: messages.reengageError, type: "error" });
      }
    } catch {
      setStatus({ msg: messages.reengageError, type: "error" });
    } finally {
      setReengaging(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <Card className="overflow-hidden border-[color:var(--line)] bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-soft)]">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Zap className="h-5 w-5 shrink-0 fill-current" />
              <span>{messages.title}</span>
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)] border-none text-[10px] uppercase tracking-wider shrink-0 px-2 py-0.5">{messages.badgePriority}</Badge>
            </CardTitle>
            <CardDescription className="text-[color:var(--muted)]">
              {messages.description} • {messages.interval}
            </CardDescription>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleScan} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {messages.scanButton}
            </Button>
            <Button size="sm" onClick={handleReengageAll} disabled={loading || candidates.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              {messages.reengageAllButton}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {status && (
          <div className={`px-4 py-2 text-sm border-b transition-all ${
            status.type === "success" ? "bg-green-50 text-green-700 border-green-100" :
            status.type === "error" ? "bg-red-50 text-red-700 border-red-100" :
            "bg-blue-50 text-blue-700 border-blue-100"
          }`}>
            {status.msg}
          </div>
        )}
        {candidates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{messages.candidateListTitle}</TableHead>
                <TableHead className="w-[200px]">{messages.statusStalled}</TableHead>
                <TableHead className="text-right">{messages.reengageSingle}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => {
                const isSent = sentIds.has(c.id);
                const isBusy = reengaging[c.id];
                const hours = Math.floor((new Date().getTime() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60));

                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{c.customerName}</div>
                        <ChannelBadge 
                          chatType={c.chatType}
                          sourceLabel={c.sourceLabel}
                          origin={c.origin}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {messages.lastMessage.replace("{{msg}}", c.lastMessage || "...")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {messages.hoursAgo.replace("{{hours}}", String(hours))}
                      </Badge>
                      <span className="ml-2 text-[10px] uppercase text-muted-foreground">{c.sourceLabel || c.provider}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isSent ? "ghost" : "outline"}
                        disabled={isSent || isBusy}
                        onClick={() => handleReengageSingle(c.id)}
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {messages.generating}
                          </>
                        ) : isSent ? (
                          messages.sent
                        ) : (
                          messages.reengageSingle
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground italic">
            {messages.emptyCandidates}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
