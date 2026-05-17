"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  getCandidateDetail,
  refreshCandidateLinkedInProfile,
  rescoreCandidateWithAi,
} from "@/lib/actions/recruitment/actions";
import { parseExtractedProfileInfo, parseLabelsJson } from "@/lib/recruitment/candidate-profile";
import { parseStoredCandidateJdEvaluation } from "@/lib/recruitment/candidate-jd-evaluation";
import type { CandidateDetailSnapshot } from "@/lib/recruitment/candidate-types";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { CandidateAiEvaluationPanel } from "@/components/recruitment/candidate-ai-evaluation-panel";
import { CandidateOutreachComposePanel } from "@/components/recruitment/candidate-outreach-compose-dialog";
import { toast } from "sonner";

type CandidateDetail = CandidateDetailSnapshot;

type CandidateDetailSheetProps = {
  candidateId: string | null;
  initialSnapshot?: CandidateDetailSnapshot | null;
  initialOpenCompose?: boolean;
  onClose: () => void;
  messages: AdminHhContent;
  locale: string;
  onUpdated?: () => void;
};

const CONNECTION_LABEL_KEYS: Record<string, keyof AdminHhContent["candidates"]["connection"]> = {
  CONNECTED: "connected",
  PENDING: "pending",
  NOT_CONNECTED: "notConnected",
  UNKNOWN: "unknown",
};

function snapshotAsDetail(s: CandidateDetailSnapshot): CandidateDetail {
  return s as unknown as CandidateDetail;
}

function ProfileListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-[color:var(--line)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)] mb-2">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap border-l-2 border-[color:var(--brand-soft)] pl-2.5 leading-snug"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CandidateDetailSheet({
  candidateId,
  initialSnapshot,
  initialOpenCompose = false,
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
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setData(null);
      setAboutExpanded(false);
      setComposeOpen(false);
      return;
    }
    setAboutExpanded(false);
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
  const aboutText = profileInfo.about && profileInfo.about !== "N/A" ? profileInfo.about : "";
  const aboutCollapsed = aboutText.length > 320 || aboutText.split("\n").length > 6;

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

  const handleRescoreAi = async () => {
    if (!candidateId) return;
    setRescoringAi(true);
    const res = await rescoreCandidateWithAi(candidateId);
    setRescoringAi(false);
    if (res.success) {
      toast.success(d.rescoreSuccess);
      await reloadDetail();
    } else {
      toast.error(res.error ?? d.rescoreError);
    }
  };

  const hasAiEvaluation = aiEvaluation != null;
  const canRescoreAi = Boolean(data?.jobPositionId);
  const canSendMessage = isLinkedInProfileUrl(data?.profileUrl);
  const hasLinxaInbox = Boolean(data?.linxaChatId?.trim());

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 z-[56] h-full w-full max-w-3xl bg-[color:var(--surface)] border-l border-[color:var(--line)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3">
          <h2 className="font-bold text-lg">{d.title}</h2>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 space-y-4 pb-8">
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
              <div>
                <h3 className="text-xl font-bold">{data.name}</h3>
                <p className="text-sm text-[color:var(--foreground-muted)] mt-1">
                  {data.headline || "—"}
                </p>
                {data.currentCompany && (
                  <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
                    {data.currentCompany}
                  </p>
                )}
                {displayLocation && (
                  <p className="text-xs text-[color:var(--foreground-muted)]">{displayLocation}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {data.matchScore != null && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    {d.matchScore}: {data.matchScore}%
                  </Badge>
                )}
                <Badge variant="outline">{conn[connectionKey]}</Badge>
                {data.sentiment && (
                  <Badge variant="outline">{data.sentiment}</Badge>
                )}
                {data.source && (
                  <Badge variant="outline" className="text-[10px]">
                    {data.source}
                  </Badge>
                )}
              </div>

              {hasAiEvaluation && aiEvaluation ? (
                <CandidateAiEvaluationPanel evaluation={aiEvaluation} messages={messages} />
              ) : canRescoreAi ? (
                <p className="text-xs text-[color:var(--foreground-muted)] rounded-lg border border-dashed border-[color:var(--line)] p-3">
                  {d.noAiEvaluation}
                </p>
              ) : null}

              {aboutText ? (
                <div className="rounded-lg border border-[color:var(--line)] p-3 text-sm">
                  <p className="text-xs font-semibold uppercase text-[color:var(--foreground-muted)] mb-1">
                    {d.about}
                  </p>
                  <p
                    className={
                      aboutExpanded || !aboutCollapsed
                        ? "whitespace-pre-wrap break-words text-[color:var(--foreground)]"
                        : "whitespace-pre-wrap break-words line-clamp-6 text-[color:var(--foreground)]"
                    }
                  >
                    {aboutText}
                  </p>
                  {aboutCollapsed && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 mt-2 text-xs text-[color:var(--brand-strong)]"
                      onClick={() => setAboutExpanded((v) => !v)}
                    >
                      {aboutExpanded ? d.showLess : d.showMore}
                    </Button>
                  )}
                </div>
              ) : detailRefreshing ? (
                <div className="rounded-lg border border-dashed border-[color:var(--line)] p-3 h-16 animate-pulse bg-[color:var(--surface-soft)]" />
              ) : null}

              <ProfileListBlock title={d.experiences} items={profileInfo.experiences ?? []} />
              <ProfileListBlock title={d.education} items={profileInfo.education ?? []} />
              <ProfileListBlock title={d.projects} items={profileInfo.projects ?? []} />
              <ProfileListBlock title={d.languages} items={profileInfo.languages ?? []} />
              <ProfileListBlock title={d.recommendations} items={profileInfo.recommendations ?? []} />
              {profileInfo.skills && profileInfo.skills.length > 0 ? (
                <div className="rounded-lg border border-[color:var(--line)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)] mb-2">
                    {d.skills}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profileInfo.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--surface-soft)] border border-[color:var(--line)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

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

              {hasLinxaInbox && (
                <p className="text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1.5">
                  {d.linxaReadOnlyNote}
                </p>
              )}

              {data.jobPosition && (
                <p className="text-xs text-[color:var(--foreground-muted)]">
                  {d.job}: <span className="font-medium">{data.jobPosition.title}</span>
                </p>
              )}

              <p className="text-[10px] text-[color:var(--foreground-muted)]">
                {d.updated}:{" "}
                {new Date(data.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {data.profileUrl && isLinkedInProfileUrl(data.profileUrl) ? (
                  <a
                    href={data.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-2 py-2 text-xs font-medium hover:bg-[color:var(--surface-soft)]"
                    title={d.openLinkedIn}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{d.openLinkedIn}</span>
                  </a>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-auto py-2 text-xs"
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
                {canRescoreAi ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 text-xs"
                    disabled={rescoringAi}
                    onClick={() => void handleRescoreAi()}
                    title={d.rescoreAi}
                  >
                    {rescoringAi ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{d.rescoreAi}</span>
                  </Button>
                ) : (
                  <span />
                )}
              </div>

              {!composeOpen ? (
                <Button
                  type="button"
                  className="w-full"
                  variant="primary"
                  disabled={!canSendMessage}
                  onClick={() => setComposeOpen(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {messages.candidates.outreach.sendMessage}
                </Button>
              ) : null}
              {!canSendMessage && hasLinxaInbox && !composeOpen && (
                <p className="text-[10px] text-[color:var(--foreground-muted)]">
                  {messages.candidates.outreach.missingProfile}
                </p>
              )}
              {composeOpen && (
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
              )}
            </>
          )}
          </div>
        </div>
      </aside>

    </>
  );
}
