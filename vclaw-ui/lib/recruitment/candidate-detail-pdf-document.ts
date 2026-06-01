import type { CandidateJdEvaluation } from "@/lib/recruitment/candidate-jd-evaluation";
import {
  countChatMessageDirections,
  pdfBadge,
  pdfBadgeRow,
  pdfCard,
  pdfJdEvaluationBlock,
  pdfKeyValueGrid,
  pdfChatMessageThread,
  pdfSectionBanner,
  pdfSubBlock,
  PDF_DOC_STYLES,
  scoreTone,
} from "@/lib/recruitment/candidate-detail-pdf-layout";
import {
  CV_MARKDOWN_PDF_STYLES,
  markdownToPdfmakeContent,
} from "@/lib/recruitment/markdown-to-pdfmake";
import { slugifyCandidateName } from "@/lib/recruitment/candidate-name-slug";
import type { CandidateDetailSnapshot } from "@/lib/recruitment/candidate-types";
import type { ExtractedProfileInfo } from "@/lib/recruitment/candidate-types";
import type { LinkedInChatMessage } from "@/lib/recruitment/linkedin-chat-message";

export type CandidateDetailPdfLabels = {
  title: string;
  matchScore: string;
  jdMatchUnevaluated: string;
  job: string;
  updated: string;
  overviewTitle: string;
  profileSectionTitle: string;
  noProfileData: string;
  searchMatchSummary: string;
  about: string;
  experiences: string;
  education: string;
  skills: string;
  projects: string;
  languages: string;
  recommendations: string;
  recruiterNotesTitle: string;
  contactEmailLabel: string;
  contactPhoneLabel: string;
  resumeTitle: string;
  resumeAttachedNote: string;
  aiEvaluationTitle: string;
  aiCriteria: string;
  aiBonusCriterion: string;
  aiStrengths: string;
  aiConcerns: string;
  aiConclusion: string;
  chatTitle: string;
  chatFromCandidate: string;
  chatFromMe: string;
  chatUnknownSender: string;
  chatEmpty: string;
  chatStats: string;
  labelsTitle: string;
  pdfGeneratedAt: string;
  connectionLabel: string;
  sourceLabel: string;
};

export type CandidateDetailPdfInput = {
  candidate: CandidateDetailSnapshot;
  profileInfo: ExtractedProfileInfo;
  aiEvaluation: CandidateJdEvaluation | null;
  displayMatchScore: number | null;
  hasJdEvaluation: boolean;
  labels: string[];
  connectionLabel: string | null;
  sourceLabel: string | null;
  locale: string;
  copy: CandidateDetailPdfLabels;
  chatMessages?: LinkedInChatMessage[];
  /** Có ngữ cảnh hội thoại (để luôn hiển thị section dù chưa fetch được tin). */
  hasChatContext?: boolean;
};

export type CandidateDetailPdfDocument = Record<string, unknown>;

function formatLocaleDate(value: string | Date, locale: string): string {
  const loc = locale === "vi" ? "vi-VN" : "en-US";
  return new Date(value).toLocaleString(loc);
}

function formatChatStats(
  template: string,
  counts: { total: number; inbound: number; outbound: number },
): string {
  return template
    .replace("{total}", String(counts.total))
    .replace("{inbound}", String(counts.inbound))
    .replace("{outbound}", String(counts.outbound));
}

/** Tên file tải về: overview-ten-ung-vien-vi-tri-vclaw.pdf */
export function buildCandidateDetailPdfFileName(
  candidateName: string,
  jobTitle?: string | null,
): string {
  const nameSlug = slugifyCandidateName(candidateName);
  const jobSlug = jobTitle?.trim() ? slugifyCandidateName(jobTitle) : "";
  const parts = ["overview", nameSlug, jobSlug, "vclaw"].filter(Boolean);
  return `${parts.join("-")}.pdf`;
}

