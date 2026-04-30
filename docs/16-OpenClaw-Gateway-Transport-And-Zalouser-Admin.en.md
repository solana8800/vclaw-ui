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

See docs in the vendored fork (**this repo has no separate `core/openclaw` tree**):

- Architecture: [`core/openclaw-zero-token/docs/concepts/architecture.md`](../core/openclaw-zero-token/docs/concepts/architecture.md)
- Gateway / protocol: [`core/openclaw-zero-token/docs/gateway/protocol.md`](../core/openclaw-zero-token/docs/gateway/protocol.md)
- Gateway overview (CLI, UI surfaces): [`core/openclaw-zero-token/docs/gateway/index.md`](../core/openclaw-zero-token/docs/gateway/index.md)

In VClaw UI, the browser uses the singleton in [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts) (`gatewayWs`) with `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` and optional `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` (see [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts)).

## 2. JSON request frames over WebSocket (vclaw-ui → OpenClaw Gateway)

Every RPC (after authentication) is one UTF-8 JSON line shaped like:

```json
{ "type": "req", "id": "<random-string>", "method": "<method-name>", "params": { } }
```

The client generates `id` (`Math.random().toString(36)…`); the Gateway answers with `{ "type": "res", "id": "<same-id>", "ok": true|false, "payload": … }` or `error` on failure. The Gateway may also push `{ "type": "event", "event": "…", "payload": … }` (e.g. `agent`, `chat`, `session.message`).

### 2.1. Handshake: `connect`

After the socket opens, the Gateway may emit `connect.challenge`; the client calls `sendConnect()` and sends this **single** `req` frame (`id` is always prefixed with `auth-` so the client treats the handshake differently from normal `pending` RPCs):

```json
{
  "type": "req",
  "id": "auth-<random>",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "openclaw-control-ui",
      "version": "2026.4.15",
      "platform": "web",
      "mode": "webchat"
    },
    "role": "operator",
    "caps": ["tool-events"],
    "scopes": ["operator.read", "operator.write", "operator.admin"],
    "auth": { "token": "<NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN>" }
  }
}
```

- **`scopes`**: `operator.admin` is required for methods such as `channels.logout`, `web.login.start`, and `web.login.wait` (OpenClaw method scopes).
- **`auth.token`**: may be omitted if the public env token is unset (most RPCs will then fail after connect).

### 2.2. Admin AI chat: `chat.send`

Source: `sendChatMessage()` in [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts), used from [`vclaw-ui/components/admin/admin-chat-assistant.tsx`](../vclaw-ui/components/admin/admin-chat-assistant.tsx).

```json
{
  "type": "req",
  "id": "<random>",
  "method": "chat.send",
  "params": {
    "sessionKey": "agent:main:main",
    "message": "<user-message-text>",
    "deliver": true,
    "idempotencyKey": "<uuid-or-unique-string>"
  }
}
```

Default `sessionKey` is `agent:main:main`; conversations can persist a different `openclawSessionKey` in local storage.

### 2.3. Personal Zalo (`zalouser`): methods from [`vclaw-ui/lib/zalouser/zalouser-gateway.ts`](../vclaw-ui/lib/zalouser/zalouser-gateway.ts)

Each call uses the same envelope `{ "type": "req", "id": "<random>", "method": "…", "params": … }`. Channel id is always `"zalouser"`.

| `method` | `params` (example / actual fields) | Notes |
|----------|-------------------------------------|--------|
| `channels.status` | `{ "probe": true, "timeoutMs": 20000 }` | Lightweight channel probe. |
| `channels.logout` | `{ "channel": "zalouser", "accountId": "<optional>" }` | `accountId` may be omitted. |
| `web.login.start` | `{ "force": true, "timeoutMs": 60000 }` or `{ "force": false, "timeoutMs": 55000 }` | The panel may call again with `force: false` when the message suggests “still preparing…”. Optional `verbose`. |
| `web.login.wait` | `{ "timeoutMs": 55000 }` or `{}` | Wait for QR confirmation; the UI may repeat after each wait timeout until `connected`. |
| `sessions.subscribe` | `{}` | Subscribe to session changes (inbox-style UIs). |
| `sessions.list` | `{ "limit": 100, "search": "zalouser", "includeDerivedTitles": true, "includeLastMessage": true }` | Filter sessions related to zalouser. |
| `sessions.messages.subscribe` | `{ "key": "<sessionKey>" }` | Push messages for a session. |
| `sessions.messages.unsubscribe` | `{ "key": "<sessionKey>" }` | Unsubscribe. |
| `send` | `{ "to": "<threadId>", "message": "<text>", "channel": "zalouser", "accountId": "<optional>", "sessionKey": "<optional>", "idempotencyKey": "<random>" }` | Outbound message; client must supply `idempotencyKey` (`newIdempotencyKey()`). |
| `directory.self` | `{ "channel": "zalouser" }` | Linked account identity. |
| `directory.peers.list` | `{ "channel": "zalouser", "query": "<optional>" }` | Peer / friend list. |
| `directory.groups.list` | `{ "channel": "zalouser", "query": "<optional>" }` | Group list. |

