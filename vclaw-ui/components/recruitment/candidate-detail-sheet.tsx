"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, FileDown, Loader2, MessageSquare, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  assignCandidateJobPosition,
  getCandidateDetail,
  refreshCandidateLinkedInProfile,
  rescoreCandidateWithAi,
} from "@/lib/actions/recruitment/actions";
import { canScoreCandidateWithJd, jdScoringMissingProfileMessage } from "@/lib/recruitment/candidate-jd-eligibility";
import { hasJdEvaluation } from "@/lib/recruitment/candidate-status";
import {
  hasExtractedProfileContent,
  parseExtractedProfileInfo,
  parseLabelsJson,
} from "@/lib/recruitment/candidate-profile";
import { CandidateProfileStatusBadges } from "@/components/recruitment/candidate-profile-status-badges";
import { CandidateProfileSection } from "@/components/recruitment/candidate-profile-section";
import {
  parseStoredCandidateJdEvaluation,
  resolveCandidateDisplayMatchScore,
} from "@/lib/recruitment/candidate-jd-evaluation";
import type { CandidateDetailSnapshot } from "@/lib/recruitment/candidate-types";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { CandidateAiEvaluationPanel } from "@/components/recruitment/candidate-ai-evaluation-panel";
import { CandidateConnectComposePanel } from "@/components/recruitment/candidate-connect-compose-panel";
import { CandidateOutreachComposePanel } from "@/components/recruitment/candidate-outreach-compose-dialog";
import { CandidateRecruiterNotesSection } from "@/components/recruitment/candidate-recruiter-notes-section";
import { CandidateLinxaChatDialog } from "@/components/recruitment/candidate-linxa-chat-dialog";
import { CandidateResumeSection } from "@/components/recruitment/candidate-resume-section";
import { resolveLinxaChatId } from "@/lib/recruitment/linxa-chat-id";
import {
  candidateConnectionBadgeClass,
  candidateJdBadgeClass,
  candidateSourceBadgeClass,
  candidateStatusPill,
  resolveLinkedInOutreachMode,
} from "@/lib/recruitment/candidate-badge-styles";
import { fetchCandidateLinxaChatMessages } from "@/lib/recruitment/actions";
import type { LinxaChatMessage } from "@/lib/recruitment/linxa-message-map";
import {
  buildCandidateDetailPdfDocument,
  buildCandidateDetailPdfFileName,
  buildCandidateDetailPdfLabels,
} from "@/lib/recruitment/candidate-detail-pdf-document";
import { toast } from "sonner";

type CandidateDetail = CandidateDetailSnapshot;

type JobOption = { id: string; title: string };

type CandidateDetailSheetProps = {
  candidateId: string | null;
  initialSnapshot?: CandidateDetailSnapshot | null;
  /** Job đang chọn trên trang ứng viên — dùng khi hàng DB chưa gắn jobPositionId. */
  selectedJobPositionId?: string;
  jobOptions?: JobOption[];
  onClose: () => void;
  messages: AdminHhContent;
  locale: string;
  onUpdated?: () => void;
};

const SELECT_CLASS =
  "flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50";

const CONNECTION_LABEL_KEYS: Record<string, keyof AdminHhContent["candidates"]["connection"]> = {
  CONNECTED: "connected",
  PENDING: "pending",
  NOT_CONNECTED: "notConnected",
  UNKNOWN: "unknown",
};

function snapshotAsDetail(s: CandidateDetailSnapshot): CandidateDetail {
  return s as unknown as CandidateDetail;
}