export function buildCandidateDetailPdfDocument(
  input: CandidateDetailPdfInput,
): CandidateDetailPdfDocument {
  const {
    candidate,
    profileInfo,
    aiEvaluation,
    displayMatchScore,
    hasJdEvaluation,
    labels,
    connectionLabel,
    sourceLabel,
    locale,
    copy,
    chatMessages = [],
    hasChatContext = false,
  } = input;

  const content: unknown[] = [];
  const displayLocation = candidate.location || profileInfo.location || null;
  const generatedAt = formatLocaleDate(new Date(), locale);

  // —— Header ——
  const headerBadges: Record<string, unknown>[] = [];
  if (hasJdEvaluation && displayMatchScore != null) {
    const tone = scoreTone(displayMatchScore);
    const verdict = locale === "vi" ? tone.labelVi : tone.labelEn;
    headerBadges.push(pdfBadge(`${displayMatchScore}% · ${verdict}`, tone.bg, tone.text));
  } else {
    headerBadges.push(pdfBadge(copy.jdMatchUnevaluated, "#f1f5f9", C_MUTED));
  }
  if (connectionLabel) {
    headerBadges.push(pdfBadge(connectionLabel, "#e0e7ff", "#3730a3"));
  }
  if (sourceLabel) {
    headerBadges.push(pdfBadge(sourceLabel, "#f3e8ff", "#6b21a8"));
  }
  if (candidate.sentiment?.trim()) {
    headerBadges.push(pdfBadge(candidate.sentiment.trim(), "#f1f5f9", "#475569"));
  }
  for (const label of labels) {
    headerBadges.push(pdfBadge(label, "#e8f1fb", "#0a66c2"));
  }

  content.push(
    { text: candidate.name, style: "docTitle" },
    {
      text: candidate.headline?.trim() || "—",
      style: "subtitle",
    },
  );
  if (candidate.currentCompany || displayLocation) {
    content.push({
      text: [candidate.currentCompany, displayLocation].filter(Boolean).join(" · "),
      fontSize: 10,
      color: "#64748b",
      margin: [0, 2, 0, 0],
    });
  }
  content.push(pdfBadgeRow(headerBadges));

  // —— Tổng quan ——
  content.push(pdfSectionBanner(copy.overviewTitle));
  
  const jobDisplayValue = candidate.jobPosition
    ? candidate.jobPosition.title + 
      ((candidate.jobPosition.summary || candidate.jobPosition.description) ? `\n\n${candidate.jobPosition.summary || candidate.jobPosition.description}` : "")
    : "—";

  const overviewGrid = pdfKeyValueGrid([
    { label: copy.job, value: jobDisplayValue },
    { label: copy.contactEmailLabel, value: candidate.email?.trim() ?? "" },
    { label: copy.contactPhoneLabel, value: candidate.phone?.trim() ?? "" },
    { label: copy.matchScore, value: hasJdEvaluation && displayMatchScore != null ? `${displayMatchScore}%` : copy.jdMatchUnevaluated },
    { label: copy.connectionLabel, value: connectionLabel ?? "" },
    { label: copy.sourceLabel, value: sourceLabel ?? "" },
    { label: "LinkedIn", value: candidate.profileUrl?.trim() ?? "" },
    { label: copy.updated, value: formatLocaleDate(candidate.updatedAt, locale) },
  ]);
  if (overviewGrid) {
    content.push(pdfCard([overviewGrid]));
  }

  // —— Đánh giá JD ——
  if (aiEvaluation) {
    content.push(pdfSectionBanner(copy.aiEvaluationTitle));
    content.push(
      pdfCard(
        pdfJdEvaluationBlock(aiEvaluation, {
          matchScore: copy.matchScore,
          aiCriteria: copy.aiCriteria,
          aiBonusCriterion: copy.aiBonusCriterion,
          aiStrengths: copy.aiStrengths,
          aiConcerns: copy.aiConcerns,
          aiConclusion: copy.aiConclusion,
          locale,
        }),
      ),
    );
  }

  // —— Ghi chú HR ——
  const hasHr =
    candidate.recruiterNotes?.trim() ||
    candidate.email?.trim() ||
    candidate.phone?.trim();
  if (hasHr && candidate.recruiterNotes?.trim()) {
    content.push(pdfSectionBanner(copy.recruiterNotesTitle));
    content.push(
      pdfCard([
        {
          text: candidate.recruiterNotes.trim(),
          style: "body",
        },
      ]),
    );
  }

  // —— Tin nhắn LinkedIn ——
  if (hasChatContext || chatMessages.length > 0) {
    content.push(pdfSectionBanner(copy.chatTitle));
    if (chatMessages.length === 0) {
      content.push(pdfCard([{ text: copy.chatEmpty, style: "muted" }]));
    } else {
      const counts = countChatMessageDirections(chatMessages);
      content.push(
        pdfCard(
          pdfChatMessageThread(chatMessages, {
            locale,
            fromCandidate: copy.chatFromCandidate,
            fromMe: copy.chatFromMe,
            unknownSender: copy.chatUnknownSender,
            statsLine: formatChatStats(copy.chatStats, counts),
          }),
        ),
      );
    }
  }

  // —— Hồ sơ LinkedIn ——
  const hasProfile =
    (profileInfo.about && profileInfo.about !== "N/A") ||
    (profileInfo.experiences?.length ?? 0) > 0 ||
    (profileInfo.education?.length ?? 0) > 0 ||
    (profileInfo.skills?.length ?? 0) > 0 ||
    (profileInfo.projects?.length ?? 0) > 0 ||
    (profileInfo.languages?.length ?? 0) > 0 ||
    (profileInfo.recommendations?.length ?? 0) > 0;

  content.push(pdfSectionBanner(copy.profileSectionTitle));
  if (!hasProfile) {
    content.push(pdfCard([{ text: copy.noProfileData, style: "muted" }]));
  } else {
    const profileBlocks: Record<string, unknown>[] = [];
    const about =
      profileInfo.about && profileInfo.about !== "N/A" ? profileInfo.about.trim() : "";
    const aboutBlock = about ? pdfSubBlock(copy.about, about) : null;
    if (aboutBlock) profileBlocks.push(aboutBlock);
    for (const block of [
      pdfSubBlock(copy.experiences, profileInfo.experiences ?? []),
      pdfSubBlock(copy.education, profileInfo.education ?? []),
      pdfSubBlock(copy.skills, profileInfo.skills ?? []),
      pdfSubBlock(copy.projects, profileInfo.projects ?? []),
      pdfSubBlock(copy.languages, profileInfo.languages ?? []),
      pdfSubBlock(copy.recommendations, profileInfo.recommendations ?? []),
    ]) {
      if (block) profileBlocks.push(block);
    }
    content.push(pdfCard(profileBlocks.length > 0 ? profileBlocks : [{ text: copy.noProfileData, style: "muted" }]));
  }

  const matchSummary = candidate.matchSummary?.trim();
  if (matchSummary) {
    content.push(pdfSectionBanner(copy.searchMatchSummary));
    content.push(pdfCard([{ text: matchSummary, style: "body" }]));
  }

  const cvText = candidate.cvText?.trim();
  if (cvText || candidate.cvFileUrl) {
    content.push(pdfSectionBanner(copy.resumeTitle));
    const cvNodes: Record<string, unknown>[] = [];
    if (candidate.cvFileUrl) {
      cvNodes.push({ text: copy.resumeAttachedNote, style: "muted", margin: [0, 0, 0, 6] });
    }
    if (cvText) {
      cvNodes.push(...markdownToPdfmakeContent(cvText));
    }
    content.push(pdfCard(cvNodes));
  }

  return {
    content,
    styles: { ...PDF_DOC_STYLES, ...CV_MARKDOWN_PDF_STYLES },
    defaultStyle: { font: "Roboto" },
    pageMargins: [42, 52, 42, 58],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [42, 8, 42, 0],
      columns: [
        {
          text: `${copy.pdfGeneratedAt}: ${generatedAt}`,
          fontSize: 8,
          color: "#94a3b8",
        },
        {
          text: `${currentPage} / ${pageCount}`,
          alignment: "right",
          fontSize: 8,
          color: "#94a3b8",
        },
      ],
    }),
    info: {
      title: `${copy.title} — ${candidate.name}`,
      author: "VClaw Recruitment",
    },
  };
}

