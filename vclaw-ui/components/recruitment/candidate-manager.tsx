"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Search,
  RefreshCw,
  Loader2,
  Sparkles,
  StickyNote,
  UserPlus,
} from "lucide-react";
import {
  candidateConnectionBadgeClass,
  candidateJdBadgeClass,
  candidateSourceBadgeClass,
  candidateStatusPill,
} from "@/lib/recruitment/candidate-badge-styles";
import { canScoreCandidateWithJd, resolveLinkedInProfileBadgeStatus } from "@/lib/recruitment/candidate-jd-eligibility";
import { hasJdEvaluation } from "@/lib/recruitment/candidate-status";
import {
  fetchLinxaConversationsForImport,
  saveOneLinxaConversation,
  searchLinkedInCandidates,
  suggestLinkedInSearchQuery,
} from "@/lib/recruitment/actions";
import { buildLinkedInSearchQueryFromJob } from "@/lib/recruitment/candidate-search-query";
import type { CandidateDetailSnapshot, LinkedInSearchHit } from "@/lib/recruitment/candidate-types";
import { isLinkedInProfileUrl, mapRowToDetailSnapshot } from "@/lib/recruitment/candidate-types";
import { mapLinxaConversationToCandidate } from "@/lib/recruitment/linxa-conversation-map";
import { parseLabelsJson } from "@/lib/recruitment/candidate-profile";
import { resolveCandidatePipelineDisplayKey } from "@/lib/recruitment/candidate-status";
import {
  addCandidateByLinkedInProfileUrl,
  syncCandidateStatusesFromMatchScores,
} from "@/lib/actions/recruitment/actions";
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
import { CandidateBulkAiEvaluateDialog } from "@/components/recruitment/candidate-bulk-ai-evaluate-dialog";
import { CandidateBulkLinkedInProfileDialog } from "@/components/recruitment/candidate-bulk-linkedin-profile-dialog";
import { CandidateProfileStatusBadges } from "@/components/recruitment/candidate-profile-status-badges";
import { CandidateBulkAssignJobDialog } from "@/components/recruitment/candidate-bulk-assign-job-dialog";
import { RecruitmentBackgroundTasksBanner } from "@/components/recruitment/recruitment-background-tasks-banner";
import { useRecruitmentBackgroundTasks } from "@/components/recruitment/use-recruitment-background-tasks";
import {
  HelpTooltipIcon,
  RecruitmentSectionTooltipProvider,
} from "@/components/recruitment/section-header-with-help";
import { resolveCandidateDisplayMatchScore } from "@/lib/recruitment/candidate-jd-evaluation";
import { resolveJobPositionCompanyLabel } from "@/lib/recruitment/job-position-company";
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
  recruiterNotes?: string | null;
  cvText?: string | null;
  cvFileUrl?: string | null;
  chatInfo?: string | null;
  conversationHistory?: string | null;
};

