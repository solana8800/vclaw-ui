"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Send, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  assignCandidateJobPosition,
  getCandidateDetail,
  refreshCandidateLinkedInProfile,
  rescoreCandidateWithAi,
} from "@/lib/actions/recruitment/actions";
import {
  hasExtractedProfileContent,
  parseExtractedProfileInfo,
  parseLabelsJson,
} from "@/lib/recruitment/candidate-profile";
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
import { toast } from "sonner";

type CandidateDetail = CandidateDetailSnapshot;

type JobOption = { id: string; title: string };

type CandidateDetailSheetProps = {
  candidateId: string | null;
  initialSnapshot?: CandidateDetailSnapshot | null;
  initialOpenCompose?: boolean;
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
  initialOpenCompose = false,
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [pickJobId, setPickJobId] = useState("");
  const [assigningJob, setAssigningJob] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setData(null);
      setComposeOpen(false);
      setConnectOpen(false);
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
    if (candidateId && initialOpenCompose && isLinkedInProfileUrl(data?.profileUrl)) {
      setComposeOpen(true);
    }
  }, [candidateId, initialOpenCompose, data?.profileUrl]);

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
    ? resolveCandidateDisplayMatchScore(data.matchScore, data.aiAnalysisSummary, data.matchSummary)
    : null;
  const hasProfileData = hasExtractedProfileContent(profileInfo);
  const profileLoading =
    Boolean(detailRefreshing && data && !hasProfileData && isLinkedInProfileUrl(data.profileUrl));

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
    const res = await rescoreCandidateWithAi(candidateId, jobId);
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
  const canSendMessage = isLinkedInProfileUrl(data?.profileUrl);
  const connectionStatus = data?.linkedinConnectionStatus ?? "UNKNOWN";
  const canConnect =
    canSendMessage &&
    (connectionStatus === "NOT_CONNECTED" || connectionStatus === "UNKNOWN");
  const canMessageAfterConnect = canSendMessage && connectionStatus === "CONNECTED";
  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[1px]"
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
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
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
                  {displayMatchScore != null && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]">
                      {d.matchScore}: {displayMatchScore}%
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[11px]">
                    {conn[connectionKey]}
                  </Badge>
                  {data.sentiment ? (
                    <Badge variant="outline" className="text-[11px]">
                      {data.sentiment}
                    </Badge>
                  ) : null}
                  {data.source ? (
                    <Badge variant="outline" className="text-[10px]">
                      {data.source}
                    </Badge>
                  ) : null}
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
                    <p className="text-xs text-[color:var(--foreground)]">
                      {d.job}:{" "}
                      <span className="font-medium">{data.jobPosition.title}</span>
                    </p>
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
                        disabled={assigningJob || rescoringAi}
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
                      disabled={rescoringAi}
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
                {hasAiEvaluation && aiEvaluation ? (
                  <>
                    {aiEvaluation.criteria.length > 0 ? (
                      <p className="text-[10px] text-[color:var(--foreground-muted)] -mt-1">
                        {d.aiCachedHint}
                      </p>
                    ) : null}
                    <CandidateAiEvaluationPanel
                      evaluation={aiEvaluation}
                      messages={messages}
                      showHeader={false}
                    />
                  </>
                ) : canRescoreAi ? (
                  <p className="text-xs text-[color:var(--foreground-muted)] rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 leading-relaxed">
                    {d.noAiEvaluation}
                  </p>
                ) : (
                  <p className="text-xs text-[color:var(--foreground-muted)] rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3">
                    {d.pickJobAboveForAi}
                  </p>
                )}
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

              <div className="space-y-2 pt-3 border-t border-[color:var(--line)]">
                {canConnect && !connectOpen && !composeOpen ? (
                  <Button
                    type="button"
                    className="w-full"
                    variant="primary"
                    onClick={() => {
                      setConnectOpen(true);
                      setComposeOpen(false);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {messages.candidates.connectInvite.sendConnect}
                  </Button>
                ) : null}
                {canMessageAfterConnect && !composeOpen && !connectOpen ? (
                  <Button
                    type="button"
                    className="w-full"
                    variant="primary"
                    disabled={!canSendMessage}
                    onClick={() => {
                      setComposeOpen(true);
                      setConnectOpen(false);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {messages.candidates.outreach.sendMessage}
                  </Button>
                ) : null}
                {connectionStatus === "PENDING" && !connectOpen && !composeOpen ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    {messages.candidates.connectInvite.alreadyPending}
                  </p>
                ) : null}
                {connectOpen ? (
                  <CandidateConnectComposePanel
                    candidateId={candidateId}
                    candidateName={data.name}
                    profileUrl={data.profileUrl}
                    messages={messages}
                    onSent={() => {
                      setConnectOpen(false);
                      void reloadDetail();
                    }}
                    onCancel={() => setConnectOpen(false)}
                  />
                ) : null}
                {composeOpen ? (
                  <CandidateOutreachComposePanel
                    candidateId={candidateId}
                    candidateName={data.name}
                    profileUrl={data.profileUrl}
                    messages={messages}
                    onSent={() => {
                      setComposeOpen(false);
                      void reloadDetail();
                    }}
                    onCancel={() => setComposeOpen(false)}
                  />
                ) : null}
              </div>
            </>
          )}
          </div>
        </div>
      </aside>

    </>
  );
}
