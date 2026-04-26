import { describe, expect, it } from "vitest";

import { formatGatewayHealthMessage } from "@/lib/openclaw/zero-token-health-message";

describe("formatGatewayHealthMessage", () => {
  it("ưu tiên thông điệp unauthorized", () => {
    expect(
      formatGatewayHealthMessage({
        diagnosis: "unauthorized",
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        mode: "zero-token",
        authConfigured: true,
        status: 401,
      }),
    ).toContain("Gateway từ chối token");
  });

  it("nhắc cấu hình thiếu token khi auth chưa được cấu hình", () => {
    expect(
      formatGatewayHealthMessage({
        diagnosis: "ok",
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        mode: "zero-token",
        authConfigured: false,
        status: 200,
      }),
    ).toContain("Chưa thấy token gateway");
  });

  it("nhắc kiểm tra gateway khi unreachable", () => {
    expect(
      formatGatewayHealthMessage({
        diagnosis: "unreachable",
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        mode: "unknown",
        authConfigured: true,
        status: 0,
      }),
    ).toContain("Không gọi được gateway");
  });

  it("cảnh báo khi zero-token đang chạy runtime model không phải web", () => {
    expect(
      formatGatewayHealthMessage({
        diagnosis: "ok",
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        mode: "zero-token",
        authConfigured: true,
        status: 200,
        readiness: {
          hasZeroTokenModels: true,
          hasUsableZeroTokenAuth: true,
          hasZeroTokenRuntimeModel: false,
          runtimeModelRef: "openai/gpt-5.4",
          runtimeModelSource: "recent",
        },
      }),
    ).toContain("runtime hiện tại là openai/gpt-5.4");
  });

  it("xác nhận zero-token sẵn sàng khi runtime model là web", () => {
    expect(
      formatGatewayHealthMessage({
        diagnosis: "ok",
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        mode: "zero-token",
        authConfigured: true,
        status: 200,
        readiness: {
          hasZeroTokenModels: true,
          hasUsableZeroTokenAuth: true,
          hasZeroTokenRuntimeModel: true,
          runtimeModelRef: "deepseek-web/deepseek-chat",
          runtimeModelSource: "recent",
        },
      }),
    ).toContain("runtime web đang active");
  });
});
