import { describe, expect, it } from "vitest";

import {
  classifyGatewayHealthResponse,
  classifyGatewayHealthFailure,
} from "@/lib/openclaw/zero-token-health";

describe("classifyGatewayHealthResponse", () => {
  it("đánh dấu unauthorized khi gateway trả 401", () => {
    expect(
      classifyGatewayHealthResponse({
        status: 401,
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        authConfigured: true,
        gatewayVariant: undefined,
      }),
    ).toMatchObject({
      ok: false,
      diagnosis: "unauthorized",
      mode: "unknown",
      authConfigured: true,
    });
  });

  it("đánh dấu zero-token khi env khai báo variant tương ứng", () => {
    expect(
      classifyGatewayHealthResponse({
        status: 200,
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        authConfigured: true,
        gatewayVariant: "zero-token",
      }),
    ).toMatchObject({
      ok: true,
      diagnosis: "ok",
      mode: "zero-token",
    });
  });

  it("giữ mode unknown khi gateway sống nhưng chưa có tín hiệu nhận diện", () => {
    expect(
      classifyGatewayHealthResponse({
        status: 200,
        baseUrl: "http://127.0.0.1:18789",
        wsUrl: "ws://127.0.0.1:18789/ws",
        authConfigured: false,
        gatewayVariant: undefined,
      }),
    ).toMatchObject({
      ok: true,
      diagnosis: "ok",
      mode: "unknown",
      authConfigured: false,
    });
  });
});

describe("classifyGatewayHealthFailure", () => {
  it("đánh dấu unreachable khi không gọi được gateway", () => {
    expect(
      classifyGatewayHealthFailure({
        baseUrl: "http://127.0.0.1:3001",
        wsUrl: "ws://127.0.0.1:3001/ws",
        authConfigured: true,
        gatewayVariant: "zero-token",
        error: "unreachable",
      }),
    ).toMatchObject({
      ok: false,
      status: 0,
      diagnosis: "unreachable",
      mode: "zero-token",
    });
  });
});
