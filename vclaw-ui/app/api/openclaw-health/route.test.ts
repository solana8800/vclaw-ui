import { afterEach, describe, expect, it, vi } from "vitest";

const getGatewayAuthToken = vi.fn();
const getGatewayVariant = vi.fn();
const resolveGatewayWebSocketUrlForServer = vi.fn();
const runGatewayWsRpc = vi.fn();

vi.mock("@/lib/gateway/env", () => ({
  getGatewayAuthToken,
  getGatewayVariant,
}));

vi.mock("@/lib/gateway/ws-url", () => ({
  resolveGatewayWebSocketUrlForServer,
}));

vi.mock("@/lib/openclaw/gateway-ws-rpc-server", () => ({
  runGatewayWsRpc,
}));

describe("GET /api/openclaw-health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    getGatewayAuthToken.mockReset();
    getGatewayVariant.mockReset();
    resolveGatewayWebSocketUrlForServer.mockReset();
    runGatewayWsRpc.mockReset();
  });

  it("trả health chi tiết khi gateway phản hồi", async () => {
    vi.stubEnv("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:3001");
    getGatewayAuthToken.mockReturnValue("secret-token");
    getGatewayVariant.mockReturnValue("zero-token");
    resolveGatewayWebSocketUrlForServer.mockReturnValue("ws://127.0.0.1:3001/ws");
    runGatewayWsRpc
      .mockResolvedValueOnce({
        sessions: {
          defaults: { provider: "deepseek-web", model: "deepseek-chat" },
          recent: [{ modelProvider: "deepseek-web", model: "deepseek-chat" }],
        },
      })
      .mockResolvedValueOnce({
        models: [
          { provider: "deepseek-web", id: "deepseek-chat", name: "DeepSeek Chat" },
          { provider: "anthropic", id: "claude-sonnet", name: "Claude Sonnet" },
        ],
      })
      .mockResolvedValueOnce({
        providers: [{ provider: "deepseek-web", displayName: "DeepSeek Web", status: "ok" }],
      });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );

    const { GET } = await import("@/app/api/openclaw-health/route");
    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      status: 200,
      diagnosis: "ok",
      mode: "zero-token",
      baseUrl: "http://127.0.0.1:3001",
      wsUrl: "ws://127.0.0.1:3001/ws",
      authConfigured: true,
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: true,
        hasZeroTokenRuntimeModel: true,
        runtimeModelRef: "deepseek-web/deepseek-chat",
        runtimeModelSource: "recent",
      },
    });
  });

  it("trả unauthorized khi gateway từ chối token", async () => {
    vi.stubEnv("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:3001");
    getGatewayAuthToken.mockReturnValue("bad-token");
    getGatewayVariant.mockReturnValue(undefined);
    resolveGatewayWebSocketUrlForServer.mockReturnValue("ws://127.0.0.1:3001/ws");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unauthorized", { status: 401 })),
    );

    const { GET } = await import("@/app/api/openclaw-health/route");
    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: false,
      status: 401,
      diagnosis: "unauthorized",
      mode: "unknown",
      authConfigured: true,
    });
    expect(runGatewayWsRpc).not.toHaveBeenCalled();
  });

  it("vẫn trả health cơ bản nếu readiness RPC lỗi", async () => {
    vi.stubEnv("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:3001");
    getGatewayAuthToken.mockReturnValue("secret-token");
    getGatewayVariant.mockReturnValue("zero-token");
    resolveGatewayWebSocketUrlForServer.mockReturnValue("ws://127.0.0.1:3001/ws");
    runGatewayWsRpc.mockRejectedValue(new Error("rpc unavailable"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );

    const { GET } = await import("@/app/api/openclaw-health/route");
    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      status: 200,
      diagnosis: "ok",
      mode: "zero-token",
      authConfigured: true,
    });
    expect(body.readiness).toBeUndefined();
  });

  it("vẫn trả readiness một phần khi một capability RPC chưa có", async () => {
    vi.stubEnv("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:3001");
    getGatewayAuthToken.mockReturnValue("secret-token");
    getGatewayVariant.mockReturnValue("zero-token");
    resolveGatewayWebSocketUrlForServer.mockReturnValue("ws://127.0.0.1:3001/ws");
    runGatewayWsRpc
      .mockResolvedValueOnce({
        sessions: {
          defaults: { provider: "deepseek-web", model: "deepseek-chat" },
        },
      })
      .mockResolvedValueOnce({
        models: [{ provider: "deepseek-web", id: "deepseek-chat", name: "DeepSeek Chat" }],
      })
      .mockRejectedValueOnce(new Error("unknown method: models.authStatus"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );

    const { GET } = await import("@/app/api/openclaw-health/route");
    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      status: 200,
      diagnosis: "ok",
      mode: "zero-token",
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: false,
        hasZeroTokenRuntimeModel: true,
        runtimeModelRef: "deepseek-web/deepseek-chat",
        sampleModels: ["deepseek-web/deepseek-chat"],
        authProviders: [],
      },
    });
  });
});
