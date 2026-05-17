import { describe, expect, it } from "vitest";
import {
  buildLinkedInSearchQueryFromJob,
  parseLinkedInSearchQueryResponse,
  sanitizeLinkedInSearchQuery,
} from "./candidate-search-query";

describe("sanitizeLinkedInSearchQuery", () => {
  it("cắt câu dài còn từ khóa ngắn", () => {
    const q = sanitizeLinkedInSearchQuery(
      "Chúng tôi cần tuyển Senior React Developer có kinh nghiệm React TypeScript Node.js làm việc tại Hồ Chí Minh Việt Nam full-time",
    );
    const words = q.split(" ");
    expect(words.length).toBeLessThanOrEqual(8);
    expect(q.length).toBeLessThanOrEqual(72);
  });

  it("parse JSON query từ AI", () => {
    expect(
      parseLinkedInSearchQueryResponse('{"query":"Senior React Developer Vietnam"}'),
    ).toBe("Senior React Developer Vietnam");
  });
});

describe("buildLinkedInSearchQueryFromJob", () => {
  it("fallback ngắn: title + skill + location", () => {
    const q = buildLinkedInSearchQueryFromJob(
      {
        title: "Senior React Developer",
        requirements: "React TypeScript Node.js 5 năm kinh nghiệm",
        workMode: "HYBRID",
      },
      "vi",
    );
    expect(q).toContain("Senior React Developer");
    expect(q.split(" ").length).toBeLessThanOrEqual(8);
    expect(q).toMatch(/Việt Nam|Vietnam/i);
  });

  it("dùng description khi không có requirements", () => {
    const q = buildLinkedInSearchQueryFromJob(
      { title: "Product Manager", description: "Agile B2B SaaS" },
      "en",
    );
    expect(q).toContain("Product Manager");
    expect(q.split(" ").length).toBeLessThanOrEqual(8);
  });
});
