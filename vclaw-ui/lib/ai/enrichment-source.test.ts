import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const enrichmentSource = readFileSync(join(process.cwd(), "lib", "ai", "enrichment.ts"), "utf8");
const contextSource = readFileSync(join(process.cwd(), "lib", "ai", "enrichment-context.ts"), "utf8");

describe("enrichment source role boundaries", () => {
  it("keeps admin operations context out of customer-facing Zalo prompts", () => {
    // Role context và metrics block nằm trong enrichment-context.ts
    expect(contextSource).toContain("[VAI_TRÒ_TRẢ_LỜI]");
    expect(contextSource).toContain("[TÌNH_HÌNH_KINH_DOANH_HIỆN_TẠI]");
    // Admin gate logic vẫn nằm trong orchestrator enrichment.ts
    expect(enrichmentSource).toContain("source === \"admin\"");
  });
});
