import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { labelsToJson } from "@/lib/recruitment/candidate-profile";
import {
  hasJdEvaluation,
  inferCandidateStatusFromMatchScore,
  resolveCandidateStatusAfterScoring,
} from "@/lib/recruitment/candidate-status";
import {
  linxaChatStorageKey,
  profileUrlStorageKey,
  resolveStoredProfileUrl,
} from "@/lib/recruitment/candidate-profile-key";
import type { SaveCandidateInput } from "@/lib/recruitment/candidate-types";

type ExistingCandidate = {
  id: string;
  status: string;
  matchScore: number | null;
  aiAnalysisSummary: string | null;
  profileUrl: string | null;
  linxaChatId: string | null;
};

async function findExistingCandidate(
  storedUrl: string,
  linxaChatId?: string | null,
  linkedinProfileIdUrl?: string | null,
): Promise<ExistingCandidate | null> {
  const direct = await prisma.candidate.findUnique({
    where: { profileUrl: storedUrl },
    select: {
      id: true,
      status: true,
      matchScore: true,
      aiAnalysisSummary: true,
      profileUrl: true,
      linxaChatId: true,
    },
  });
  if (direct) return direct;

  // Tìm theo linkedinProfileIdUrl — chấp nhận cả relative (/in/ACoAAC...) lẫn absolute (https://...)
  if (linkedinProfileIdUrl?.trim()) {
    const idFull = linkedinProfileIdUrl.trim();
    // Sinh cả phiên bản absolute và relative để xử lý data cũ lưu sai format
    const idAlt = idFull.startsWith("http")
      ? idFull.replace(/^https?:\/\/www\.linkedin\.com/i, "")  // absolute → relative
      : `https://www.linkedin.com${idFull.startsWith("/") ? idFull : "/in/" + idFull}`;  // relative → absolute
    const byIdUrl = await prisma.candidate.findFirst({
      where: {
        OR: [
          { linkedinProfileIdUrl: idFull },
          { linkedinProfileIdUrl: idAlt },
          { profileUrl: idFull },
          { profileUrl: idAlt },
        ],
      },
      select: {
        id: true,
        status: true,
        matchScore: true,
        aiAnalysisSummary: true,
        profileUrl: true,
        linxaChatId: true,
      },
    });
    if (byIdUrl) return byIdUrl;
  }

  if (linxaChatId?.trim()) {
    const linxaUrl = resolveStoredProfileUrl("linxa://placeholder", linxaChatId);
    const byLinxaUrl = await prisma.candidate.findUnique({
      where: { profileUrl: linxaUrl },
      select: {
        id: true,
        status: true,
        matchScore: true,
        aiAnalysisSummary: true,
        profileUrl: true,
        linxaChatId: true,
      },
    });
    if (byLinxaUrl) return byLinxaUrl;

    const byChat = await prisma.candidate.findFirst({
      where: { linxaChatId: linxaChatId.trim() },
      select: {
        id: true,
        status: true,
        matchScore: true,
        aiAnalysisSummary: true,
        profileUrl: true,
        linxaChatId: true,
      },
    });
    if (byChat) return byChat;
  }

  const incomingKey = profileUrlStorageKey(storedUrl);
  if (incomingKey?.startsWith("linkedin:in:")) {
    const slug = incomingKey.slice("linkedin:in:".length);
    const rows = await prisma.candidate.findMany({
      where: { profileUrl: { contains: `/in/${slug}` } },
      take: 8,
      select: {
        id: true,
        status: true,
        matchScore: true,
        aiAnalysisSummary: true,
        profileUrl: true,
        linxaChatId: true,
      },
    });
    const match = rows.find((r) => profileUrlStorageKey(r.profileUrl ?? "") === incomingKey);
    if (match) return match;
  }

  if (linxaChatId?.trim()) {
    const chatKey = linxaChatStorageKey(linxaChatId);
    const rows = await prisma.candidate.findMany({
      where: { profileUrl: { startsWith: "linxa://chat/" } },
      take: 50,
      select: {
        id: true,
        status: true,
        matchScore: true,
        aiAnalysisSummary: true,
        profileUrl: true,
        linxaChatId: true,
      },
    });
    const match = rows.find(
      (r) =>
        (r.linxaChatId && linxaChatStorageKey(r.linxaChatId) === chatKey) ||
        profileUrlStorageKey(r.profileUrl ?? "") === chatKey,
    );
    if (match) return match;
  }

  return null;
}

