import { describe, expect, it } from "vitest";

import { resolveJobPositionCompanyLabel } from "@/lib/recruitment/job-position-company";

describe("resolveJobPositionCompanyLabel", () => {
  it("uses first line of companyInfo", () => {
    expect(
      resolveJobPositionCompanyLabel({
        companyInfo: "Công ty: Viettel Digital\nQuy mô 500+",
      }),
    ).toBe("Viettel Digital");
  });

  it("falls back to LinkedIn company slug", () => {
    expect(
      resolveJobPositionCompanyLabel({
        companyUrl: "https://www.linkedin.com/company/viettel-digital/",
      }),
    ).toBe("Viettel Digital");
  });

  it("returns null when no data", () => {
    expect(resolveJobPositionCompanyLabel({})).toBeNull();
  });
});