export function CandidateDetailSheet({
  candidateId,
  initialSnapshot,
  selectedJobPositionId,
  jobOptions = [],
  onClose,
  messages,
  locale,
  onUpdated,
}: CandidateDetailSheetProps) {
  const d = messages.candidates.detail;
  const conn = messages.candidates.connection;
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [rescoringAi, setRescoringAi] = useState(false);
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [pickJobId, setPickJobId] = useState("");
  const [assigningJob, setAssigningJob] = useState(false);
  const [linxaChatOpen, setLinxaChatOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setData(null);
      return;
    }
    if (initialSnapshot?.id === candidateId) {
      setData(snapshotAsDetail(initialSnapshot));
    } else {
      setData(null);
    }

    let cancelled = false;
    setDetailRefreshing(true);
    void getCandidateDetail(candidateId).then((row) => {
      if (!cancelled) {
        setData(row);
        setDetailRefreshing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId, initialSnapshot]);

  useEffect(() => {
    const preferred =
      data?.jobPositionId ?? selectedJobPositionId ?? jobOptions[0]?.id ?? "";
    setPickJobId(preferred);
  }, [candidateId, data?.jobPositionId, selectedJobPositionId, jobOptions]);

  if (!candidateId) return null;

  const labels = parseLabelsJson(data?.labels);
  const connectionKey = data?.linkedinConnectionStatus
    ? CONNECTION_LABEL_KEYS[data.linkedinConnectionStatus] ?? "unknown"
    : "unknown";

  const profileInfo = parseExtractedProfileInfo(data?.extractedInfo);
  const displayLocation = data?.location || profileInfo.location || null;
  const aiEvaluation = data
    ? parseStoredCandidateJdEvaluation(
        data.aiAnalysisSummary,
        data.matchSummary,
        data.matchScore,
      )
    : null;
  const displayMatchScore = data
    ? resolveCandidateDisplayMatchScore(data.matchScore, data.aiAnalysisSummary)
    : null;
  const hasJdEval = data ? hasJdEvaluation(data.aiAnalysisSummary) : false;
  const showConnectionBadge =
    data?.linkedinConnectionStatus &&
    data.linkedinConnectionStatus !== "UNKNOWN";
  const hasProfileData = hasExtractedProfileContent(profileInfo);
  const profileLoading =
    Boolean(detailRefreshing && data && !hasProfileData && isLinkedInProfileUrl(data.profileUrl));
  const canViewLinxaChat = Boolean(
    data &&
      (resolveLinxaChatId(data.linxaChatId, data.profileUrl) || data.source === "LINXA_INBOX"),
  );

  const reloadDetail = async () => {
    if (!candidateId) return;
    const row = await getCandidateDetail(candidateId);
    setData(row);
    onUpdated?.();
  };

  const handleRefreshProfile = async () => {
    if (!candidateId) return;
    setRefreshingProfile(true);
    const res = await refreshCandidateLinkedInProfile(candidateId);
    setRefreshingProfile(false);
    if (res.success) {
      toast.success(d.enrichSuccess);
      await reloadDetail();
    } else {
      toast.error(res.error ?? d.enrichError);
    }
  };

  const effectiveJobPositionId =
    data?.jobPositionId ?? selectedJobPositionId ?? undefined;

  const handleRescoreAi = async (jobOverride?: string) => {
    if (!candidateId) return;
    const jobId = jobOverride ?? effectiveJobPositionId;
    if (!jobId) return;
    setRescoringAi(true);
    const res = await rescoreCandidateWithAi(candidateId, jobId, locale);
    setRescoringAi(false);
    if (res.success) {
      toast.success(d.rescoreSuccess);
      await reloadDetail();
      onUpdated?.();
    } else {
      toast.error(res.error ?? d.rescoreError);
    }
  };

  const handleAssignJob = async (runAiAfter: boolean) => {
    if (!candidateId || !pickJobId) return;
    setAssigningJob(true);
    const res = await assignCandidateJobPosition(candidateId, pickJobId);
    if (!res.success) {
      setAssigningJob(false);
      toast.error(res.error ?? d.assignJobError);
      return;
    }
    toast.success(d.assignJobSuccess.replace("{title}", res.jobTitle));
    await reloadDetail();
    onUpdated?.();
    setAssigningJob(false);
    if (runAiAfter) {
      await handleRescoreAi(pickJobId);
    }
  };

  const hasAiEvaluation = aiEvaluation != null;
  const canRescoreAi = Boolean(effectiveJobPositionId);
  const canScoreJd = data
    ? canScoreCandidateWithJd({
        extractedInfo: data.extractedInfo,
        cvText: data.cvText,
        cvFileUrl: data.cvFileUrl,
        profileUrl: data.profileUrl,
      })
    : false;
  const connectionStatus = data?.linkedinConnectionStatus ?? "UNKNOWN";
  const outreachMode = data
    ? resolveLinkedInOutreachMode(connectionStatus, data.profileUrl, isLinkedInProfileUrl)
    : "none";

  const sourceBadgeClass =
    candidateSourceBadgeClass[data?.source ?? ""] ?? candidateSourceBadgeClass.default;

  const sourceLabel = data?.source
    ? data.source === "LINXA_INBOX"
      ? messages.candidates.table.sourceLinxa
      : data.source === "LINKEDIN_SEARCH"
        ? messages.candidates.table.sourceLinkedIn
        : data.source
    : null;

  const handleExportPdf = async () => {
    if (!candidateId || !data) return;
    setExportingPdf(true);
    try {
      const {
        resolveLinxaChatId,
      } = await import("@/lib/recruitment/linxa-chat-id");
      const {
        parseStoredLinxaConversationHistory,
        refineLinxaMessageDirections,
      } = await import("@/lib/recruitment/linxa-message-map");

      const linxaChatId = resolveLinxaChatId(data.linxaChatId, data.profileUrl);
      const hasLinxaContext = Boolean(
        linxaChatId ||
          data.source === "LINXA_INBOX" ||
          data.conversationHistory?.trim() ||
          data.chatInfo?.trim(),
      );

      let linxaMessages: LinxaChatMessage[] = [];
      if (hasLinxaContext) {
        const chatRes = await fetchCandidateLinxaChatMessages(candidateId);
        if (chatRes.success && chatRes.messages.length > 0) {
          linxaMessages = chatRes.messages;
        } else {
          const stored = parseStoredLinxaConversationHistory(data.conversationHistory);
          if (stored.length > 0) {
            linxaMessages = refineLinxaMessageDirections(stored, data.name);
          } else if (data.chatInfo?.trim()) {
            linxaMessages = [
              {
                id: "preview",
                text: data.chatInfo.trim(),
                sentAt: null,
                direction: "inbound",
              },
            ];
          }
        }
      }

      const doc = buildCandidateDetailPdfDocument({
        candidate: data,
        profileInfo,
        aiEvaluation,
        displayMatchScore,
        hasJdEvaluation: hasJdEval,
        labels,
        connectionLabel: showConnectionBadge ? conn[connectionKey] : null,
        sourceLabel,
        locale,
        copy: buildCandidateDetailPdfLabels(d),
        linxaMessages,
        hasLinxaContext,
      });
      const fileName = buildCandidateDetailPdfFileName(
        data.name,
        data.jobPosition?.title,
      );
      const { downloadCandidateDetailPdf } = await import("@/lib/recruitment/candidate-detail-pdf");
      await downloadCandidateDetailPdf(doc, fileName);
      toast.success(d.exportPdfSuccess);
    } catch {
      toast.error(d.exportPdfError);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 z-[56] h-full w-full max-w-[min(92vw,42rem)] bg-[color:var(--surface)] border-l border-[color:var(--line)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2.5 shrink-0">
          <h2 className="font-semibold text-base">{d.title}</h2>
          <div className="flex items-center gap-1">
            {data ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={exportingPdf}
                onClick={() => void handleExportPdf()}
                title={d.exportPdf}
              >
                {exportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{d.exportPdf}</span>
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="px-4 py-4 space-y-4 pb-6">
          {detailRefreshing && data && (
            <div className="flex items-center gap-2 text-xs text-[color:var(--foreground-muted)] rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              {d.refreshing}
            </div>
          )}

          {!data ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--muted)]" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3.5 space-y-2.5">
                <div>
                  <h3 className="text-lg font-bold leading-tight">{data.name}</h3>
                  <p className="text-sm text-[color:var(--foreground-muted)] mt-1 leading-snug">
                    {data.headline || "—"}
                  </p>
                  {(data.currentCompany || displayLocation) && (
                    <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
                      {[data.currentCompany, displayLocation].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hasJdEval && displayMatchScore != null ? (
                    <span className={candidateStatusPill(candidateJdBadgeClass.evaluated)}>
                      {d.matchScore}: {displayMatchScore}%
                    </span>
                  ) : (
                    <span className={candidateStatusPill(candidateJdBadgeClass.unevaluated)}>
                      {d.jdMatchUnevaluated}
                    </span>
                  )}
                  {showConnectionBadge ? (
                    <span
                      className={candidateStatusPill(
                        candidateConnectionBadgeClass[connectionStatus] ??
                          candidateConnectionBadgeClass.UNKNOWN,
                      )}
                    >
                      {conn[connectionKey]}
                    </span>
                  ) : null}
                  {data.source ? (
                    <span className={candidateStatusPill(sourceBadgeClass)}>
                      {data.source === "LINXA_INBOX"
                        ? messages.candidates.table.sourceLinxa
                        : data.source === "LINKEDIN_SEARCH"
                          ? messages.candidates.table.sourceLinkedIn
                          : data.source}
                    </span>
                  ) : null}
                  {data.sentiment ? (
                    <span className={candidateStatusPill("bg-slate-50 text-slate-700 border-slate-200/90")}>
                      {data.sentiment}
                    </span>
                  ) : null}
                  <CandidateProfileStatusBadges
                    profileUrl={data.profileUrl}
                    extractedInfo={data.extractedInfo}
                    cvText={data.cvText}
                    cvFileUrl={data.cvFileUrl}
                    messages={messages}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.profileUrl && isLinkedInProfileUrl(data.profileUrl) ? (
                  <a
                    href={data.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-1.5 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 py-2 text-xs font-medium hover:bg-[color:var(--surface-soft)]"
                    title={d.openLinkedIn}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{d.openLinkedIn}</span>
                  </a>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1 min-w-[7rem] h-auto py-2 text-xs"
                  disabled={refreshingProfile || !isLinkedInProfileUrl(data.profileUrl)}
                  onClick={() => void handleRefreshProfile()}
                  title={d.refreshProfile}
                >
                  {refreshingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{d.refreshProfile}</span>
                </Button>
                {canViewLinxaChat ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[7rem] h-auto py-2 text-xs"
                    onClick={() => setLinxaChatOpen(true)}
                    title={d.viewLinxaChat}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#0a66c2]" />
                    <span className="truncate">{d.viewLinxaChat}</span>
                  </Button>
                ) : null}
              </div>

              <CandidateProfileSection
                profileInfo={profileInfo}
                messages={messages}
                matchSummary={data.matchSummary}
                loading={profileLoading || refreshingProfile}
              />

              {jobOptions.length > 0 ? (
                <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]">
                    {d.assignJobLabel}
                  </p>
                  {data.jobPosition ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[color:var(--foreground)]">
                        {d.job}:{" "}
                        <span className="font-medium">{data.jobPosition.title}</span>
                      </p>
                      {(data.jobPosition.summary || data.jobPosition.description) && (
                        <p className="text-[11px] text-[color:var(--foreground-muted)] italic leading-relaxed line-clamp-3">
                          {data.jobPosition.summary || data.jobPosition.description}
                        </p>
                      )}
                    </div>
                  ) : null}
                  <select
                    className={SELECT_CLASS}
                    value={pickJobId}
                    onChange={(e) => setPickJobId(e.target.value)}
                    disabled={assigningJob || rescoringAi}
                  >
                    <option value="">{d.assignJobPlaceholder}</option>
                    {jobOptions.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                  {pickJobId &&
                  (pickJobId !== (data.jobPositionId ?? "") || !data.jobPositionId) ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={assigningJob || rescoringAi}
                        onClick={() => void handleAssignJob(false)}
                      >
                        {assigningJob ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : null}
                        {data.jobPositionId ? d.changeJobButton : d.assignJobButton}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="text-xs"
                        disabled={assigningJob || rescoringAi || !canScoreJd}
                        title={!canScoreJd ? jdScoringMissingProfileMessage() : undefined}
                        onClick={() => void handleAssignJob(true)}
                      >
                        {assigningJob || rescoringAi ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {data.jobPositionId ? d.changeJobAndScoreAi : d.assignAndScoreAi}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <CandidateRecruiterNotesSection
                candidateId={candidateId}
                initialNotes={data.recruiterNotes ?? ""}
                initialEmail={data.email ?? ""}
                initialPhone={data.phone ?? ""}
                messages={messages}
                onSaved={() => void reloadDetail()}
              />

              <CandidateResumeSection
                candidateId={candidateId}
                initialCvText={data.cvText ?? ""}
                initialCvFileUrl={data.cvFileUrl}
                messages={messages}
                onUpdated={() => void reloadDetail()}
              />

              <section className="space-y-2" aria-labelledby="candidate-ai-eval-heading">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="candidate-ai-eval-heading"
                    className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]"
                  >
                    {d.aiEvaluationTitle}
                  </h3>
                  {canRescoreAi ? (
                    <Button
                      type="button"
                      variant={hasAiEvaluation ? "outline" : "primary"}
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      disabled={rescoringAi || !canScoreJd}
                      title={!canScoreJd ? jdScoringMissingProfileMessage() : undefined}
                      onClick={() => void handleRescoreAi()}
                    >
                      {rescoringAi ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {d.rescoreAi}
                    </Button>
                  ) : null}
                </div>
                {canRescoreAi && !canScoreJd && d.jdScoringRequiresProfile?.trim() ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {d.jdScoringRequiresProfile}
                  </p>
                ) : null}
                {hasAiEvaluation && aiEvaluation ? (
                  <CandidateAiEvaluationPanel
                    evaluation={aiEvaluation}
                    messages={messages}
                    showHeader={false}
                  />
                ) : !canRescoreAi && d.pickJobAboveForAi?.trim() ? (
                  <p className="text-xs text-[color:var(--foreground-muted)] rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3">
                    {d.pickJobAboveForAi}
                  </p>
                ) : null}
              </section>

              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {labels.map((label) => (
                    <span
                      key={label}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-[color:var(--foreground-muted)]">
                {d.updated}:{" "}
                {new Date(data.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
              </p>

              {(outreachMode === "message" || outreachMode === "connect" || outreachMode === "pending") ? (
                <CandidateOutreachComposePanel
                  candidateId={candidateId}
                  candidateName={data.name}
                  profileUrl={data.profileUrl}
                  messages={messages}
                  onSent={() => void reloadDetail()}
                />
              ) : null}
              {outreachMode === "connect" ? (
                <CandidateConnectComposePanel
                  candidateId={candidateId}
                  candidateName={data.name}
                  profileUrl={data.profileUrl}
                  messages={messages}
                  onSent={() => void reloadDetail()}
                />
              ) : null}
              {outreachMode === "pending" ? (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2">
                  {messages.candidates.connectInvite.alreadyPending}
                </p>
              ) : null}

            </>
          )}
          </div>
        </div>
      </aside>

      {candidateId && data ? (
        <CandidateLinxaChatDialog
          open={linxaChatOpen}
          onClose={() => setLinxaChatOpen(false)}
          candidateId={candidateId}
          candidateName={data.name}
          linxaChatId={data.linxaChatId}
          profileUrl={data.profileUrl}
          messages={messages}
          locale={locale}
        />
      ) : null}
    </>
  );
}
