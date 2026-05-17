import { describe, expect, it } from "vitest";

import { detectAdminIndustryFromPath } from "@/lib/admin/detect-industry";

describe("detectAdminIndustryFromPath", () => {
  it("detects recruitment module paths", () => {
    expect(detectAdminIndustryFromPath("/vi/admin/recruitment")).toBe("HEAD_HUNTER");
    expect(detectAdminIndustryFromPath("/en/admin/recruitment/candidates")).toBe("HEAD_HUNTER");
    expect(detectAdminIndustryFromPath("/vi/admin/recruitment/settings")).toBe("HEAD_HUNTER");
  });

  it("detects retail settings without matching recruitment settings", () => {
    expect(detectAdminIndustryFromPath("/vi/admin/settings")).toBe("RETAIL");
    expect(detectAdminIndustryFromPath("/en/admin/settings/")).toBe("RETAIL");
  });

  it("detects retail overview", () => {
    expect(detectAdminIndustryFromPath("/vi/admin")).toBe("RETAIL");
    expect(detectAdminIndustryFromPath("/vi/admin/")).toBe("RETAIL");
  });
});
