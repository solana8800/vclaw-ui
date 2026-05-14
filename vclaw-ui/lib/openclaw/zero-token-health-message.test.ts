import { describe, expect, it } from "vitest";

import { formatGatewayHealthMessage } from "@/lib/openclaw/zero-token-health-message";

const mockMessages = {
  unauthorized: "Gateway từ chối token tại {url} (HTTP {status}). Kiểm tra OPENCLAW_GATEWAY_TOKEN.",
  unreachable: "Không gọi được gateway tại {url}. Vui lòng kiểm tra lại dịch vụ chạy ngầm.",
  missingToken: "Chưa thấy token gateway. Vui lòng cấu hình token cho VClaw và Gateway.",
  noWebModels: "Hệ thống đã kết nối nhưng chưa tìm thấy model web phù hợp.",
  noWebAuth: "Hệ thống đã kết nối nhưng chưa xác thực WebAuth thành công. Vui lòng kích hoạt WebAuth.",
  incompatibleModel: "Model hiện tại đang không tương thích, runtime hiện tại là {model}. Vui lòng đổi sang các model web.",
  connected: "VClaw Token đã kết nối thành công, runtime web đang active.",
  responding: "Gateway Zero Token đang phản hồi.",
  unknownConfig: "Hệ thống Gateway đã kết nối nhưng chưa xác định được cấu hình.",
};

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
        messages: mockMessages,
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
        messages: mockMessages,
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
        messages: mockMessages,
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
        messages: mockMessages,
      }),
    ).toContain("runtime hiện tại là openai/gpt-5.4");
  });

  it("không báo auth web lỗi khi fork không trả authProviders nhưng catalog web đã có", () => {
    const message = formatGatewayHealthMessage({
      diagnosis: "ok",
      baseUrl: "http://127.0.0.1:3001",
      wsUrl: "ws://127.0.0.1:3001/ws",
      mode: "zero-token",
      authConfigured: true,
      status: 200,
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: false,
        hasZeroTokenRuntimeModel: false,
        authProviders: [],
      },
      messages: mockMessages,
    });

    expect(message).toContain("Gateway Zero Token đang phản hồi");
    expect(message).not.toContain("auth web chưa usable");
    expect(message).not.toContain("chưa xác định được runtime model");
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
        messages: mockMessages,
      }),
    ).toContain("runtime web đang active");
  });
});
