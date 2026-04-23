---
summary: "WebSocket is OpenClaw's primary control plane; SSE/MCP have distinct roles; zalouser admin uses the Gateway WebSocket."
read_when:
  - Integrating the Gateway, personal Zalo (zalouser), or choosing transport (WS vs SSE vs MCP)
title: "Gateway transport and zalouser admin"
---

# Gateway transport and zalouser admin

This document extends [Section 7 — Zalouser](13-Technical-Integration-Reference.en.md#7-zalo-personal-channel-configuration-zalouser) in *Technical Integration Reference*.

## 1. WebSocket — canonical control plane

The OpenClaw Gateway is a single long-lived daemon; **CLI, Control UI (dashboard), apps, and nodes** talk to it over **WebSocket** (JSON: `connect` → `req`/`res` + `event`). That is the control and push protocol, not something you replace wholesale with SSE.

See synced `core/openclaw` docs:

- Architecture: `core/openclaw/docs/concepts/architecture.md`
- Protocol: `core/openclaw/docs/gateway/protocol.md`
- Control UI (browser): `core/openclaw/docs/web/control-ui.md`

In VClaw UI, the browser uses the singleton in [`lib/gateway-client.ts`](../../lib/gateway-client.ts) (`gatewayWs`) with `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` and optional `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` (see [`lib/gateway-ws-url.ts`](../../lib/gateway-ws-url.ts)).

## 2. SSE — one-way HTTP streams

SSE in OpenClaw is tied to **streaming HTTP endpoints** (e.g. OpenResponses with `stream: true`, session history). It does **not** replace the full Gateway handshake and RPC surface. Use SSE when a consumer only needs to read one HTTP-delivered event stream.

## 3. MCP — bridges and tool catalogs

- `openclaw mcp serve` exposes MCP over stdio; the bridge **still connects to the Gateway over WebSocket** (see `core/openclaw/docs/cli/mcp.md` when present in the tree).
- Agent MCP config (HTTP `sse` / `streamable-http`) is for **tool invocation from runtimes**, distinct from dashboard-style real-time control.

The **personal Zalo (zalouser)** admin page in `vclaw-ui` uses **WebSocket** (`send`, `directory.*`, `channels.*`, `web.login.*`), not MCP for those operations.

## 4. Admin Zalo feature → Gateway WS mapping

Wrappers live in [`lib/zalouser/zalouser-gateway.ts`](../../lib/zalouser/zalouser-gateway.ts).

| Need | WS method (preferred) |
|------|------------------------|
| Status / identity | `directory.self` (channel `zalouser`), optionally `channels.status` |
| QR login | `web.login.start` (payload may include `qrDataUrl`); some builds also expose `web.login.wait` |
| Channel logout | `channels.logout` |
| Group list | `directory.groups.list` |
| Send message | `send` (with `idempotencyKey`) |
| Inbound / sessions | `sessions.subscribe`, `sessions.messages.subscribe` (when the UI needs live updates) |

## 5. Environment variables

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Token sent in browser `connect`. |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | Full WebSocket URL if not the default. |
| `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_URL` | Server proxy to the Gateway (see doc 13). |
| `OPENCLAW_ZALOUSER_USE_CLI_LOGIN` | Set to `1` for **CLI + PNG file** login fallback (server spawns `openclaw channels login`). Default path uses WS + `web.login.start`. |
| `OPENCLAW_ZALOUSER_QR_FILE` | **Absolute** path to `openclaw-zalouser-qr-*.png` — **required on Windows** for CLI fallback; Unix may use `/tmp/openclaw/...` (see [`lib/zalouser/openclaw-zalouser-cli-qr-path.ts`](../../lib/zalouser/openclaw-zalouser-cli-qr-path.ts)). |
| `OPENCLAW_CLI` | `openclaw` binary when CLI fallback is enabled. |
| `OPENCLAW_DISABLE_BROWSER_CHANNEL_LOGIN` | Retained for legacy API routes if used externally. |

## 6. Gateway version and `web.login.*`

The `web.login.start` payload (e.g. `qrDataUrl`, `connected`, `message`) depends on your **zalouser plugin + Gateway** build. If the method is missing or returns `UNAVAILABLE`, use `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` or upgrade/sync `core/openclaw`.

**Common error:** `web login provider is not available` — your Gateway build has **not registered** the WebSocket QR web-login path (no “web login provider” for `web.login.start`). This is a Gateway capability gap, not a VClaw UI bug.

The official **Zalo Personal** plugin docs describe install/config and **CLI login on the Gateway host** (`openclaw channels login --channel zalouser`): [Zalo Personal Plugin (OpenClaw docs)](https://docs.openclaw.ai/plugins/zalouser).

**Quick fix on VClaw UI:** set `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` on the Next.js server and restart; on Windows also set `OPENCLAW_ZALOUSER_QR_FILE` (absolute path to the QR PNG). The admin page will use the CLI spawn fallback and `/api/openclaw/zalouser-cli-qr`.

## 7. Related

- [13 — Technical Integration Reference](13-Technical-Integration-Reference.en.md)
- [15 — Social Integration Solution](15-Social-Integration-Solution.en.md)
