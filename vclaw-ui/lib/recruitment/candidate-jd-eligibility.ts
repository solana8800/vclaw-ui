import {
  hasExtractedProfileContent,
  parseExtractedProfileInfo,
} from "@/lib/recruitment/candidate-profile";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";

export type LinkedInProfileBadgeStatus = "none" | "url_only" | "scraped";

export type CandidateJdSourceInput = {
  profileUrl?: string | null;
  extractedInfo?: string | null;
  cvText?: string | null;
  cvFileUrl?: string | null;
};

export function hasCandidateResume(
  cvText?: string | null,
  cvFileUrl?: string | null,
): boolean {
  return Boolean(cvText?.trim() || cvFileUrl?.trim());
}

export function hasLinkedInProfileData(extractedInfo?: string | null): boolean {
  return hasExtractedProfileContent(parseExtractedProfileInfo(extractedInfo));
}

export function resolveLinkedInProfileBadgeStatus(
  profileUrl?: string | null,
  extractedInfo?: string | null,
): LinkedInProfileBadgeStatus {
  if (!isLinkedInProfileUrl(profileUrl)) return "none";
  if (hasLinkedInProfileData(extractedInfo)) return "scraped";
  return "url_only";
}

/** Đủ hồ sơ để Chấm JD: đã scrape LinkedIn hoặc đã upload CV. */
export function canScoreCandidateWithJd(input: CandidateJdSourceInput): boolean {
  return hasLinkedInProfileData(input.extractedInfo) || hasCandidateResume(input.cvText, input.cvFileUrl);
}

export function jdScoringMissingProfileMessage(): string {
  return "Cần profile LinkedIn (đã scrape) hoặc CV đã tải lên trước khi Chấm JD.";
}