const C_MUTED = "#64748b";

export function buildCandidateDetailPdfLabels(
  detail: {
    title: string;
    matchScore: string;
    jdMatchUnevaluated: string;
    job: string;
    updated: string;
    exportPdfOverviewTitle: string;
    profileSectionTitle: string;
    noProfileData: string;
    searchMatchSummary: string;
    about: string;
    experiences: string;
    education: string;
    skills: string;
    projects: string;
    languages: string;
    recommendations: string;
    recruiterNotesTitle: string;
    contactEmailLabel: string;
    contactPhoneLabel: string;
    resumeTitle: string;
    exportPdfResumeAttached: string;
    aiEvaluationTitle: string;
    aiCriteria: string;
    aiBonusCriterion: string;
    aiStrengths: string;
    aiConcerns: string;
    aiConclusion: string;
    chatTitle: string;
    chatFromCandidate: string;
    chatFromMe: string;
    chatUnknownSender: string;
    chatEmpty: string;
    exportPdfChatStats: string;
    exportPdfLabelsTitle: string;
    exportPdfGeneratedAt: string;
    exportPdfConnectionLabel: string;
    exportPdfSourceLabel: string;
  },
): CandidateDetailPdfLabels {
  return {
    title: detail.title,
    matchScore: detail.matchScore,
    jdMatchUnevaluated: detail.jdMatchUnevaluated,
    job: detail.job,
    updated: detail.updated,
    overviewTitle: detail.exportPdfOverviewTitle,
    profileSectionTitle: detail.profileSectionTitle,
    noProfileData: detail.noProfileData,
    searchMatchSummary: detail.searchMatchSummary,
    about: detail.about,
    experiences: detail.experiences,
    education: detail.education,
    skills: detail.skills,
    projects: detail.projects,
    languages: detail.languages,
    recommendations: detail.recommendations,
    recruiterNotesTitle: detail.recruiterNotesTitle,
    contactEmailLabel: detail.contactEmailLabel,
    contactPhoneLabel: detail.contactPhoneLabel,
    resumeTitle: detail.resumeTitle,
    resumeAttachedNote: detail.exportPdfResumeAttached,
    aiEvaluationTitle: detail.aiEvaluationTitle,
    aiCriteria: detail.aiCriteria,
    aiBonusCriterion: detail.aiBonusCriterion,
    aiStrengths: detail.aiStrengths,
    aiConcerns: detail.aiConcerns,
    aiConclusion: detail.aiConclusion,
    chatTitle: detail.chatTitle,
    chatFromCandidate: detail.chatFromCandidate,
    chatFromMe: detail.chatFromMe,
    chatUnknownSender: detail.chatUnknownSender,
    chatEmpty: detail.chatEmpty,
    chatStats: detail.exportPdfChatStats,
    labelsTitle: detail.exportPdfLabelsTitle,
    pdfGeneratedAt: detail.exportPdfGeneratedAt,
    connectionLabel: detail.exportPdfConnectionLabel,
    sourceLabel: detail.exportPdfSourceLabel,
  };
}