/** Upsert ứng viên — khóa canonical LinkedIn / Linxa chat (tránh trùng). */
export async function upsertCandidateRecord(data: SaveCandidateInput) {
  const labelsJson = labelsToJson(data.labels);
  const storedUrl = resolveStoredProfileUrl(data.profileUrl, data.linxaChatId);
  const existing = await findExistingCandidate(storedUrl, data.linxaChatId, data.linkedinProfileIdUrl);

  const mergedAiSummary =
    data.aiAnalysisSummary ?? existing?.aiAnalysisSummary ?? null;
  const scoreForStatus = hasJdEvaluation(mergedAiSummary)
    ? (data.matchScore ?? existing?.matchScore ?? null)
    : hasJdEvaluation(existing?.aiAnalysisSummary)
      ? (existing?.matchScore ?? null)
      : null;

  const status = existing
    ? resolveCandidateStatusAfterScoring(
        existing.status,
        scoreForStatus,
        mergedAiSummary,
      )
    : inferCandidateStatusFromMatchScore(scoreForStatus, {
        hasJdEvaluation: hasJdEvaluation(mergedAiSummary),
      });

  const profileUrlToSave =
    storedUrl.includes("linkedin.com/in/") || storedUrl.includes("linkedin.com/profile/")
      ? storedUrl
      : (existing?.profileUrl ?? storedUrl);

  const payload = {
    name: data.name,
    headline: data.headline,
    location: data.location,
    jobPositionId: data.jobPositionId || undefined,
    workspaceId: data.workspaceId || undefined,
    extractedInfo: data.extractedInfo,
    githubUrl: data.githubUrl,
    portfolioUrl: data.portfolioUrl,
    currentCompany: data.currentCompany,
    linkedinConnectionStatus: data.linkedinConnectionStatus,
    matchScore: data.matchScore ?? undefined,
    matchSummary: data.matchSummary ?? undefined,
    aiAnalysisSummary: data.aiAnalysisSummary ?? undefined,
    chatInfo: data.chatInfo ?? undefined,
    conversationHistory: data.conversationHistory ?? undefined,
    source: data.source,
    linxaChatId: data.linxaChatId ?? existing?.linxaChatId ?? undefined,
    linkedinProfileIdUrl: data.linkedinProfileIdUrl ?? undefined,
    sentiment: data.sentiment,
    labels: labelsJson,
    status,
    profileUrl: profileUrlToSave,
  };

  if (existing) {
    return prisma.candidate.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.candidate.create({
    data: {
      ...payload,
      headline: data.headline ?? null,
      location: data.location ?? null,
      jobPositionId: data.jobPositionId ?? null,
      workspaceId: data.workspaceId ?? null,
      extractedInfo: data.extractedInfo ?? null,
      githubUrl: data.githubUrl ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      currentCompany: data.currentCompany ?? null,
      linkedinConnectionStatus: data.linkedinConnectionStatus ?? null,
      matchScore: data.matchScore ?? null,
      matchSummary: data.matchSummary ?? null,
      aiAnalysisSummary: data.aiAnalysisSummary ?? null,
      chatInfo: data.chatInfo ?? null,
      conversationHistory: data.conversationHistory ?? null,
      source: data.source ?? null,
      linxaChatId: data.linxaChatId ?? null,
      sentiment: data.sentiment ?? null,
    },
  });
}

export function revalidateCandidatesPage() {
  revalidatePath("/[locale]/admin/recruitment/candidates", "page");
  revalidatePath("/[locale]/admin/recruitment", "page");
}
