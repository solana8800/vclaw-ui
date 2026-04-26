import { NextResponse } from "next/server";

import { getGatewayAuthToken, getGatewayVariant } from "@/lib/gateway/env";
import { resolveGatewayWebSocketUrlForServer } from "@/lib/gateway/ws-url";
import { runGatewayWsRpc } from "@/lib/openclaw/gateway-ws-rpc-server";
import {
  summarizeGatewayModelAuthStatus,
  summarizeGatewayModelCatalog,
  summarizeGatewayRuntimeModelStatus,
} from "@/lib/openclaw/zero-token-model-detection";
import {
  classifyGatewayHealthFailure,
  classifyGatewayHealthResponse,
} from "@/lib/openclaw/zero-token-health";

export const runtime = "nodejs";

/**
 * Kiểm tra gateway OpenClaw / Zero Token (server-side, có token).
 * GET /api/openclaw-health — dùng cho banner chat admin.
 */
export async function GET() {
  const base = (process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789").replace(/\/$/, "");
  const token = getGatewayAuthToken();
  const gatewayVariant = getGatewayVariant();
  const wsUrl = resolveGatewayWebSocketUrlForServer("/ws");
  const headers = new Headers();
  if (token) {
    headers.set("X-Gateway-Token", token);
  }
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const summary = classifyGatewayHealthResponse({
      status: res.status,
      baseUrl: base,
      wsUrl,
      authConfigured: Boolean(token),
      gatewayVariant,
    });
    if (!summary.ok) {
      return NextResponse.json(summary);
    }

    let readiness:
      | {
          hasZeroTokenModels: boolean;
          hasUsableZeroTokenAuth: boolean;
          hasZeroTokenRuntimeModel: boolean;
          zeroTokenProviders: string[];
          sampleModels: string[];
          runtimeModelRef?: string;
          runtimeModelSource?: "defaults" | "recent";
          authProviders: Array<{ provider: string; displayName: string; status: string }>;
        }
      | undefined;

    try {
      const [statusResult, modelsResult, authResult] = await Promise.allSettled([
        runGatewayWsRpc<{
          sessions?: {
            defaults?: { provider?: string; model?: string };
            recent?: Array<{ modelProvider?: string; model?: string }>;
          };
        }>({
          method: "status",
          params: {},
          timeoutMs: 8_000,
        }),
        runGatewayWsRpc<{ models?: unknown[] }>({
          method: "models.list",
          params: {},
          timeoutMs: 8_000,
        }),
        runGatewayWsRpc<{ providers?: unknown[] }>({
          method: "models.authStatus",
          params: {},
          timeoutMs: 8_000,
        }),
      ]);
      if (
        statusResult.status === "fulfilled" ||
        modelsResult.status === "fulfilled" ||
        authResult.status === "fulfilled"
      ) {
        const runtimeSummary = summarizeGatewayRuntimeModelStatus(
          statusResult.status === "fulfilled" ? statusResult.value : undefined,
        );
        const modelSummary = summarizeGatewayModelCatalog(
          modelsResult.status === "fulfilled" ? modelsResult.value : undefined,
        );
        const authSummary = summarizeGatewayModelAuthStatus(
          authResult.status === "fulfilled" ? authResult.value : undefined,
        );
        readiness = {
          hasZeroTokenModels: modelSummary.hasZeroTokenModels,
          hasUsableZeroTokenAuth: authSummary.hasUsableZeroTokenAuth,
          hasZeroTokenRuntimeModel: runtimeSummary.hasZeroTokenRuntimeModel,
          zeroTokenProviders: modelSummary.zeroTokenProviders,
          sampleModels: modelSummary.sampleModels,
          runtimeModelRef: runtimeSummary.runtimeModelRef,
          runtimeModelSource: runtimeSummary.runtimeModelSource,
          authProviders: authSummary.zeroTokenProviders,
        };
      }
    } catch {
      readiness = undefined;
    }

    return NextResponse.json({
      ...summary,
      ...(readiness ? { readiness } : {}),
    });
  } catch {
    return NextResponse.json(
      classifyGatewayHealthFailure({
        baseUrl: base,
        wsUrl,
        authConfigured: Boolean(token),
        gatewayVariant,
        error: "unreachable",
      }),
      { status: 503 },
    );
  }
}
