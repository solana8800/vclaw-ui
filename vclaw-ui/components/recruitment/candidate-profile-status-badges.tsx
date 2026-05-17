"use client";

import {
  candidateLinkedInProfileBadgeClass,
  candidateStatusPill,
} from "@/lib/recruitment/candidate-badge-styles";
import {
  hasCandidateResume,
  resolveLinkedInProfileBadgeStatus,
} from "@/lib/recruitment/candidate-jd-eligibility";
import type { AdminHhContent } from "@/lib/admin/content";

type CandidateProfileStatusBadgesProps = {
  profileUrl?: string | null;
  extractedInfo?: string | null;
  cvText?: string | null;
  cvFileUrl?: string | null;
  messages: AdminHhContent;
};

export function CandidateProfileStatusBadges({
  profileUrl,
  extractedInfo,
  cvText,
  cvFileUrl,
  messages,
}: CandidateProfileStatusBadgesProps) {
  const t = messages.candidates.table;
  const liStatus = resolveLinkedInProfileBadgeStatus(profileUrl, extractedInfo);
  const hasResume = hasCandidateResume(cvText, cvFileUrl);

  return (
    <>
      {liStatus === "scraped" ? (
        <span
          className={candidateStatusPill(candidateLinkedInProfileBadgeClass.scraped)}
          title={t.linkedinProfileScrapedHint}
        >
          {t.linkedinProfileScraped}
        </span>
      ) : null}
      {liStatus === "url_only" ? (
        <span
          className={candidateStatusPill(candidateLinkedInProfileBadgeClass.urlOnly)}
          title={t.linkedinProfilePendingHint}
        >
          {t.linkedinProfilePending}
        </span>
      ) : null}
      {hasResume ? (
        <span className={candidateStatusPill(candidateLinkedInProfileBadgeClass.resume)}>
          {messages.candidates.detail.resumeBadge}
        </span>
      ) : null}
    </>
  );
}
