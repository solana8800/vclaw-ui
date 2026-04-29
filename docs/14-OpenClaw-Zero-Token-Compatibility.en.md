# OpenClaw Zero Token: compatibility with VClaw

This document maps [openclaw-zero-token](https://github.com/linuxhsj/openclaw-zero-token) (OpenClaw fork, browser web auth) to the VClaw Admin integration points.

---

## 1. What Zero Token adds

- **No paid LLM API keys** for supported providers: credentials come from browser login (Chrome CDP / onboarding), stored locally as `auth.json` (never commit).
- **Same gateway shape as OpenClaw**: HTTP control plane + Web UI; fork README documents `server.sh`, default gateway port examples such as `3001`, and OpenAI-style `POST /v1/chat/completions` with `Authorization: Bearer` for **that** HTTP API surface.
- **VClaw** does not embed Chrome or onboarding; it expects a **running gateway process** reachable from the Next.js host.

---

## 2. Compatibility matrix

| Concern | VClaw (upstream OpenClaw) | Zero Token fork | Action |
| :--- | :--- | :--- | :--- |
| **REST proxy base** | `OPENCLAW_GATEWAY_URL` (default `http://127.0.0.1:18789`) | Often another port (e.g. `http://127.0.0.1:3001`) per fork `openclaw.json` / `server.sh` | Set `OPENCLAW_GATEWAY_URL` to the fork’s HTTP base URL. |
| **REST auth header** | `X-Gateway-Token: <OPENCLAW_GATEWAY_TOKEN>` via [`vclaw-ui/app/api/gateway/[...path]/route.ts`](../vclaw-ui/app/api/gateway/[...path]/route.ts) | Fork keeps OpenClaw-style gateway auth for control plane; align `gateway.auth.token` in fork config with `OPENCLAW_GATEWAY_TOKEN` | Same env names as today. |
| **OpenAI HTTP API** | Optional direct calls to gateway `/v1/...` are not required for Admin chat | README uses `Authorization: Bearer` for `/v1/chat/completions` | VClaw Admin chat uses the Gateway **WebSocket** envelope (`req` / `res` / `event`), not Bearer to `/v1/chat/completions`. |
| **WebSocket URL** | Default `ws://127.0.0.1:18789/ws` via [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts) | Must match fork bind host/port | Set **`NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`** to full WS URL, e.g. `ws://127.0.0.1:3001/ws`, or host-only prefix per helper. |
| **WS handshake** | `connect.challenge` → `connect` with `auth.token`, scopes `operator.read` / `operator.write` / `operator.admin` in [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts) | Fork is OpenClaw-based; protocol should match **same major gateway version** you built UI against | If handshake fails after port fix, align **fork release** with submodule [`core/openclaw-zero-token`](../core/openclaw-zero-token) or adjust client protocol version fields. |
| **Models** | e.g. OpenRouter / Ollama in sample `openclaw.default.json` | Web model ids: `deepseek-web/deepseek-chat`, `claude-web/claude-sonnet-4-6`, … | Configure fork `openclaw.json` `agents.defaults.model` to a configured `*-web/*` id; packaged preset: [`vclaw-ui/resources/openclaw.zero-token.default.json`](../vclaw-ui/resources/openclaw.zero-token.default.json). |

---

## 3. Operational checklist (developer machine)

1. Clone and build the fork (Node ≥ 22, pnpm, Chrome): follow upstream README (`start-chrome-debug.sh` → `onboard.sh webauth` → `server.sh`).
2. Note **HTTP** and **WS** bind addresses from the running process.
3. In VClaw `.env.local`:
   - `OPENCLAW_GATEWAY_URL=http://127.0.0.1:<port>`
   - `OPENCLAW_GATEWAY_TOKEN=<same as gateway.auth.token in fork>`
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<same token>` (browser chat)
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:<port>/ws` if port ≠ 18789
4. Restart `pnpm dev` and open Admin chat; optional: GET `/api/openclaw-health` should return `{ "ok": true }` when the gateway is up.

---

## 4. Security and compliance

- Do **not** expose the Zero Token gateway to the public internet without TLS and access control.
- Web sessions expire; re-run onboarding when providers log you out.
- Using web UIs instead of official APIs may violate **Terms of Service** of each provider; use for experimentation / internal tooling only unless you have explicit permission.

---

## 5. Verification status

The matrix above is **contract-level**: VClaw is wired to be port- and URL-configurable. **Runtime verification** against a specific `openclaw-zero-token` tag is the operator’s responsibility after each upgrade of the fork or of [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts) (protocol version, events).
