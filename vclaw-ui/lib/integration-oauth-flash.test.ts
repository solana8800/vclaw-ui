import { describe, expect, it } from "vitest";
import { isIntegrationOauthFlashSuccess, parseIntegrationOauthFlash } from "@/lib/integration-oauth-flash";

describe("parseIntegrationOauthFlash", () => {
  it("accepts known keys", () => {
    expect(parseIntegrationOauthFlash("zalo_oauth_ok")).toBe("zalo_oauth_ok");
    expect(parseIntegrationOauthFlash("meta_oauth_bad_state")).toBe("meta_oauth_bad_state");
  });
  it("rejects unknown keys", () => {
    expect(parseIntegrationOauthFlash("evil")).toBeNull();
    expect(parseIntegrationOauthFlash("<script>")).toBeNull();
  });
  it("classifies success", () => {
    expect(isIntegrationOauthFlashSuccess("shopee_oauth_ok")).toBe(true);
    expect(isIntegrationOauthFlashSuccess("meta_oauth_err")).toBe(false);
  });
});
