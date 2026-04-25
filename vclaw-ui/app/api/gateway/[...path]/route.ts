/**
 * REST proxy — forwards all /api/gateway/* requests to the OpenClaw gateway.
 * Middleware can intercept here to add auth headers, logging, or rate limiting.
 */

import { type NextRequest, NextResponse } from "next/server";

import { getGatewayAuthToken } from "@/lib/gateway/env";

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN = getGatewayAuthToken();

export const runtime = "edge";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const gatewayPath = "/" + path.join("/");
  const url = `${GATEWAY_URL}${gatewayPath}${req.nextUrl.search}`;

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  // Forward relevant headers, drop hop-by-hop headers
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "connection" &&
      lower !== "transfer-encoding"
    ) {
      forwardHeaders.set(key, value);
    }
  });
  
  if (GATEWAY_TOKEN) {
    forwardHeaders.set("X-Gateway-Token", GATEWAY_TOKEN);
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers: forwardHeaders,
    body: body ? Buffer.from(body) : undefined,
  });

  // Tinh chỉnh headers phản hồi để hỗ trợ streaming
  const responseHeaders = new Headers(upstream.headers);
  
  // Ép buộc không buffer cho SSE
  if (req.headers.get("accept") === "text/event-stream") {
    responseHeaders.set("Cache-Control", "no-cache, no-transform");
    responseHeaders.set("Connection", "keep-alive");
    responseHeaders.set("X-Accel-Buffering", "no");
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
