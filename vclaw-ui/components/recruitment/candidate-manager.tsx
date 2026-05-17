"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Search, RefreshCw, Loader2, Send } from "lucide-react";
import {
  fetchLinxaConversationsForImport,
  saveOneLinxaConversation,
  searchLinkedInCandidates,
  suggestLinkedInSearchQuery,
} from "@/lib/recruitment/actions";
import {
  enrichCandidateLinkedInByProfileUrl,
  saveOneSearchCandidateBasic,
} from "@/lib/actions/recruitment/actions";
import { buildLinkedInSearchQueryFromJob } from "@/lib/recruitment/candidate-search-query";
import type { CandidateDetailSnapshot, LinkedInSearchHit } from "@/lib/recruitment/candidate-types";
import { isLinkedInProfileUrl, mapRowToDetailSnapshot } from "@/lib/recruitment/candidate-types";
import { mapLinxaConversationToCandidate } from "@/lib/recruitment/linxa-conversation-map";
import { parseLabelsJson } from "@/lib/recruitment/candidate-profile";
import { resolveCandidatePipelineDisplayKey } from "@/lib/recruitment/candidate-status";
import { syncCandidateStatusesFromMatchScores } from "@/lib/actions/recruitment/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminHhContent } from "@/lib/admin/content";
import { CandidateSearchPreviewModal } from "@/components/recruitment/candidate-search-preview-modal";
import { CandidateDetailSheet } from "@/components/recruitment/candidate-detail-sheet";
import {
  HelpTooltipIcon,
  RecruitmentSectionTooltipProvider,
} from "@/components/recruitment/section-header-with-help";
import { resolveCandidateDisplayMatchScore } from "@/lib/recruitment/candidate-jd-evaluation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import type { AppLocale } from "@/i18n/routing";

const LINKEDIN_QUERY_CACHE_PREFIX = "vclaw:linkedin-query:";

function readCachedLinkedInQuery(jobId: string): { query: string; source: "ai" | "fallback" } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${LINKEDIN_QUERY_CACHE_PREFIX}${jobId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { query?: string; source?: string };
    if (!parsed.query?.trim()) return null;
    return {
      query: parsed.query.trim(),
      source: parsed.source === "ai" ? "ai" : "fallback",
    };
  } catch {
    return null;
  }
}

function writeCachedLinkedInQuery(
  jobId: string,
  query: string,
  source: "ai" | "fallback",
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      `${LINKEDIN_QUERY_CACHE_PREFIX}${jobId}`,
      JSON.stringify({ query: query.trim(), source }),
    );
  } catch {
    /* bỏ qua quota */
  }
}

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

type Candidate = {
  id: string;
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
  status: string;
  updatedAt: string | Date;
  sentiment?: string | null;
  labels?: string | null;
  matchScore?: number | null;
  matchSummary?: string | null;
  linkedinConnectionStatus?: string | null;
  currentCompany?: string | null;
  location?: string | null;
  source?: string | null;
  extractedInfo?: string | null;
  linxaChatId?: string | null;
  jobPositionId?: string | null;
  jobPosition?: { id: string; title: string } | null;
  aiAnalysisSummary?: string | null;
  chatInfo?: string | null;
  conversationHistory?: string | null;
};

type JobPosition = {
  id: string;
  title: string;
  status: string;
  requirements?: string | null;
  description?: string | null;
  workMode?: string | null;
  contractType?: string | null;
  _count: { candidates: number };
};

