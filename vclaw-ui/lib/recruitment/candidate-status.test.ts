import { describe, expect, it } from "vitest";
import {
  inferCandidateStatusFromMatchScore,
  resolveCandidatePipelineDisplayKey,
  resolveCandidateStatusAfterScoring,
} from "./candidate-status";

const JD_JSON = JSON.stringify({ version: 1, overallScore: 30, criteria: [], strengths: [], concerns: [], conclusion: "x" });

describe("candidate-status", () => {
  it("chỉ suy REJECTED khi đã có đánh giá JD", () => {
    expect(inferCandidateStatusFromMatchScore(30)).toBe("POTENTIAL");
    expect(inferCandidateStatusFromMatchScore(30, { hasJdEvaluation: true })).toBe("REJECTED");
    expect(inferCandidateStatusFromMatchScore(80, { hasJdEvaluation: true })).toBe("SCREENING");
  });

  it("không ghi đè CONTACTED khi rescoring", () => {
    expect(resolveCandidateStatusAfterScoring("CONTACTED", 90, JD_JSON)).toBe("CONTACTED");
    expect(resolveCandidateStatusAfterScoring("POTENTIAL", 30, JD_JSON)).toBe("REJECTED");
    expect(resolveCandidateStatusAfterScoring("POTENTIAL", 30, null)).toBe("POTENTIAL");
  });

  it("hiển thị Chưa đánh giá JD khi chưa có JSON AI", () => {
    expect(resolveCandidatePipelineDisplayKey("POTENTIAL", 25, null)).toBe("UNSCORED");
    expect(resolveCandidatePipelineDisplayKey("POTENTIAL", 25, JD_JSON)).toBe("REJECTED");
  });
});
