"use client";

import React, { useState } from "react";
import { 
  Briefcase, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  ExternalLink,
  RefreshCw,
  Mail,
  Calendar,
  Loader2,
  SearchCode
} from "lucide-react";
import { syncLinkedInCandidates, searchLinkedInCandidates } from "@/lib/recruitment/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminHhContent } from "@/lib/admin/content";

const LinkedInIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type Candidate = {
  id: string;
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
  status: string;
  updatedAt: string | Date;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;
  labels?: string[] | null;
  nextAction?: string | null;
  currentCompany?: string | null;
  expectedSalary?: string | null;
  aiAnalysisSummary?: string | null;
};

type JobPosition = {
  id: string;
  title: string;
  status: string;
  _count: { candidates: number };
};


type CandidateManagerProps = {
  locale: string;
  messages: AdminHhContent;
  initialJobs: JobPosition[];
  initialCandidates: Candidate[];
  totalPages: number;
  currentPage: number;
  selectedJobId?: string;
};

export function CandidateManager({
  locale,
  messages,
  initialJobs,
  initialCandidates,
  totalPages,
  currentPage,
  selectedJobId,
}: CandidateManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncLinkedInCandidates();
    setIsSyncing(false);

    if (result.success) {
      toast.success(messages.candidates.syncSuccess.replace("{count}", String(result.count)));
    } else {
      toast.error(result.error || messages.candidates.syncError);
    }
  };

  const [isSearching, setIsSearching] = useState(false);
  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsSearching(true);
    const result = await searchLinkedInCandidates(searchTerm, selectedJobId);
    setIsSearching(false);

    if (result.success) {
      const count = result.results?.length ?? 0;
      toast.success(messages.candidates.aiSearchSuccess.replace("{count}", String(count)));
      router.refresh();
    } else {
      toast.error(result.error || messages.candidates.aiSearchError);
    }
  };
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");

  const handleJobSelect = (jobId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (jobId) {
      params.set("job", jobId);
    } else {
      params.delete("job");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      POTENTIAL: { label: messages.candidates.statusPotential, color: "bg-slate-100 text-slate-700" },
      CONTACTED: { label: messages.candidates.statusContacted, color: "bg-blue-100 text-blue-700" },
      INTERESTED: { label: messages.candidates.statusInterested, color: "bg-emerald-100 text-emerald-700" },
      SCREENING: { label: messages.candidates.statusScreening, color: "bg-purple-100 text-purple-700" },
      HIRED: { label: messages.candidates.statusHired, color: "bg-green-100 text-green-700" },
      REJECTED: { label: messages.candidates.statusRejected, color: "bg-red-100 text-red-700" },
    };

    const config = statusMap[status] || statusMap.POTENTIAL;
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        {config.label}
      </span>
    );
  };

  const getSentimentBadge = (sentiment?: string | null) => {
    switch (sentiment) {
      case "POSITIVE":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{messages.smartInbox.sentimentPositive}</Badge>;
      case "NEGATIVE":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">{messages.smartInbox.sentimentNegative}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">{messages.smartInbox.sentimentNeutral}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Sidebar: Job Positions */}
      <div className="md:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)]">
            {messages.jobPositions.title}
          </h3>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => handleJobSelect(null)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
              !selectedJobId ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium" : "hover:bg-[color:var(--surface-soft)]"
            )}
          >
            {messages.candidates.allCandidates}
          </button>
          
          {initialJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => handleJobSelect(job.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all group relative",
                selectedJobId === job.id ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium" : "hover:bg-[color:var(--surface-soft)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-4">{job.title}</span>
                <span className="text-[10px] bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground-muted)]">
                  {job._count.candidates}
                </span>
              </div>
            </button>
          ))}
          
          {initialJobs.length === 0 && (
            <p className="text-xs text-[color:var(--foreground-muted)] italic px-3 py-2">
              {messages.jobPositions.empty}
            </p>
          )}
        </div>
      </div>

      {/* Main Content: Candidate Table */}
      <div className="md:col-span-9 space-y-6">
        {/* Next Actions Widget (Linxa Integration Mockup) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-emerald-100 bg-emerald-50/30 overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                <LinkedInIcon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-900">{messages.smartInbox.nextActionTitle}</p>
                <p className="text-xs text-emerald-700/80">{messages.smartInbox.nextActionAlert.replace("{count}", "3")}</p>
                <Button variant="ghost" className="p-0 h-auto text-xs text-emerald-600 font-bold hover:bg-transparent">{messages.smartInbox.viewDetail} &rarr;</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-blue-100 bg-blue-50/30 overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">{messages.smartInbox.syncAuto}</p>
                <p className="text-xs text-blue-700/80">{messages.smartInbox.syncAutoDesc.replace("{count}", "12")}</p>
                <Button 
                  variant="ghost" 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="p-0 h-auto text-xs text-blue-600 font-bold hover:bg-transparent"
                >
                  {isSyncing ? messages.candidates.refreshing : messages.candidates.refreshList}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-[color:var(--surface)]">
          <CardHeader className="pb-3 border-b border-[color:var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
                {selectedJobId ? initialJobs.find(j => j.id === selectedJobId)?.title : messages.candidates.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="bg-[#0a66c2] hover:bg-[#004182] text-white"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LinkedInIcon className="h-4 w-4 mr-2" />
                  )}
                  {messages.linkedin.searchCta}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {messages.linkedin.syncCta}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--foreground-muted)]" />
                <Input 
                  placeholder={messages.candidates.searchPlaceholder}
                  className="pl-9 bg-[color:var(--surface-soft)] border-none focus-visible:ring-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
              <Table>
                <TableHeader className="bg-[color:var(--surface-soft)]">
                  <TableRow>
                    <TableHead className="w-[280px]">{messages.candidates.table.candidate}</TableHead>
                    <TableHead>{messages.candidates.table.sentiment}</TableHead>
                    <TableHead>{messages.candidates.table.status}</TableHead>
                    <TableHead>{messages.candidates.table.updated}</TableHead>
                    <TableHead className="text-right">{messages.candidates.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialCandidates.length > 0 ? (
                    initialCandidates.map((candidate) => (
                      <TableRow key={candidate.id} className="hover:bg-[color:var(--surface-soft)] transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm flex items-center gap-2">
                              {candidate.name}
                              {candidate.aiAnalysisSummary && (
                                <span title={candidate.aiAnalysisSummary} className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-100 text-[10px] text-purple-600">
                                  ✨
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-[color:var(--foreground-muted)] line-clamp-1">
                              {candidate.headline || messages.candidates.table.noHeadline}
                              {candidate.currentCompany && ` • ${candidate.currentCompany}`}
                            </span>
                            {candidate.labels && candidate.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.labels.map((label, idx) => (
                                  <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSentimentBadge(candidate.sentiment)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(candidate.status)}
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--foreground-muted)]">
                          {new Date(candidate.updatedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" 
                              href={candidate.profileUrl || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-[color:var(--foreground-muted)]">
                        {messages.candidates.table.noResult}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