type CandidateManagerProps = {
  locale: AppLocale;
  messages: AdminHhContent;
  initialJobs: JobPosition[];
  initialCandidates: Candidate[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  selectedJobId?: string;
};

export function CandidateManager({
  locale,
  messages,
  initialJobs,
  initialCandidates,
  total,
  totalPages,
  currentPage,
  pageSize,
  selectedJobId,
}: CandidateManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [linxaImportProgress, setLinxaImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [linkedInQuery, setLinkedInQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewResults, setPreviewResults] = useState<LinkedInSearchHit[]>([]);
  const [detailCandidateId, setDetailCandidateId] = useState<string | null>(null);
  const [detailInitial, setDetailInitial] = useState<CandidateDetailSnapshot | null>(null);
  const [detailOpenCompose, setDetailOpenCompose] = useState(false);
  const [suggestingQuery, setSuggestingQuery] = useState(false);

  const selectedJob = useMemo(
    () => initialJobs.find((j) => j.id === selectedJobId),
    [initialJobs, selectedJobId],
  );

  const workspaceLang = locale === "vi" ? "vi" : "en";
  const c = messages.candidates;

  const totalSavedCount = useMemo(
    () => initialJobs.reduce((sum, j) => sum + j._count.candidates, 0),
    [initialJobs],
  );

  const filteredCandidates = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return initialCandidates;
    return initialCandidates.filter((row) => {
      const hay = `${row.name} ${row.headline ?? ""} ${row.currentCompany ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initialCandidates, tableFilter]);

  const scopeCount = selectedJobId ? total : totalSavedCount;
  const scopeBanner = selectedJobId
    ? c.scopeJob.replace("{title}", selectedJob?.title ?? "").replace("{count}", String(scopeCount))
    : c.scopeAll.replace("{count}", String(scopeCount));

  const paginationBaseUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedJobId) params.set("job", selectedJobId);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, selectedJobId]);

  const pagingFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pagingTo = Math.min(currentPage * pageSize, total);
  const pagingRangeLabel = c.tablePagingRange
    .replace("{from}", String(pagingFrom))
    .replace("{to}", String(pagingTo))
    .replace("{total}", String(total));

  useEffect(() => {
    if (!selectedJobId) {
      setLinkedInQuery("");
      return;
    }

    const cached = readCachedLinkedInQuery(selectedJobId);
    if (cached) {
      setLinkedInQuery(cached.query);
      return;
    }

    if (selectedJob) {
      setLinkedInQuery(buildLinkedInSearchQueryFromJob(selectedJob, workspaceLang));
    } else {
      setLinkedInQuery("");
    }
  }, [selectedJobId, selectedJob, workspaceLang]);

  const handleRegenSearchQuery = async () => {
    if (!selectedJobId) return;
    setSuggestingQuery(true);
    const res = await suggestLinkedInSearchQuery(selectedJobId);
    if (res.success) {
      setLinkedInQuery(res.query);
      writeCachedLinkedInQuery(selectedJobId, res.query, res.source);
    } else if (selectedJob) {
      const fallback = buildLinkedInSearchQueryFromJob(selectedJob, workspaceLang);
      setLinkedInQuery(fallback);
      writeCachedLinkedInQuery(selectedJobId, fallback, "fallback");
      toast.error(res.error ?? c.jdQueryLoading);
    }
    setSuggestingQuery(false);
  };

  const handleSync = async () => {
    if (!selectedJobId) {
      toast.info(c.detail.linxaSelectJobHint);
    }
    setIsSyncing(true);
    const listed = await fetchLinxaConversationsForImport(50);
    if (!listed.success) {
      setIsSyncing(false);
      toast.error(listed.error || c.syncError);
      return;
    }

    const conversations = listed.conversations;
    if (conversations.length === 0) {
      setIsSyncing(false);
      toast.info(c.linxaImportEmpty);
      return;
    }

    setLinxaImportProgress({ done: 0, total: conversations.length });
    let saved = 0;
    let skipped = 0;

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i]!;
      const preview = mapLinxaConversationToCandidate(conv, selectedJobId);
      const displayName = preview?.name ?? c.importLinxaUnknownName;
      const result = await saveOneLinxaConversation(conv, selectedJobId, {
        enrichProfile: false,
      });
      if (result.success) {
        saved++;
        toast.success(c.importLinxaOneSuccess.replace("{name}", result.name));
        router.refresh();
      } else if (result.skipped) {
        skipped++;
        toast.info(
          `${displayName}: ${c.importLinxaOneSkipped.replace("{reason}", result.reason)}`,
        );
      } else {
        toast.error(
          c.importLinxaOneError
            .replace("{name}", displayName)
            .replace("{error}", result.error),
        );
      }
      setLinxaImportProgress({ done: i + 1, total: conversations.length });
    }

    setLinxaImportProgress(null);
    setIsSyncing(false);

    if (saved === 0) {
      toast.info(
        c.syncEmpty
          .replace("{fetched}", String(conversations.length))
          .replace("{skipped}", String(skipped)),
      );
    } else {
      toast.success(c.importLinxaDone.replace("{saved}", String(saved)).replace("{total}", String(conversations.length)));
    }
    router.refresh();
  };

  const saveSearchResults = async (selected: LinkedInSearchHit[]) => {
    if (selected.length === 0) return { saved: 0, enriched: 0 };

    setIsSaving(true);
    setSaveProgress({ done: 0, total: selected.length });

    const profileUrls: string[] = [];
    let saved = 0;

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i]!;
      const res = await saveOneSearchCandidateBasic(item, selectedJobId);
      if (res.success) {
        saved++;
        if (res.profileUrl) profileUrls.push(res.profileUrl);
      } else {
        toast.error(
          c.saveOneError.replace("{name}", res.name).replace("{error}", res.error ?? c.saveError),
        );
      }
      setSaveProgress({ done: i + 1, total: selected.length });
    }

    router.refresh();

    let enriched = 0;
    if (profileUrls.length > 0) {
      setSaveProgress({ done: 0, total: profileUrls.length });
      toast.info(c.enrichingProfiles.replace("{done}", "0").replace("{total}", String(profileUrls.length)));

      for (let i = 0; i < profileUrls.length; i++) {
        const url = profileUrls[i]!;
        const res = await enrichCandidateLinkedInByProfileUrl(url);
        if (res.success) {
          enriched++;
        } else {
          console.warn("[enrichCandidate]", url, res.error);
        }
        setSaveProgress({ done: i + 1, total: profileUrls.length });
      }
    }

    setIsSaving(false);
    setTimeout(() => setSaveProgress(null), 2000);
    router.refresh();
    return { saved, enriched };
  };

  const handleSearch = async () => {
    if (!selectedJobId) {
      toast.info(c.selectJobToSearch);
      return;
    }

    setIsSearching(true);
    const result = await searchLinkedInCandidates(
      selectedJobId,
      linkedInQuery.trim() || undefined,
    );
    setIsSearching(false);

    if (!result.success) {
      toast.error(result.error ?? messages.candidates.aiSearchError);
      return;
    }

    const results = result.results ?? [];
    const count = results.length;
    if (count === 0) {
      toast.info(messages.candidates.aiSearchEmpty);
      return;
    }

    setPreviewQuery(result.query ?? linkedInQuery);
    setPreviewResults(results);

    toast.info(c.savingSearchBasic.replace("{done}", "0").replace("{total}", String(count)));

    const { saved, enriched } = await saveSearchResults(results);

    if (saved === 0) {
      toast.error(c.saveError);
      setPreviewOpen(true);
      return;
    }

    if (saved < count) {
      toast.info(c.saveBatchPartial.replace("{saved}", String(saved)).replace("{total}", String(count)));
      setPreviewOpen(true);
      return;
    }

    if (enriched < saved) {
      toast.info(
        c.saveWithPartialEnrich
          .replace("{saved}", String(saved))
          .replace("{enriched}", String(enriched)),
      );
      return;
    }

    toast.success(c.saveAndEnrichDone.replace("{count}", String(saved)));
  };

  const handleSavePreview = (selected: LinkedInSearchHit[]) => {
    if (selected.length === 0) return;

    setPreviewOpen(false);
    void (async () => {
      const { saved, enriched } = await saveSearchResults(selected);
      if (saved === 0) {
        toast.error(c.saveError);
      } else if (saved < selected.length) {
        toast.info(
          c.saveBatchPartial.replace("{saved}", String(saved)).replace("{total}", String(selected.length)),
        );
      } else if (enriched < saved) {
        toast.info(
          c.saveWithPartialEnrich.replace("{saved}", String(saved)).replace("{enriched}", String(enriched)),
        );
      } else if (selected.length > 1) {
        toast.success(c.saveAndEnrichDone.replace("{count}", String(saved)));
      } else {
        toast.success(c.saveOneSuccess.replace("{name}", selected[0]!.name));
      }
    })();
  };

  const handleJobSelect = (jobId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (jobId) {
      params.set("job", jobId);
    } else {
      params.delete("job");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setLinkedInQuery("");
    setTableFilter("");
  };

  useEffect(() => {
    void syncCandidateStatusesFromMatchScores(selectedJobId).then((r) => {
      if (r.updated > 0) router.refresh();
    });
  }, [selectedJobId]);

  const getStatusBadge = (candidate: Candidate) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      UNSCORED: {
        label: messages.candidates.statusUnevaluated,
        color: "bg-slate-50 text-slate-600 border-slate-200 border-dashed",
      },
      POTENTIAL: { label: messages.candidates.statusPotential, color: "bg-slate-100 text-slate-700 border-slate-200" },
      CONTACTED: { label: messages.candidates.statusContacted, color: "bg-blue-100 text-blue-700 border-blue-200" },
      INTERESTED: { label: messages.candidates.statusInterested, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      SCREENING: { label: messages.candidates.statusScreening, color: "bg-purple-100 text-purple-700 border-purple-200" },
      HIRED: { label: messages.candidates.statusHired, color: "bg-green-100 text-green-700 border-green-200" },
      REJECTED: { label: messages.candidates.statusRejected, color: "bg-red-100 text-red-700 border-red-200" },
    };

    const displayStatus = resolveCandidatePipelineDisplayKey(
      candidate.status,
      candidate.matchScore,
      candidate.aiAnalysisSummary,
    );
    const config = statusMap[displayStatus] || statusMap.POTENTIAL;
    return (
      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none",
          config.color,
        )}
      >
        {config.label}
      </span>
    );
  };

  const getSourceBadge = (source?: string | null) => {
    if (source === "LINXA_INBOX") {
      return (
        <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[10px]">
          {c.table.sourceLinxa}
        </Badge>
      );
    }
    if (source === "LINKEDIN_SEARCH") {
      return (
        <Badge className="bg-[#0a66c2]/10 text-[#0a66c2] border-[#0a66c2]/30 text-[10px]">
          {c.table.sourceLinkedIn}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] text-[color:var(--foreground-muted)]">
        {c.table.sourceManual}
      </Badge>
    );
  };

  const getSentimentBadge = (candidate: Candidate) => {
    const { sentiment, source, conversationHistory, chatInfo } = candidate;
    if (!sentiment) {
      const hasChat =
        source === "LINXA_INBOX" &&
        Boolean(conversationHistory?.trim() || chatInfo?.trim());
      return (
        <span className="text-[11px] text-[color:var(--foreground-muted)]">
          {hasChat ? messages.candidates.sentimentPending : messages.candidates.sentimentNone}
        </span>
      );
    }
    switch (sentiment) {
      case "POSITIVE":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{messages.smartInbox.sentimentPositive}</Badge>;
      case "NEGATIVE":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">{messages.smartInbox.sentimentNegative}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">{messages.smartInbox.sentimentNeutral}</Badge>;
    }
  };

  const connLabels = messages.candidates.connection;

  const openDetail = (candidate: Candidate, opts?: { compose?: boolean }) => {
    setDetailInitial(mapRowToDetailSnapshot(candidate));
    setDetailCandidateId(candidate.id);
    setDetailOpenCompose(Boolean(opts?.compose && isLinkedInProfileUrl(candidate.profileUrl)));
  };

  const closeDetail = () => {
    setDetailCandidateId(null);
    setDetailInitial(null);
    setDetailOpenCompose(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-2 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] px-1">
          {c.sidebarScope}
        </h3>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleJobSelect(null)}
            className={cn(
              "w-full text-left px-2 py-2 rounded-lg text-sm transition-all border",
              !selectedJobId
                ? "bg-[color:var(--brand-soft)] border-[color:var(--brand)] text-[color:var(--brand-strong)] font-medium"
                : "border-transparent hover:bg-[color:var(--surface-soft)]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{c.allCandidates}</span>
              <span className="text-[10px] bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground-muted)]">
                {totalSavedCount}
              </span>
            </div>
            <p className="text-[10px] text-[color:var(--foreground-muted)] mt-0.5 font-normal">
              {c.allCandidatesHint}
            </p>
          </button>

          <p className="text-[10px] uppercase tracking-wide text-[color:var(--foreground-muted)] px-3 pt-2 pb-1">
            {messages.jobPositions.title}
          </p>

          {initialJobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => handleJobSelect(job.id)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all group relative",
                selectedJobId === job.id ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium" : "hover:bg-[color:var(--surface-soft)]",
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

      <div className="lg:col-span-10 space-y-3">
        {saveProgress && (
          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--brand)]/30 bg-[color:var(--brand-soft)]/50 px-3 py-2 text-sm text-[color:var(--brand-strong)]">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>
              {c.savingInBackground
                .replace("{done}", String(saveProgress.done))
                .replace("{total}", String(saveProgress.total))}
            </span>
          </div>
        )}

        {linxaImportProgress && (
          <div className="flex items-center gap-2 rounded-lg border border-violet-300/40 bg-violet-50/80 px-3 py-2 text-sm text-violet-900">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>
              {c.linxaImportProgress
                .replace("{done}", String(linxaImportProgress.done))
                .replace("{total}", String(linxaImportProgress.total))}
            </span>
          </div>
        )}

        <Card className="border-none shadow-sm bg-[color:var(--surface)]">
          <CardHeader className="pb-3 border-b border-[color:var(--line)]">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
              {selectedJobId ? selectedJob?.title : c.title}
            </CardTitle>
            <p className="text-xs text-[color:var(--foreground-muted)] font-normal mt-1">{scopeBanner}</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <RecruitmentSectionTooltipProvider>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    type="button"
                    className="bg-[#0a66c2] hover:bg-[#004182] text-white"
                    onClick={() => void handleSearch()}
                    disabled={isSearching || !selectedJobId}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LinkedInIcon className="h-4 w-4 mr-2" />
                    )}
                    {c.searchLinkedIn}
                  </Button>
                  <HelpTooltipIcon
                    help={c.sourcingSectionTooltip}
                    helpAriaLabel={c.sectionHelpAria}
                  />
                </div>
                {selectedJobId ? (
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--foreground-muted)]" />
                      <Input
                        placeholder={c.linkedInQueryPlaceholder}
                        className="pl-9 h-9 bg-[color:var(--surface)] border-[color:var(--line)]"
                        value={linkedInQuery}
                        onChange={(e) => setLinkedInQuery(e.target.value)}
                        disabled={suggestingQuery}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 px-2.5 text-xs"
                          disabled={suggestingQuery}
                          onClick={() => void handleRegenSearchQuery()}
                          aria-label={c.regenSearchQueryTooltip}
                        >
                          {suggestingQuery ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5 hidden sm:inline">{c.regenSearchQuery}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-left">
                        {c.regenSearchQueryTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <p className="text-xs text-[color:var(--foreground-muted)]">{c.selectJobToSearch}</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => void handleSync()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {c.importLinxa}
                  </Button>
                  <HelpTooltipIcon help={c.inboxSectionTooltip} helpAriaLabel={c.sectionHelpAria} />
                </div>
                {!selectedJobId ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    {c.detail.linxaSelectJobHint}
                  </p>
                ) : null}
              </div>
            </div>
            </RecruitmentSectionTooltipProvider>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--foreground-muted)]" />
              <Input
                placeholder={c.tableFilterPlaceholder}
                className="pl-9 bg-[color:var(--surface-soft)] border-none focus-visible:ring-1"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
              <Table>
                <TableHeader className="bg-[color:var(--surface-soft)]">
                  <TableRow>
                    <TableHead className="min-w-[220px]">{messages.candidates.table.candidate}</TableHead>
                    <TableHead className="w-[100px]">{messages.candidates.table.source}</TableHead>
                    <TableHead className="hidden xl:table-cell w-[120px]">{messages.candidates.table.location}</TableHead>
                    <TableHead>{messages.candidates.table.sentiment}</TableHead>
                    <TableHead className="w-[108px]">{messages.candidates.table.status}</TableHead>
                    <TableHead>{messages.candidates.table.updated}</TableHead>
                    <TableHead className="text-right">{messages.candidates.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => {
                      const labelList = parseLabelsJson(candidate.labels);
                      return (
                        <TableRow
                          key={candidate.id}
                          className="hover:bg-[color:var(--surface-soft)] transition-colors cursor-pointer"
                          onClick={() => openDetail(candidate)}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-sm flex items-center gap-2">
                                {candidate.name}
                                {(() => {
                                  const displayScore = resolveCandidateDisplayMatchScore(
                                    candidate.matchScore,
                                    candidate.aiAnalysisSummary,
                                  );
                                  return displayScore != null ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {displayScore}%
                                    </span>
                                  ) : null;
                                })()}
                              </span>
                              <span className="text-xs text-[color:var(--foreground-muted)] line-clamp-1">
                                {candidate.headline || messages.candidates.table.noHeadline}
                                {candidate.currentCompany && ` · ${candidate.currentCompany}`}
                              </span>
                              {candidate.linkedinConnectionStatus && (
                                <span className="text-[10px] text-[color:var(--foreground-muted)]">
                                  {connLabels[
                                    ({
                                      CONNECTED: "connected",
                                      PENDING: "pending",
                                      NOT_CONNECTED: "notConnected",
                                      UNKNOWN: "unknown",
                                    }[candidate.linkedinConnectionStatus] ?? "unknown") as keyof typeof connLabels
                                  ]}
                                </span>
                              )}
                              {labelList.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {labelList.map((label) => (
                                    <span
                                      key={label}
                                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getSourceBadge(candidate.source)}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-[color:var(--foreground-muted)]">
                            {candidate.location || "—"}
                          </TableCell>
                          <TableCell>{getSentimentBadge(candidate)}</TableCell>
                          <TableCell>{getStatusBadge(candidate)}</TableCell>
                          <TableCell className="text-xs text-[color:var(--foreground-muted)]">
                            {new Date(candidate.updatedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {isLinkedInProfileUrl(candidate.profileUrl) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                type="button"
                                title={messages.candidates.outreach.sendMessage}
                                onClick={() => openDetail(candidate, { compose: true })}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-[color:var(--foreground-muted)]">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-[color:var(--foreground-muted)]">
                        {messages.candidates.table.noResult}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[color:var(--line)] pt-3">
              <p className="text-xs text-[color:var(--foreground-muted)]">
                {pagingRangeLabel}
                {tableFilter.trim() ? (
                  <span className="block sm:inline sm:ml-2 text-[color:var(--foreground-muted)]">
                    {c.tableFilterPageHint}
                  </span>
                ) : null}
              </p>
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl={paginationBaseUrl}
                pageLabel={c.paginationPageLabel}
                className="py-0 px-0"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <CandidateSearchPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        query={previewQuery}
        results={previewResults}
        messages={messages}
        saving={isSaving}
        onSave={(rows) => void handleSavePreview(rows)}
      />

      <CandidateDetailSheet
        candidateId={detailCandidateId}
        initialSnapshot={detailInitial}
        initialOpenCompose={detailOpenCompose}
        selectedJobPositionId={selectedJobId}
        jobOptions={initialJobs.map((j) => ({ id: j.id, title: j.title }))}
        onClose={closeDetail}
        messages={messages}
        locale={locale}
        onUpdated={() => router.refresh()}
      />
    </div>
  );
}
