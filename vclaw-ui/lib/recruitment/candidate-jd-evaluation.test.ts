import { describe, expect, it } from "vitest";
import { parseCandidateJdEvaluation, parseStoredCandidateJdEvaluation } from "./candidate-jd-evaluation";

describe("parseCandidateJdEvaluation", () => {
  it("parse đánh giá đa tiêu chí", () => {
    const raw = JSON.stringify({
      overallScore: 82,
      criteria: [
        { key: "skills_fit", label: "Kỹ năng", score: 90, note: "Khớp React." },
      ],
      strengths: ["Kinh nghiệm SaaS"],
      concerns: ["Chưa rõ mức lương"],
      conclusion: "Nên mời phỏng vấn vòng 1.",
    });
    const ev = parseCandidateJdEvaluation(raw);
    expect(ev?.overallScore).toBe(82);
    expect(ev?.criteria).toHaveLength(1);
    expect(ev?.conclusion).toContain("phỏng vấn");
  });
});

describe("parseStoredCandidateJdEvaluation", () => {
  it("ưu tiên aiAnalysisSummary JSON", () => {
    const json = JSON.stringify({
      version: 1,
      overallScore: 70,
      criteria: [],
      strengths: [],
      concerns: [],
      conclusion: "Tạm phù hợp.",
    });
    const ev = parseStoredCandidateJdEvaluation(json, "cũ", 50);
    expect(ev?.overallScore).toBe(70);
  });
});
