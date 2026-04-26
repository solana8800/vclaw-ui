import { describe, expect, it } from "vitest";

import { resolveGatewayHealthAction } from "@/lib/openclaw/zero-token-health-action";

describe("resolveGatewayHealthAction", () => {
  it("ưu tiên unauthorized", () => {
    expect(
      resolveGatewayHealthAction({
        diagnosis: "unauthorized",
        mode: "zero-token",
        authConfigured: true,
      }),
    ).toBe("unauthorized");
  });

  it("trả runtime_not_web khi zero-token đang chạy model non-web", () => {
    expect(
      resolveGatewayHealthAction({
        diagnosis: "ok",
        mode: "zero-token",
        authConfigured: true,
        readiness: {
          hasZeroTokenModels: true,
          hasUsableZeroTokenAuth: true,
          hasZeroTokenRuntimeModel: false,
          runtimeModelRef: "openai/gpt-5.4",
          runtimeModelSource: "recent",
        },
      }),
    ).toBe("runtime_not_web");
  });

  it("không chặn chat khi auth/runtime metadata của fork chưa đủ nhưng catalog web đã có", () => {
    expect(
      resolveGatewayHealthAction({
        diagnosis: "ok",
        mode: "zero-token",
        authConfigured: true,
        readiness: {
          hasZeroTokenModels: true,
          hasUsableZeroTokenAuth: false,
          hasZeroTokenRuntimeModel: false,
          authProviders: [],
        },
      }),
    ).toBeNull();
  });

  it("khong trả action khi trạng thái zero-token đã usable", () => {
    expect(
      resolveGatewayHealthAction({
        diagnosis: "ok",
        mode: "zero-token",
        authConfigured: true,
        readiness: {
          hasZeroTokenModels: true,
          hasUsableZeroTokenAuth: true,
          hasZeroTokenRuntimeModel: true,
          runtimeModelRef: "deepseek-web/deepseek-chat",
          runtimeModelSource: "recent",
        },
      }),
    ).toBeNull();
  });
});
