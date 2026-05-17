import { describe, expect, it } from "vitest";
import {
  normalizeCandidateJdEvaluation,
  parseCandidateJdEvaluation,
  parseStoredCandidateJdEvaluation,
  resolveCandidateDisplayMatchScore,
} from "./candidate-jd-evaluation";

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
    expect(ev?.overallScore).toBe(90);
    expect(ev?.criteria).toHaveLength(1);
    expect(ev?.conclusion).toContain("phỏng vấn");
  });
});

describe("normalizeCandidateJdEvaluation", () => {
  it("đưa location_fit xuống cuối và không tính vào overall", () => {
    const raw = JSON.stringify({
      overallScore: 90,
      criteria: [
        { key: "location_fit", label: "Khu vực", score: 95, note: "Cùng TP." },
        { key: "skills_fit", label: "Kỹ năng", score: 40, note: "Thiếu stack." },
        { key: "experience_fit", label: "KN", score: 35, note: "Ít năm." },
        { key: "education_fit", label: "HV", score: 50, note: "OK." },
        { key: "projects_impact", label: "DA", score: 30, note: "Ít." },
        { key: "languages_soft", label: "NN", score: 45, note: "EN B1." },
      ],
      strengths: [],
      concerns: [],
      conclusion: "Chưa phù hợp.",
    });
    const ev = parseCandidateJdEvaluation(raw);
    expect(ev?.criteria.at(-1)?.key).toBe("location_fit");
    expect(ev?.overallScore).toBe(39);
    expect(ev?.criteria.at(-1)?.score).toBeLessThanOrEqual(39);
    expect(ev?.criteria.find((c) => c.key === "languages_soft")?.score).toBeLessThanOrEqual(39);
  });

  it("overall = TB 4 tiêu chí cốt lõi khi fit tốt", () => {
    const ev = normalizeCandidateJdEvaluation({
      version: 1,
      overallScore: 99,
      criteria: [
        { key: "skills_fit", label: "Kỹ năng", score: 80, note: "OK" },
        { key: "experience_fit", label: "KN", score: 70, note: "OK" },
        { key: "education_fit", label: "HV", score: 60, note: "OK" },
        { key: "projects_impact", label: "DA", score: 70, note: "OK" },
        { key: "languages_soft", label: "NN", score: 80, note: "OK" },
        { key: "location_fit", label: "Khu vực", score: 100, note: "Gần" },
      ],
      strengths: [],
      concerns: [],
      conclusion: "Phù hợp.",
    });
    expect(ev.overallScore).toBe(70);
    expect(ev.criteria.at(-1)?.key).toBe("location_fit");
    expect(ev.criteria.find((c) => c.key === "languages_soft")?.score).toBe(80);
  });

  it("bonus thấp khi cốt lõi sai nghề dù ngôn ngữ/khu vực tốt", () => {
    const ev = normalizeCandidateJdEvaluation({
      version: 1,
      overallScore: 85,
      criteria: [
        { key: "skills_fit", label: "Kỹ năng", score: 10, note: "Không IT." },
        { key: "experience_fit", label: "KN", score: 15, note: "Vận động viên." },
        { key: "education_fit", label: "HV", score: 20, note: "Thể thao." },
        { key: "projects_impact", label: "DA", score: 10, note: "Không liên quan." },
        { key: "languages_soft", label: "NN", score: 90, note: "Tiếng Anh tốt." },
        { key: "location_fit", label: "KV", score: 95, note: "Cùng thành phố." },
      ],
      strengths: [],
      concerns: [],
      conclusion: "Không phù hợp.",
    });
    expect(ev.overallScore).toBe(14);
    expect(ev.criteria.find((c) => c.key === "location_fit")?.score).toBeLessThanOrEqual(15);
    expect(ev.criteria.find((c) => c.key === "languages_soft")?.score).toBeLessThanOrEqual(15);
  });
});

describe("parseStoredCandidateJdEvaluation", () => {
  it("đọc plain text cũ trong aiAnalysisSummary", () => {
    const ev = parseStoredCandidateJdEvaluation(
      "Ứng viên phù hợp về kỹ năng React, cần hỏi thêm kinh nghiệm lead.",
      null,
      68,
    );
    expect(ev?.conclusion).toContain("React");
    expect(ev?.overallScore).toBe(68);
  });

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

  it("resolveCandidateDisplayMatchScore ưu tiên overall từ JSON JD", () => {
    const json = JSON.stringify({
      version: 1,
      overallScore: 8,
      criteria: [
        { key: "skills_fit", label: "Kỹ năng", score: 10, note: "yếu" },
        { key: "experience_fit", label: "KN", score: 8, note: "yếu" },
        { key: "education_fit", label: "HV", score: 30, note: "khác ngành" },
        { key: "projects_impact", label: "DA", score: 5, note: "yếu" },
      ],
      strengths: [],
      concerns: [],
      conclusion: "Không phù hợp.",
    });
    expect(resolveCandidateDisplayMatchScore(20, json)).toBe(13);
    expect(resolveCandidateDisplayMatchScore(20, null)).toBe(20);
  });
});