The Zalo admin page uses **`web.login.start`**, **`web.login.wait`** (after QR is shown), and **`gatewayWs.connect`** like the AI assistant; `directory.*`, `send`, `sessions.*`, and `channels.*` are wrapped for inbox sync / send flows when those features are wired up.

## 3. SSE — one-way HTTP streams

SSE in OpenClaw is tied to **streaming HTTP endpoints** (e.g. OpenResponses with `stream: true`, session history). It does **not** replace the full Gateway handshake and RPC surface. Use SSE when a consumer only needs to read one HTTP-delivered event stream.

## 4. MCP — bridges and tool catalogs

- `openclaw mcp serve` exposes MCP over stdio; the bridge **still connects to the Gateway over WebSocket** (see CLI docs under [`core/openclaw-zero-token/docs/cli/`](../core/openclaw-zero-token/docs/cli/) in the fork, e.g. gateway/daemon topics).
- Agent MCP config (HTTP `sse` / `streamable-http`) is for **tool invocation from runtimes**, distinct from dashboard-style real-time control.

The **personal Zalo (zalouser)** admin page in `vclaw-ui` uses **WebSocket** (`send`, `directory.*`, `channels.*`, `web.login.*`), not MCP for those operations.

## 5. Admin Zalo feature → Gateway WS mapping

Wrappers live in [`vclaw-ui/lib/zalouser/zalouser-gateway.ts`](../vclaw-ui/lib/zalouser/zalouser-gateway.ts).

| Need | WS method (preferred) |
|------|------------------------|
| Status / identity | `directory.self` (channel `zalouser`), optionally `channels.status` |
| QR login | `web.login.start` (payload may include `qrDataUrl`); some builds also expose `web.login.wait` |
| Channel logout | `channels.logout` |
| Group list | `directory.groups.list` |
| Send message | `send` (with `idempotencyKey`) |
| Inbound / sessions | `sessions.subscribe`, `sessions.messages.subscribe` (when the UI needs live updates) |

## 6. Environment variables

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Token sent in browser `connect`. |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | Full WebSocket URL if not the default. |
| `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_URL` | Server proxy to the Gateway (see doc 13). |
| `OPENCLAW_CLI` | `openclaw` binary for **server-side** fallback when `directory.groups.list` is missing on the Gateway (`getZalouserGroups` runs `openclaw directory groups list --channel zalouser --json`). |

## 7. Gateway version and `web.login.*`

The `web.login.start` payload (e.g. `qrDataUrl`, `connected`, `message`) depends on your **zalouser plugin + Gateway** build. The admin UI uses **WebSocket** only for QR login; if the method is missing or returns `UNAVAILABLE`, upgrade/sync submodule [`core/openclaw-zero-token`](../core/openclaw-zero-token) or complete login on the **Gateway host** using the upstream CLI flow.

**Common error:** `web login provider is not available` — your Gateway build has **not registered** the WebSocket QR web-login path (no “web login provider” for `web.login.start`). This is a Gateway capability gap, not a VClaw UI bug.

The official **Zalo Personal** plugin docs describe install/config and **CLI login on the Gateway host** (`openclaw channels login --channel zalouser`): [Zalo Personal Plugin (OpenClaw docs)](https://docs.openclaw.ai/plugins/zalouser).

## 8. Related

- [13 — Technical Integration Reference](13-Technical-Integration-Reference.en.md)
- [15 — Social Integration Solution](15-Social-Integration-Solution.en.md)
