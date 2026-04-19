/**
 * Gateway client — server-side (Server Components, Route Handlers, Server Actions)
 *
 * Calls the OpenClaw gateway REST API directly (no HTTP hop through /api/gateway).
 * Do NOT import this in 'use client' files — use gateway-client.ts instead.
 */

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";

type GatewayRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Skip JSON parsing and return the raw Response */
  raw?: boolean;
};

async function gatewayFetch(
  path: string,
  { body, raw, ...init }: GatewayRequestInit = {}
): Promise<Response> {
  const url = `${GATEWAY_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return res;
}

export const gateway = {
  get<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    return gatewayFetch(path, init).then((r) => r.json() as Promise<T>);
  },

  post<T = unknown>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return gatewayFetch(path, { method: "POST", body, ...init }).then(
      (r) => r.json() as Promise<T>
    );
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
