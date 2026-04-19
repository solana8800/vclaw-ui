/**
 * MCP proxy — forwards POST /api/mcp to the OpenClaw gateway MCP endpoint.
 * Supports both single JSON responses and SSE streaming (text/event-stream).
 */

import { type NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const accept = req.headers.get("accept") ?? "application/json";
  const contentType =
    req.headers.get("content-type") ?? "application/json";

  const upstream = await fetch(`${GATEWAY_URL}/api/mcp`, {
    method: "POST",
    headers: {
      "content-type": contentType,
      accept,
    },
    body,
  });

  const responseContentType =
    upstream.headers.get("content-type") ?? "application/json";

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": responseContentType,
      "cache-control": "no-cache, no-store",
      "x-accel-buffering": "no", // disable nginx buffering for SSE
    },
  });
}
