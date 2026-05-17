import { describe, expect, it } from "vitest";

import { htmlToPlainText, normalizePublicJdUrl } from "@/lib/recruitment/jd-public-url-fetch";
import { parseJobPositionImportDraft } from "@/lib/recruitment/jd-public-url-import";

describe("normalizePublicJdUrl", () => {
  it("adds https when missing", () => {
    const r = normalizePublicJdUrl("example.com/jobs/1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://example.com/jobs/1");
  });

  it("rejects empty", () => {
    expect(normalizePublicJdUrl("").ok).toBe(false);
  });
});

describe("htmlToPlainText", () => {
  it("strips tags", () => {
    const out = htmlToPlainText("<p>Hello <b>world</b></p>");
    expect(out).toContain("Hello");
    expect(out).toContain("world");
    expect(out).not.toContain("<");
  });
});

describe("parseJobPositionImportDraft", () => {
  it("parses fenced JSON", () => {
    const raw = `\`\`\`json
{"title":"Senior Dev","requirements":"5+ years","contractType":"FULL_TIME","workMode":"HYBRID","headcount":2}
\`\`\``;
    const d = parseJobPositionImportDraft(raw);
    expect(d?.title).toBe("Senior Dev");
    expect(d?.contractType).toBe("FULL_TIME");
    expect(d?.workMode).toBe("HYBRID");
    expect(d?.headcount).toBe(2);
  });
});
