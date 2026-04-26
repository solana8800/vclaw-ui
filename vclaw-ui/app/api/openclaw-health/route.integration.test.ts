import { createServer, type Server } from "node:http";

import { WebSocketServer } from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/openclaw-health/route";

type StartedGateway = {
  httpServer: Server;
  wsServer: WebSocketServer;
  restUrl: string;
  wsUrl: string;
};

async function startZeroTokenGatewayMock(token: string): Promise<StartedGateway> {
  const httpServer = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    if (req.headers["x-gateway-token"] !== token) {
      res.writeHead(401);
      res.end("unauthorized");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Không lấy được cổng mock gateway.");
  }

  const wsServer = new WebSocketServer({ server: httpServer, path: "/ws" });
  wsServer.on("connection", (ws) => {
    const challengeNonce = "zero-token-smoke-nonce";
    ws.send(
      JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: { nonce: challengeNonce },
      }),
    );
    ws.on("message", (raw) => {
      const frame = JSON.parse(String(raw)) as {
        id?: string;
        method?: string;
        params?: {
          auth?: { token?: string };
          device?: { id?: string; publicKey?: string; signature?: string; signedAt?: number; nonce?: string };
        };
      };
      if (frame.method === "connect") {
        const device = frame.params?.device;
        const hasSignedDevice =
          typeof device?.id === "string" &&
          typeof device.publicKey === "string" &&
          typeof device.signature === "string" &&
          typeof device.signedAt === "number" &&
          device.nonce === challengeNonce;
        const ok = frame.params?.auth?.token === token && hasSignedDevice;
        ws.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok,
            error: ok ? undefined : { message: "bad token or missing signed device" },
          }),
        );
        return;
      }

      const payloads: Record<string, unknown> = {
        status: {
          sessions: {
            defaults: { provider: "deepseek-web", model: "deepseek-chat" },
            recent: [{ modelProvider: "deepseek-web", model: "deepseek-chat" }],
          },
        },
        "models.list": {
          models: [{ provider: "deepseek-web", id: "deepseek-chat", name: "DeepSeek Chat" }],
        },
        "models.authStatus": {
          providers: [{ provider: "deepseek-web", displayName: "DeepSeek Web", status: "ok" }],
        },
      };
      ws.send(
        JSON.stringify({
          type: "res",
          id: frame.id,
          ok: true,
          payload: payloads[frame.method ?? ""] ?? {},
        }),
      );
    });
  });

  return {
    httpServer,
    wsServer,
    restUrl: `http://127.0.0.1:${address.port}`,
    wsUrl: `ws://127.0.0.1:${address.port}/ws`,
  };
}

async function stopGatewayMock(gateway: StartedGateway | null): Promise<void> {
  if (!gateway) return;
  await new Promise<void>((resolve) => gateway.wsServer.close(() => resolve()));
  await new Promise<void>((resolve) => gateway.httpServer.close(() => resolve()));
}

const runNetworkSmoke = process.env.OPENCLAW_NETWORK_SMOKE === "1";
const runLiveZeroTokenGatewaySmoke = process.env.OPENCLAW_LIVE_ZERO_TOKEN_GATEWAY === "1";

describe.runIf(runNetworkSmoke)("GET /api/openclaw-health integration", () => {
  let gateway: StartedGateway | null = null;

  afterEach(async () => {
    await stopGatewayMock(gateway);
    gateway = null;
    vi.unstubAllEnvs();
  });

  it("xác minh readiness Zero Token qua REST health và WebSocket RPC thật", async () => {
    const token = "zero-token-smoke-token";
    gateway = await startZeroTokenGatewayMock(token);
    vi.stubEnv("OPENCLAW_GATEWAY_URL", gateway.restUrl);
    vi.stubEnv("OPENCLAW_GATEWAY_TOKEN", token);
    vi.stubEnv("OPENCLAW_GATEWAY_VARIANT", "zero-token");
    vi.stubEnv("NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL", gateway.wsUrl);

    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      diagnosis: "ok",
      mode: "zero-token",
      baseUrl: gateway.restUrl,
      wsUrl: gateway.wsUrl,
      authConfigured: true,
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: true,
        hasZeroTokenRuntimeModel: true,
        runtimeModelRef: "deepseek-web/deepseek-chat",
        runtimeModelSource: "recent",
        sampleModels: ["deepseek-web/deepseek-chat"],
        authProviders: [{ provider: "deepseek-web", displayName: "DeepSeek Web", status: "ok" }],
      },
    });
  });
});

describe.runIf(runLiveZeroTokenGatewaySmoke)("GET /api/openclaw-health live zero-token gateway", () => {
  it("đọc được health cơ bản từ gateway Zero Token thật đang chạy", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      diagnosis: "ok",
      mode: "zero-token",
      authConfigured: true,
      readiness: {
        hasZeroTokenModels: expect.any(Boolean),
        hasUsableZeroTokenAuth: expect.any(Boolean),
        hasZeroTokenRuntimeModel: expect.any(Boolean),
      },
    });
    expect(body.baseUrl).toBe(process.env.OPENCLAW_GATEWAY_URL);
    expect(body.wsUrl).toBe(process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL);
  });
});
