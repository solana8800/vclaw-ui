"use client";

import React from "react";
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Search,
  MessageSquare
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import Link from "next/link";

type HhOverviewProps = {
  messages: any;
  stats: {
    totalJobs: number;
    totalCandidates: number;
    newCandidates: number;
    contactedToday: number;
  };
  recentCandidates: any[];
};

export function HhOverview({ messages, stats, recentCandidates }: HhOverviewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-[color:var(--foreground-strong)]">
          {messages.title}
        </h2>
        <p className="text-[color:var(--muted)] text-lg">
          {messages.description}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: messages.stats.activeJobs, value: stats.totalJobs, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
          { label: messages.stats.totalCandidates, value: stats.totalCandidates, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: messages.stats.newCandidates, value: stats.newCandidates, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: messages.stats.contactedToday, value: stats.contactedToday, icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <Card key={i} className="border border-[color:var(--line)] bg-[color:var(--surface)] shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-[color:var(--foreground-strong)]">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-2xl", stat.bg, stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recruitment Workflow Card */}
        <Card className="lg:col-span-2 border border-[color:var(--line)] bg-[color:var(--surface-glass)] backdrop-blur shadow-sm overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-1 bg-[image:var(--brand-gradient)] opacity-80" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {messages.workflow.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {messages.workflow.steps.map((step: string, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] group-hover:border-[color:var(--brand-soft)] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-xs font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{step}</p>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Button href="/admin/recruitment/jobs" className="w-full sm:w-auto bg-[color:var(--brand-strong)] text-white gap-2 h-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                {messages.overview.manageJobs}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity / Quick Actions */}
        <div className="space-y-6">
          <Card className="border border-[color:var(--line)] bg-[color:var(--surface)] shadow-sm">
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg font-bold">{messages.overview.recentCandidates}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[color:var(--line)]">
                {recentCandidates.length > 0 ? (
                  recentCandidates.map((c, i) => (
                    <div key={i} className="p-4 hover:bg-[color:var(--surface-soft)] transition-colors flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-[color:var(--muted)] truncate">{c.headline || messages.candidates.table.noHeadline}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">{c.status}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[color:var(--muted)] text-sm italic">
                    {messages.overview.noActivity}
                  </div>
                )}
              </div>
            </CardContent>
            <CardContent className="pt-4 border-t border-[color:var(--line)]">
              <Button href="/admin/recruitment/candidates" variant="ghost" className="w-full text-xs gap-2">
                {messages.overview.viewAllCandidates}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
