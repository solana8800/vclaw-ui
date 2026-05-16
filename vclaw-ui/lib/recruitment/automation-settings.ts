import type { RecruitmentSettings } from "@prisma/client";

export type RecruitmentAutomationFlags = {
  autoInviteOnMatch: boolean;
  autoIntroOnAccept: boolean;
  autoCollectOnPositive: boolean;
  autoRemindInterview: boolean;
};

export const DEFAULT_RECRUITMENT_AUTOMATION: RecruitmentAutomationFlags = {
  autoInviteOnMatch: false,
  autoIntroOnAccept: false,
  autoCollectOnPositive: false,
  autoRemindInterview: false,
};

export function parseRecruitmentAutomation(
  settings: RecruitmentSettings | null | undefined,
): RecruitmentAutomationFlags {
  if (!settings) return { ...DEFAULT_RECRUITMENT_AUTOMATION };
  return {
    autoInviteOnMatch: settings.autoInviteOnMatch,
    autoIntroOnAccept: settings.autoIntroOnAccept,
    autoCollectOnPositive: settings.autoCollectOnPositive,
    autoRemindInterview: settings.autoRemindInterview,
  };
}
