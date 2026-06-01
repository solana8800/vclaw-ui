/**
 * Gateway client — server-side (Server Components, Route Handlers, Server Actions)
 *
 * Calls the OpenClaw gateway REST API directly (no HTTP hop through /api/gateway).
 * Do NOT import this in 'use client' files — use `lib/gateway/client.ts` instead.
 */

import { getGatewayAuthToken } from "./env";

function getGatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
}

type GatewayRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Error thrown khi gateway trả non-2xx. Giữ lại status + body để caller bóc tách
 * (gateway tuân OpenAI-compatible shape: { error: { message, type } }).
 */
export class GatewayHttpError extends Error {
  status: number;
  body: unknown;
  upstreamMessage?: string;

  constructor(status: number, body: unknown, upstreamMessage?: string) {
    const detail = upstreamMessage || (typeof body === "string" ? body : JSON.stringify(body));
    super(`Gateway HTTP ${status}: ${detail}`);
    this.name = "GatewayHttpError";
    this.status = status;
    this.body = body;
    this.upstreamMessage = upstreamMessage;
  }
}

async function gatewayFetch(
  path: string,
  { body, ...init }: GatewayRequestInit = {}
): Promise<Response> {
  const gatewayUrl = getGatewayUrl();
  const url = `${gatewayUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const token = getGatewayAuthToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
    authHeaders["x-openclaw-scopes"] = "operator.write";
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...authHeaders,
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return res;
}

/** Parse JSON body an toàn — trả về null nếu không parse được. */
async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}

async function parseOk<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await safeJson(res);
    const upstream =
      body && typeof body === "object" && body !== null && "error" in body
        ? extractErrorMessage((body as { error: unknown }).error)
        : undefined;
    throw new GatewayHttpError(res.status, body, upstream);
  }
  return res.json() as Promise<T>;
}

function extractErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const msg = obj.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return undefined;
}

export const gateway = {
  get<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    return gatewayFetch(path, init).then(parseOk<T>);
  },

  post<T = unknown>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return gatewayFetch(path, { method: "POST", body, ...init }).then(parseOk<T>);
  },

  /** Returns a ReadableStream — use for SSE / streaming chat endpoints */
  stream(path: string, body: unknown): Promise<Response> {
    return gatewayFetch(path, {
      method: "POST",
      body,
      headers: { accept: "text/event-stream" },
    });
  },
};
