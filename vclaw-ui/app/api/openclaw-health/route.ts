import { NextResponse } from "next/server";

import { getGatewayAuthToken } from "@/lib/gateway-env";

export const runtime = "nodejs";

/**
 * Kiểm tra gateway OpenClaw / Zero Token (server-side, có token).
 * GET /api/openclaw-health — dùng cho banner chat admin.
 */
export async function GET() {
  const base = (process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789").replace(/\/$/, "");
  const token = getGatewayAuthToken();
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
    const ok = res.ok;
    return NextResponse.json({
      ok,
      status: res.status,
      baseUrl: base,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        baseUrl: base,
        error: "unreachable",
      },
      { status: 503 },
    );
  }
}
