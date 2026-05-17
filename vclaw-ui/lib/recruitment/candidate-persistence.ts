import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { labelsToJson } from "@/lib/recruitment/candidate-profile";
import type { SaveCandidateInput } from "@/lib/recruitment/candidate-types";

/** Upsert ứng viên theo profileUrl — dùng chung search-save và Linxa sync. */
export async function upsertCandidateRecord(data: SaveCandidateInput) {
  const labelsJson = labelsToJson(data.labels);
  return prisma.candidate.upsert({
    where: { profileUrl: data.profileUrl },
    update: {
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
      source: data.source,
      linxaChatId: data.linxaChatId,
      sentiment: data.sentiment,
      labels: labelsJson,
    },
    create: {
      name: data.name,
      headline: data.headline ?? null,
      profileUrl: data.profileUrl,
      location: data.location ?? null,
      jobPositionId: data.jobPositionId ?? null,
      workspaceId: data.workspaceId ?? null,
      status: "POTENTIAL",
      extractedInfo: data.extractedInfo,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      currentCompany: data.currentCompany,
      linkedinConnectionStatus: data.linkedinConnectionStatus ?? null,
      matchScore: data.matchScore ?? null,
      matchSummary: data.matchSummary ?? null,
      aiAnalysisSummary: data.aiAnalysisSummary ?? null,
      source: data.source ?? null,
      linxaChatId: data.linxaChatId ?? null,
      sentiment: data.sentiment ?? null,
      labels: labelsJson,
    },
  });
}

export function revalidateCandidatesPage() {
  revalidatePath("/[locale]/admin/recruitment/candidates", "page");
  revalidatePath("/[locale]/admin/recruitment", "page");
}
