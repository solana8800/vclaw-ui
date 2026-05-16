import { describe, expect, it } from "vitest";
import { resolveLinkedInCompanyUrl } from "./company-url";

describe("resolveLinkedInCompanyUrl", () => {
  it("ưu tiên URL từ RecruitmentSettings", () => {
    expect(
      resolveLinkedInCompanyUrl(
        "https://www.linkedin.com/company/117543969",
        "https://www.linkedin.com/company/vclaw-ai",
      ),
    ).toBe("https://www.linkedin.com/company/117543969/");
  });

  it("fallback job khi chưa cấu hình", () => {
    expect(resolveLinkedInCompanyUrl(null, "https://www.linkedin.com/company/vclaw-ai")).toBe(
      "https://www.linkedin.com/company/vclaw-ai/",
    );
  });
});
