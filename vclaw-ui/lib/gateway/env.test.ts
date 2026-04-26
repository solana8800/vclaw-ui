import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGatewayAuthToken,
  getGatewayVariant,
  getPublicGatewayAuthToken,
} from "@/lib/gateway/env";

describe("gateway env helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("đọc token public từ NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN", () => {
    vi.stubEnv("NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN", " public-token ");
    expect(getPublicGatewayAuthToken()).toBe("public-token");
  });

  it("ưu tiên token private cho server-side", () => {
    vi.stubEnv("OPENCLAW_GATEWAY_TOKEN", " private-token ");
    vi.stubEnv("NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN", "public-token");
    expect(getGatewayAuthToken()).toBe("private-token");
  });

  it("đọc variant zero-token và upstream", () => {
    vi.stubEnv("OPENCLAW_GATEWAY_VARIANT", "zero-token");
    expect(getGatewayVariant()).toBe("zero-token");

    vi.stubEnv("OPENCLAW_GATEWAY_VARIANT", "upstream");
    expect(getGatewayVariant()).toBe("upstream");
  });

  it("bỏ qua variant không hợp lệ", () => {
    vi.stubEnv("OPENCLAW_GATEWAY_VARIANT", "something-else");
    expect(getGatewayVariant()).toBeUndefined();
  });
});
