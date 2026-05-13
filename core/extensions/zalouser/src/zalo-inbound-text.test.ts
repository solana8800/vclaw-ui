import { describe, expect, it } from "vitest";
import { normalizeZaloInboundTextContent } from "./zalo-inbound-text.js";

describe("normalizeZaloInboundTextContent", () => {
  it("giữ nguyên chuỗi thường", () => {
    expect(normalizeZaloInboundTextContent("  hello  ")).toBe("  hello  ");
  });

  it("gộp title/description/href card OA", () => {
    expect(
      normalizeZaloInboundTextContent({
        title: "Biến động số dư",
        description: "+100.000đ",
        href: "https://example.com",
      }),
    ).toBe("Biến động số dư\n+100.000đ\nhttps://example.com");
  });

  it("đọc mảng block text (kiểu rich payload)", () => {
    expect(
      normalizeZaloInboundTextContent([
        { type: "text", text: "Dòng 1" },
        { text: "Dòng 2" },
      ]),
    ).toBe("Dòng 1\nDòng 2");
  });

  it("đào params lồng nhau", () => {
    expect(
      normalizeZaloInboundTextContent({
        params: { title: "A", message: "B" },
      }),
    ).toBe("A\nB");
  });
});
