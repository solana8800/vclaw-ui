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
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  headline?: string;
  profileUrl?: string;
  status: string;
  updatedAt: string;
};

type JobPosition = {
  id: string;
  title: string;
  status: string;
  _count: { candidates: number };
};

type RecruitmentMessages = {
  title: string;
  description: string;
  jobPositions: {
    title: string;
    add: string;
    empty: string;
  };
  candidates: {
    title: string;
    searchPlaceholder: string;
    statusPotential: string;
    statusContacted: string;
    statusInterested: string;
    statusScreening: string;
    statusHired: string;
    statusRejected: string;
  };
  linkedin: {
    searchCta: string;
    syncCta: string;
    analyzeProfile: string;
  };
};

type CandidateManagerProps = {
  locale: string;
  messages: RecruitmentMessages;
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
            Tất cả ứng viên
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
        <Card className="border-none shadow-sm bg-[color:var(--surface)]">
          <CardHeader className="pb-3 border-b border-[color:var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
                {selectedJobId ? initialJobs.find(j => j.id === selectedJobId)?.title : messages.candidates.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-[#0a66c2] hover:bg-[#004182] text-white">
                  <LinkedInIcon className="h-4 w-4 mr-2" />
                  {messages.linkedin.searchCta}
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
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
                    <TableHead className="w-[300px]">Ứng viên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialCandidates.length > 0 ? (
                    initialCandidates.map((candidate) => (
                      <TableRow key={candidate.id} className="hover:bg-[color:var(--surface-soft)] transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{candidate.name}</span>
                            <span className="text-xs text-[color:var(--foreground-muted)] line-clamp-1">
                              {candidate.headline || "Không có headline"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(candidate.status)}
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--foreground-muted)]">
                          {new Date(candidate.updatedAt).toLocaleDateString("vi-VN")}
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
                      <TableCell colSpan={4} className="h-32 text-center text-[color:var(--foreground-muted)]">
                        Không tìm thấy ứng viên nào.
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
