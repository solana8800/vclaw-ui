import { describe, expect, it } from "vitest";
import {
  markdownToPdfmakeContent,
  parseMarkdownInline,
} from "@/lib/recruitment/markdown-to-pdfmake";

describe("parseMarkdownInline", () => {
  it("parses bold segments", () => {
    const out = parseMarkdownInline("Hello **world**!");
    expect(out).toEqual([
      { text: "Hello " },
      { text: "world", bold: true },
      { text: "!" },
    ]);
  });
});

describe("markdownToPdfmakeContent", () => {
  it("renders headings and bullet lists", () => {
    const nodes = markdownToPdfmakeContent(`## Kinh nghiệm

- **Công ty A** — Dev
- Công ty B

Đoạn mô tả ngắn.`);

    const flat = JSON.stringify(nodes);
    expect(flat).toContain("cvH2");
    expect(flat).toContain("Kinh nghiệm");
    expect(flat).toContain("bold");
    expect(flat).toContain("Công ty A");
    expect(flat).toContain("cvBullet");
    expect(flat).toContain("Đoạn mô tả");
  });
});