type JobPosition = {
  id: string;
  title: string;
  status: string;
  requirements?: string | null;
  description?: string | null;
  companyInfo?: string | null;
  companyUrl?: string | null;
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
  const { tasks: backgroundTasks, runBulkAiEvaluate, runBulkLinkedInProfiles, runSaveSearchAndEnrich } =
    useRecruitmentBackgroundTasks(messages);
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
  const [bulkAiOpen, setBulkAiOpen] = useState(false);
  const [bulkAiScopeIds, setBulkAiScopeIds] = useState<string[] | null>(null);
  const [bulkLinkedInOpen, setBulkLinkedInOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedForAssign, setSelectedForAssign] = useState<Set<string>>(new Set());
  const [suggestingQuery, setSuggestingQuery] = useState(false);
  const [linkedInUrlInput, setLinkedInUrlInput] = useState("");
  const [addingByLinkedInUrl, setAddingByLinkedInUrl] = useState(false);

  const selectedJob = useMemo(
    () => initialJobs.find((j) => j.id === selectedJobId),
    [initialJobs, selectedJobId],
  );

  const selectedJobCompany = useMemo(
    () => (selectedJob ? resolveJobPositionCompanyLabel(selectedJob) : null),
    [selectedJob],
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

  const openBulkAiEvaluate = (scopeIds: string[] | null = null) => {
    if (!selectedJobId) {
      toast.info(c.selectJobToSearch);
      return;
    }
    setBulkAiScopeIds(scopeIds);
    setBulkAiOpen(true);
  };

  const isBackgroundSaving = useMemo(
    () =>
      backgroundTasks.some(
        (t) =>
          (t.kind === "linkedin_save" || t.kind === "cdp_enrich") && t.status === "running",
      ),
    [backgroundTasks],
  );

  const bulkAiCandidates = useMemo(() => {
    const scoped = selectedJobId
      ? initialCandidates.filter((row) => row.jobPositionId === selectedJobId || !row.jobPositionId)
      : initialCandidates;
    if (bulkAiScopeIds?.length) {
      const idSet = new Set(bulkAiScopeIds);
      return scoped.filter((row) => idSet.has(row.id));
    }
    return scoped;
  }, [initialCandidates, selectedJobId, bulkAiScopeIds]);

  const unscoredEligibleCount = useMemo(
    () =>
      bulkAiCandidates.filter(
        (row) =>
          !hasJdEvaluation(row.aiAnalysisSummary) &&
          canScoreCandidateWithJd({
            extractedInfo: row.extractedInfo,
            cvText: row.cvText,
            cvFileUrl: row.cvFileUrl,
            profileUrl: row.profileUrl,
          }),
      ).length,
    [bulkAiCandidates],
  );

  const bulkLinkedInCandidates = useMemo(() => {
    const scoped = selectedJobId
      ? initialCandidates.filter((row) => row.jobPositionId === selectedJobId || !row.jobPositionId)
      : initialCandidates;
    return scoped;
  }, [initialCandidates, selectedJobId]);

  const needsLinkedInScrapeCount = useMemo(
    () =>
      bulkLinkedInCandidates.filter((row) => {
        if (!isLinkedInProfileUrl(row.profileUrl)) return false;
        return resolveLinkedInProfileBadgeStatus(row.profileUrl, row.extractedInfo) !== "scraped";
      }).length,
    [bulkLinkedInCandidates],
  );

  const handleAddByLinkedInUrl = async () => {
    if (!selectedJobId) {
      toast.info(c.selectJobToSearch);
      return;
    }
    const url = linkedInUrlInput.trim();
    if (!url) {
      toast.info(c.linkedInUrlRequired);
      return;
    }

    setAddingByLinkedInUrl(true);
    const res = await addCandidateByLinkedInProfileUrl(url, selectedJobId);
    setAddingByLinkedInUrl(false);

    if (!res.success) {
      toast.error(res.error ?? c.linkedInUrlAddError);
      return;
    }

    setLinkedInUrlInput("");
    toast.success(
      res.updated
        ? c.linkedInUrlUpdated.replace("{name}", res.name)
        : c.linkedInUrlAddSuccess.replace("{name}", res.name),
    );
    router.refresh();
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
    setPreviewOpen(true);

    toast.info(messages.candidates.backgroundTasks.saveToastStart.replace("{total}", String(count)));

    void runSaveSearchAndEnrich(results, selectedJobId, {
      onComplete: ({ savedIds }) => {
        if (savedIds.length > 0) {
          toast.success(c.saveAndEnrichDone.replace("{count}", String(savedIds.length)), {
            action: {
              label: c.bulkAiEvaluate,
              onClick: () => openBulkAiEvaluate(savedIds),
            },
          });
        }
      },
    });
  };

  const handleSavePreview = (selected: LinkedInSearchHit[], runAiAfter = false) => {
    if (selected.length === 0) return;

    setPreviewOpen(false);
    void runSaveSearchAndEnrich(selected, selectedJobId, {
      onComplete: ({ savedIds, namesById }) => {
        if (savedIds.length === 0) {
          toast.error(c.saveError);
          return;
        }
        if (savedIds.length < selected.length) {
          toast.info(
            c.saveBatchPartial
              .replace("{saved}", String(savedIds.length))
              .replace("{total}", String(selected.length)),
          );
        } else if (selected.length === 1) {
          toast.success(c.saveOneSuccess.replace("{name}", selected[0]!.name));
        } else {
          toast.success(c.saveAndEnrichDone.replace("{count}", String(savedIds.length)));
        }
        if (runAiAfter && savedIds.length > 0 && selectedJobId && selectedJob) {
          void runBulkAiEvaluate({
            candidateIds: savedIds,
            namesById,
            jobPositionId: selectedJobId,
            jobTitle: selectedJob.title,
          });
        }
      },
    });
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
    setSelectedForAssign(new Set());
  };

  const toggleAssignSelection = (id: string) => {
    setSelectedForAssign((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAssignSelectionAllPage = () => {
    if (selectedForAssign.size === filteredCandidates.length) {
      setSelectedForAssign(new Set());
    } else {
      setSelectedForAssign(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const openBulkAssignJob = () => {
    setBulkAssignOpen(true);
  };

  const allPageSelected =
    filteredCandidates.length > 0 && selectedForAssign.size === filteredCandidates.length;
  const somePageSelected = selectedForAssign.size > 0 && !allPageSelected;

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
    if (displayStatus === "UNSCORED") {
      return (
        <span className="text-[11px] text-[color:var(--foreground-muted)] tabular-nums" aria-hidden>
          —
        </span>
      );
    }
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
    const label =
      source === "LINXA_INBOX"
        ? c.table.sourceLinxa
        : source === "LINKEDIN_SEARCH"
          ? c.table.sourceLinkedIn
          : c.table.sourceManual;
    const tone =
      candidateSourceBadgeClass[source ?? ""] ?? candidateSourceBadgeClass.default;
    return <span className={candidateStatusPill(tone)}>{label}</span>;
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

  const openDetail = (candidate: Candidate) => {
    setDetailInitial(mapRowToDetailSnapshot(candidate));
    setDetailCandidateId(candidate.id);
  };

  const closeDetail = () => {
    setDetailCandidateId(null);
    setDetailInitial(null);
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

          {initialJobs.map((job) => {
            const companyLabel = resolveJobPositionCompanyLabel(job);
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => handleJobSelect(job.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all group relative",
                  selectedJobId === job.id
                    ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] font-medium"
                    : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate pr-1">{job.title}</span>
                    {companyLabel ? (
                      <span
                        className={cn(
                          "block text-[10px] truncate mt-0.5 font-normal",
                          selectedJobId === job.id
                            ? "text-[color:var(--brand-strong)]/80"
                            : "text-[color:var(--foreground-muted)]",
                        )}
                      >
                        {companyLabel}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground-muted)] shrink-0 tabular-nums">
                    {job._count.candidates}
                  </span>
                </div>
              </button>
            );
          })}

          {initialJobs.length === 0 && (
            <p className="text-xs text-[color:var(--foreground-muted)] italic px-3 py-2">
              {messages.jobPositions.empty}
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-10 space-y-3">
        <RecruitmentBackgroundTasksBanner tasks={backgroundTasks} />

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
            <CardTitle className="text-xl font-bold flex flex-col items-start gap-0.5">
              <span className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)] shrink-0" />
                {selectedJobId ? selectedJob?.title : c.title}
              </span>
              {selectedJobId && selectedJobCompany ? (
                <span className="text-sm font-normal text-[color:var(--foreground-muted)] pl-7">
                  {selectedJobCompany}
                </span>
              ) : null}
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
                  <div className="space-y-2">
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
                  <div className="flex gap-2 pt-1 border-t border-[color:var(--line)]/80">
                    <Input
                      placeholder={c.linkedInUrlPlaceholder}
                      className="h-9 flex-1 min-w-0 bg-[color:var(--surface)] border-[color:var(--line)] text-sm"
                      value={linkedInUrlInput}
                      onChange={(e) => setLinkedInUrlInput(e.target.value)}
                      disabled={addingByLinkedInUrl || isSearching}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddByLinkedInUrl();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 text-xs"
                      disabled={addingByLinkedInUrl || isSearching}
                      onClick={() => void handleAddByLinkedInUrl()}
                    >
                      {addingByLinkedInUrl ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {c.linkedInUrlAdd}
                    </Button>
                  </div>
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

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--foreground-muted)]" />
                <Input
                  placeholder={c.tableFilterPlaceholder}
                  className="pl-9 bg-[color:var(--surface-soft)] border-none focus-visible:ring-1"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                />
              </div>
              {!selectedJobId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => openBulkAssignJob()}
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  {c.bulkAssignJobButton}
                  {selectedForAssign.size > 0 ? (
                    <span className="ml-1 text-[color:var(--foreground-muted)] tabular-nums">
                      ({selectedForAssign.size})
                    </span>
                  ) : null}
                </Button>
              ) : null}
              {selectedJobId && needsLinkedInScrapeCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setBulkLinkedInOpen(true)}
                >
                  <LinkedInIcon className="h-3.5 w-3.5 mr-1.5" />
                  {c.bulkLinkedInFetch}
                  <span className="ml-1 text-[color:var(--foreground-muted)] tabular-nums">
                    ({needsLinkedInScrapeCount})
                  </span>
                </Button>
              ) : null}
              {selectedJobId && unscoredEligibleCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => openBulkAiEvaluate(null)}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {c.bulkAiEvaluate}
                  <span className="ml-1 text-[color:var(--foreground-muted)] tabular-nums">
                    ({unscoredEligibleCount})
                  </span>
                </Button>
              ) : null}
            </div>

            <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
              <Table>
                <TableHeader className="bg-[color:var(--surface-soft)]">
                  <TableRow>
                    {!selectedJobId ? (
                      <TableHead className="w-10 px-2">
                        <input
                          type="checkbox"
                          className="rounded border-[color:var(--line)]"
                          checked={allPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePageSelected;
                          }}
                          onChange={toggleAssignSelectionAllPage}
                          aria-label={c.bulkAssignJobSelectAllPage}
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="min-w-[220px]">{messages.candidates.table.candidate}</TableHead>
                    {!selectedJobId ? (
                      <TableHead className="hidden md:table-cell w-[140px]">
                        {messages.candidates.table.jobPosition}
                      </TableHead>
                    ) : null}
                    <TableHead className="w-[100px]">{messages.candidates.table.source}</TableHead>
                    <TableHead className="hidden xl:table-cell w-[120px]">{messages.candidates.table.location}</TableHead>
                    <TableHead>{messages.candidates.table.sentiment}</TableHead>
                    <TableHead className="w-[108px]">{messages.candidates.table.status}</TableHead>
                    <TableHead>{messages.candidates.table.updated}</TableHead>
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
                          {!selectedJobId ? (
                            <TableCell
                              className="w-10 px-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-[color:var(--line)]"
                                checked={selectedForAssign.has(candidate.id)}
                                onChange={() => toggleAssignSelection(candidate.id)}
                                aria-label={c.bulkAssignJobSelectRow.replace("{name}", candidate.name)}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-sm flex items-center gap-1.5 flex-wrap min-w-0">
                                <span className="truncate">{candidate.name}</span>
                                {candidate.recruiterNotes?.trim() ? (
                                  <StickyNote
                                    className="h-3.5 w-3.5 shrink-0 text-amber-700"
                                    aria-label={messages.candidates.table.recruiterNotesBadge}
                                  />
                                ) : null}
                                {(() => {
                                  const displayScore = resolveCandidateDisplayMatchScore(
                                    candidate.matchScore,
                                    candidate.aiAnalysisSummary,
                                  );
                                  return displayScore != null ? (
                                    <span className={candidateStatusPill(candidateJdBadgeClass.evaluated)}>
                                      {displayScore}%
                                    </span>
                                  ) : null;
                                })()}
                                {candidate.linkedinConnectionStatus &&
                                candidate.linkedinConnectionStatus !== "UNKNOWN" ? (
                                  <span
                                    className={candidateStatusPill(
                                      candidateConnectionBadgeClass[
                                        candidate.linkedinConnectionStatus
                                      ] ?? candidateConnectionBadgeClass.UNKNOWN,
                                    )}
                                  >
                                    {connLabels[
                                      ({
                                        CONNECTED: "connected",
                                        PENDING: "pending",
                                        NOT_CONNECTED: "notConnected",
                                        UNKNOWN: "unknown",
                                      }[
                                        candidate.linkedinConnectionStatus
                                      ] ?? "unknown") as keyof typeof connLabels
                                    ]}
                                  </span>
                                ) : null}
                                <CandidateProfileStatusBadges
                                  profileUrl={candidate.profileUrl}
                                  extractedInfo={candidate.extractedInfo}
                                  cvText={candidate.cvText}
                                  cvFileUrl={candidate.cvFileUrl}
                                  messages={messages}
                                />
                              </span>
                              <span className="text-xs text-[color:var(--foreground-muted)] line-clamp-1">
                                {candidate.headline || messages.candidates.table.noHeadline}
                                {candidate.currentCompany && ` · ${candidate.currentCompany}`}
                              </span>
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
                          {!selectedJobId ? (
                            <TableCell className="hidden md:table-cell text-xs text-[color:var(--foreground-muted)]">
                              {candidate.jobPosition?.title ?? "—"}
                            </TableCell>
                          ) : null}
                          <TableCell>{getSourceBadge(candidate.source)}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-[color:var(--foreground-muted)]">
                            {candidate.location || "—"}
                          </TableCell>
                          <TableCell>{getSentimentBadge(candidate)}</TableCell>
                          <TableCell>{getStatusBadge(candidate)}</TableCell>
                          <TableCell className="text-xs text-[color:var(--foreground-muted)]">
                            {new Date(candidate.updatedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={selectedJobId ? 6 : 8}
                        className="h-32 text-center text-[color:var(--foreground-muted)]"
                      >
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
        saving={isBackgroundSaving}
        onSave={(rows) => void handleSavePreview(rows)}
        onSaveAndEvaluate={(rows) => void handleSavePreview(rows, true)}
      />

      {!selectedJobId ? (
        <CandidateBulkAssignJobDialog
          open={bulkAssignOpen}
          onClose={() => setBulkAssignOpen(false)}
          jobs={initialJobs.map((j) => ({ id: j.id, title: j.title }))}
          candidates={filteredCandidates}
          initialSelectedIds={[...selectedForAssign]}
          messages={messages}
          onDone={() => {
            setSelectedForAssign(new Set());
            router.refresh();
          }}
        />
      ) : null}

      {selectedJobId ? (
        <CandidateBulkLinkedInProfileDialog
          open={bulkLinkedInOpen}
          onClose={() => setBulkLinkedInOpen(false)}
          candidates={bulkLinkedInCandidates}
          messages={messages}
          onStartBackground={(params) => {
            void runBulkLinkedInProfiles(params);
          }}
        />
      ) : null}

      {selectedJobId && selectedJob ? (
        <CandidateBulkAiEvaluateDialog
          open={bulkAiOpen}
          onClose={() => {
            setBulkAiOpen(false);
            setBulkAiScopeIds(null);
          }}
          jobPositionId={selectedJobId}
          jobTitle={selectedJob.title}
          candidates={bulkAiCandidates}
          messages={messages}
          onStartBackground={(params) => {
            void runBulkAiEvaluate(params);
            setBulkAiScopeIds(null);
          }}
        />
      ) : null}

      <CandidateDetailSheet
        candidateId={detailCandidateId}
        initialSnapshot={detailInitial}
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
