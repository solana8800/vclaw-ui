import { describe, expect, it } from "vitest";

import {
  canScoreCandidateWithJd,
  hasLinkedInProfileData,
  resolveCandidateLinkedInActionAvailability,
  resolveLinkedInProfileBadgeStatus,
  shouldShowCandidateLinkedInProfileSection,
} from "@/lib/recruitment/candidate-jd-eligibility";

describe("candidate-jd-eligibility", () => {
  it("detects scraped LinkedIn profile", () => {
    const info = JSON.stringify({
      experiences: ["Dev tại ABC"],
      scrapedAt: "2026-01-01",
    });
    expect(hasLinkedInProfileData(info)).toBe(true);
    expect(
      resolveLinkedInProfileBadgeStatus("https://www.linkedin.com/in/test", info),
    ).toBe("scraped");
  });

  it("url only when no extracted content", () => {
    expect(
      resolveLinkedInProfileBadgeStatus("https://www.linkedin.com/in/test", null),
    ).toBe("url_only");
  });

  it("can score with resume only", () => {
    expect(
      canScoreCandidateWithJd({
        profileUrl: "https://www.linkedin.com/in/x",
        cvText: "Senior engineer",
      }),
    ).toBe(true);
  });

  it("cannot score without profile or cv", () => {
    expect(
      canScoreCandidateWithJd({
        profileUrl: "https://www.linkedin.com/in/x",
      }),
    ).toBe(false);
  });

  it("hides LinkedIn profile section for CV-only candidates without LinkedIn URL", () => {
    expect(
      shouldShowCandidateLinkedInProfileSection({
        profileUrl: null,
        linkedinProfileIdUrl: null,
        extractedInfo: null,
      }),
    ).toBe(false);
  });

  it("shows LinkedIn profile section when a profile URL is attached", () => {
    expect(
      shouldShowCandidateLinkedInProfileSection({
        profileUrl: "https://www.linkedin.com/in/nguyen-van-a",
        linkedinProfileIdUrl: null,
        extractedInfo: null,
      }),
    ).toBe(true);
  });

  it("keeps LinkedIn actions visible but disabled for CV-only candidates", () => {
    expect(
      resolveCandidateLinkedInActionAvailability({
        profileUrl: null,
        linkedinProfileIdUrl: null,
        linkedinChatId: null,
      }),
    ).toEqual({
      canOpenProfile: false,
      canRefreshProfile: false,
      canViewMessages: false,
    });
  });

  it("enables LinkedIn actions after a profile URL is attached", () => {
    expect(
      resolveCandidateLinkedInActionAvailability({
        profileUrl: "https://www.linkedin.com/in/nguyen-van-a",
        linkedinProfileIdUrl: null,
        linkedinChatId: null,
      }),
    ).toEqual({
      canOpenProfile: true,
      canRefreshProfile: true,
      canViewMessages: true,
    });
  });
});
