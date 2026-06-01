"use server";

import type { RecruitmentSettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type RecruitmentSettingsInput = {
  linkedinCompanyUrl?: string | null;
  autoInviteOnMatch?: boolean;
  autoIntroOnAccept?: boolean;
  autoCollectOnPositive?: boolean;
  autoRemindInterview?: boolean;
};

const RECRUITMENT_PATHS = [
  "/vi/admin/recruitment",
  "/en/admin/recruitment",
  "/vi/admin/recruitment/settings",
  "/en/admin/recruitment/settings",
  "/vi/admin/recruitment/jobs",
  "/en/admin/recruitment/jobs",
  "/vi/admin/recruitment/candidates",
  "/en/admin/recruitment/candidates",
];

function revalidateRecruitmentPaths() {
  try {
    for (const p of RECRUITMENT_PATHS) {
      revalidatePath(p);
    }
  } catch {
    // Chạy ngoài request context — bỏ qua
  }
}

export async function getRecruitmentSettings(): Promise<RecruitmentSettings | null> {
  return prisma.recruitmentSettings.findUnique({ where: { id: "default" } });
}

export async function upsertRecruitmentSettings(data: RecruitmentSettingsInput) {
  const cleanData: Record<string, string | null | boolean> = {};
  for (const key of ["linkedinCompanyUrl"] as const) {
    if (data[key] !== undefined) {
      cleanData[key] = data[key];
    }
  }
  for (const key of [
    "autoInviteOnMatch",
    "autoIntroOnAccept",
    "autoCollectOnPositive",
    "autoRemindInterview",
  ] as const) {
    if (data[key] !== undefined) {
      cleanData[key] = data[key];
    }
  }

  await prisma.recruitmentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      linkedinCompanyUrl: data.linkedinCompanyUrl ?? null,
      autoInviteOnMatch: data.autoInviteOnMatch ?? false,
      autoIntroOnAccept: data.autoIntroOnAccept ?? false,
      autoCollectOnPositive: data.autoCollectOnPositive ?? false,
      autoRemindInterview: data.autoRemindInterview ?? false,
    },
    update: cleanData,
  });

  revalidateRecruitmentPaths();
  return { success: true as const };
}
