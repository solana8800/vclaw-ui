import { describe, expect, it } from "vitest";

import {
  buildCandidateResumeFileName,
  slugifyCandidateName,
} from "@/lib/recruitment/candidate-name-slug";
import { buildCandidateProfileContext } from "@/lib/recruitment/candidate-profile-context";
import {
  CV_PROMPT_MAX_CHARS,
  hardTruncateForStorage,
  normalizeResumeMarkdown,
  prepareCvTextForPrompt,
} from "@/lib/recruitment/candidate-resume-text";

describe("slugifyCandidateName", () => {
  it("slugifies Vietnamese names", () => {
    expect(slugifyCandidateName("Nguyễn Văn An")).toBe("nguyen-van-an");
  });
});

describe("buildCandidateResumeFileName", () => {
  it("includes name slug and short id", () => {
    const name = buildCandidateResumeFileName("cmpa4r0nw0001wp9x7leoq1sv", "pdf", "Trần Thị B");
    expect(name).toMatch(/^cv-tran-thi-b-[a-z0-9]+\.pdf$/);
  });
});

describe("normalizeResumeMarkdown", () => {
  it("strips markdown images and collapses blank lines", () => {
    const raw = "Hello\n\n![pic](http://x/a.png)\n\n\nWorld";
    expect(normalizeResumeMarkdown(raw)).toBe("Hello\n\nWorld");
  });
});

describe("prepareCvTextForPrompt", () => {
  it("truncates long cv for JD prompt", () => {
    const long = "a".repeat(CV_PROMPT_MAX_CHARS + 100);
    const out = prepareCvTextForPrompt(long);
    expect(out.length).toBeLessThan(long.length);
    expect(out).toContain("đã rút gọn");
  });
});

describe("hardTruncateForStorage", () => {
  it("caps storage length", () => {
    const long = "x".repeat(20_000);
    expect(hardTruncateForStorage(long).length).toBeLessThanOrEqual(12_050);
  });
});

describe("buildCandidateProfileContext with cv", () => {
  it("includes CV block when cvText is set", () => {
    const ctx = buildCandidateProfileContext({
      name: "An",
      cvText: "## Kinh nghiệm\n- Dev 5 năm",
    });
    expect(ctx).toContain("=== CV / RESUME ===");
    expect(ctx).toContain("Dev 5 năm");
  });
});
