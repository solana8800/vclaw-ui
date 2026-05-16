import { describe, expect, it } from "vitest";
import {
  jobRecordToLinkedInFacts,
  sanitizeLinkedInPostCopy,
  stripAiWrappers,
  validateLinkedInJobCopy,
} from "@/lib/recruitment/linkedin-job-copy";
import { buildLinkedInJobPostPrompt } from "@/lib/ai/prompts/recruitment-prompts";

describe("validateLinkedInJobCopy", () => {
  const valid =
    "Chúng tôi đang tìm Senior React Developer có kinh nghiệm xây dựng sản phẩm web quy mô lớn. " +
    "Bạn sẽ làm việc với team sản phẩm, triển khai giao diện Next.js và tối ưu hiệu năng. " +
    "Ứng viên quan tâm vui lòng gửi hồ sơ qua LinkedIn.";

  it("chấp nhận mô tả marketing hợp lệ", () => {
    expect(validateLinkedInJobCopy(valid).ok).toBe(true);
  });

  it("từ chối cụm demo/test", () => {
    expect(validateLinkedInJobCopy(`${valid} Đây là bản demo.`).ok).toBe(false);
    expect(validateLinkedInJobCopy(`${valid} Vị trí test tuyển dụng.`).ok).toBe(false);
  });

  it("từ chối mô tả quá ngắn", () => {
    expect(validateLinkedInJobCopy("Ngắn quá").ok).toBe(false);
  });
});

describe("stripAiWrappers", () => {
  it("bỏ code fence", () => {
    expect(stripAiWrappers("```\nXin chào\n```")).toBe("Xin chào");
  });
});

describe("sanitizeLinkedInPostCopy", () => {
  it("gỡ dòng disclaimer meta", () => {
    const raw =
      "**[Lưu ý: Bạn đang đọc bài đăng tuyển dụng thật của VClaw AI]**\n\n" +
      "Chúng tôi cần Senior Developer có kinh nghiệm React. Ứng viên gửi CV qua LinkedIn.";
    const out = sanitizeLinkedInPostCopy(raw);
    expect(out).not.toMatch(/lưu ý|bài đăng tuyển dụng thật/i);
    expect(out).toContain("Senior Developer");
  });
});

describe("buildLinkedInJobPostPrompt", () => {
  it("nhúng đủ thuộc tính vị trí, không gửi mô tả cũ", () => {
    const facts = jobRecordToLinkedInFacts(
      {
        title: "Backend Go",
        description: "Mô tả cũ không được gửi cho AI",
        requirements: "5 năm Go",
        companyInfo: "Công ty fintech",
        contractType: "FULL_TIME",
        workMode: "HYBRID",
        benefits: "BHXH đầy đủ",
      },
      "Hà Nội",
    );
    const promptVi = buildLinkedInJobPostPrompt(facts, { variationSeed: "abc", locale: "vi" });
    expect(promptVi).toContain("Backend Go");
    expect(promptVi).toContain("Toàn thời gian");
    expect(promptVi).toContain("[DỮ_LIỆU_VỊ_TRÍ]");
    expect(promptVi).toContain("tiếng Việt");
    expect(promptVi).not.toContain("Mô tả cũ không được gửi cho AI");

    const promptEn = buildLinkedInJobPostPrompt(facts, { variationSeed: "abc", locale: "en" });
    expect(promptEn).toContain("[POSITION_DATA]");
    expect(promptEn).toContain("Full-time");
    expect(promptEn).toContain("Write the entire post in English");
    expect(promptEn).not.toContain("tiếng Việt");
  });
});
