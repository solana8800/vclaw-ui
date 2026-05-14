import { afterEach, describe, expect, it, vi } from "vitest";
import { getGhnTrackingUrl } from "./logistics";

describe("getGhnTrackingUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dùng tracking GHN dev ngoài production", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getGhnTrackingUrl("LX7BMT")).toBe("https://tracking.ghn.dev/?order_code=LX7BMT");
  });

  it("dùng tracking GHN production khi build production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getGhnTrackingUrl("LX7BMT")).toBe("https://tracking.ghn.vn/?order_code=LX7BMT");
  });
});
