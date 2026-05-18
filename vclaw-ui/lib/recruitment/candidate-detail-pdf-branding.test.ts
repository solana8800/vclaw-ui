import { describe, expect, it } from "vitest";
import { applyVclawBrandingToPdfDocument } from "@/lib/recruitment/candidate-detail-pdf-branding";

const FAKE_LOGO = "data:image/png;base64,iVBORw0KGgo=";

describe("applyVclawBrandingToPdfDocument", () => {
  it("adds header logo and watermark layers", () => {
    const base = {
      content: [{ text: "Test" }],
      pageMargins: [42, 52, 42, 58],
    };
    const branded = applyVclawBrandingToPdfDocument(base, FAKE_LOGO);
    expect(branded.header).toBeTypeOf("function");
    expect(branded.background).toBeTypeOf("function");
    expect(branded.pageMargins).toEqual([42, 72, 42, 58]);

    const header = (branded.header as (p: number, c: number, s: { width: number; height: number }) => unknown)(
      1,
      1,
      { width: 595, height: 842 },
    );
    expect(JSON.stringify(header)).toContain(FAKE_LOGO);

    const bg = (branded.background as (p: number, s: { width: number; height: number }) => unknown[])(
      1,
      { width: 595, height: 842 },
    );
    const flat = JSON.stringify(bg);
    expect(flat).toContain("VClaw");
    expect(flat).toContain(FAKE_LOGO);
  });
});
