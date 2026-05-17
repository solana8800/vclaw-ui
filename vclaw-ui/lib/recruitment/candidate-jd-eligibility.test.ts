import { describe, expect, it } from "vitest";

import {
  canScoreCandidateWithJd,
  hasLinkedInProfileData,
  resolveLinkedInProfileBadgeStatus,
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
});
