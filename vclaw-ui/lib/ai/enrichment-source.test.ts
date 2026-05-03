import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const enrichmentSource = readFileSync(join(process.cwd(), "lib", "ai", "enrichment.ts"), "utf8");

describe("enrichment source role boundaries", () => {
  it("keeps admin operations context out of customer-facing Zalo prompts", () => {
    expect(enrichmentSource).toContain("[VAI_TRÒ_TRẢ_LỜI]");
    expect(enrichmentSource).toContain("source === \"admin\"");
    expect(enrichmentSource).toContain("[TÌNH_HÌNH_KINH_DOANH_HIỆN_TẠI]");
  });
});
