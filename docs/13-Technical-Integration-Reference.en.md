# TECHNICAL REFERENCE: CONNECTING VCLAW ADMIN TO OPENCLAW CORE

---

## 1. INFRASTRUCTURE OVERVIEW
The VClaw system operates on a Gateway-Client model.
- **OpenClaw Core (Gateway)**: Runs on the default port `18789`.
- **VClaw Admin (Next.js)**: Acts as the Client, interacting via HTTP REST, WebSocket, and MCP.

---

## 2. API ENDPOINTS DETAIL

### 2.1. REST API (HTTP via Proxy)
VClaw Admin interacts with the Core via a Next.js proxy at `/api/gateway/*`.

| Function | Method | Relative Path | Notes |
| :--- | :--- | :--- | :--- |
| **Chat Execution** | POST | `/agents/v1/main/chat` | Send message to the main agent |
| **Tool Calling (MCP)** | POST | `/mcp/v1/tools/call` | Invoke integrated MCP tools |
| **Session History** | GET | `/sessions/{id}/history` | Retrieve conversation logs |
| **List Models** | GET | `/v1/models` | Check available LLMs |
| **Health Check** | GET | `/health` | Check Gateway status |

**Required Internal Headers (handled by Proxy):**
```http
X-Gateway-Token: <OPENCLAW_GATEWAY_TOKEN>
Content-Type: application/json
```

---

### 2.2. Native WebSocket (Real-time)
Default URL is `ws://127.0.0.1:18789/ws`; the browser client resolves the actual URL with **`getGatewayWebSocketUrl()`** in [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts) (`NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` overrides host/port/path for Zero Token or non-default gateways). Frames use the Gateway envelope (`type: "req"` / `"res"` / `"event"`) with a **`connect.challenge` → `connect`** handshake (not classic JSON-RPC over HTTP).

**Core Methods:**
- `connect`: Initial handshake with client capabilities and token.
- `chat.send`: Send message to a session (e.g., `agent:main:main`).
- `config.apply`: Dynamically update core settings.

**Key Events:**
- `connect.challenge`: Received upon connection, requires a `connect` response.
- `agent`: Streams agent state (thinking phase, tool start/end).
- `chat`: Streams message deltas and final response.

**Implementation sketch (`vclaw-ui/lib/gateway/client.ts`):**
```typescript
import { getGatewayWebSocketUrl } from "@/lib/gateway/ws-url";

class GatewayWsManager {
  connect(opts: GatewayWsOptions) {
    const url = getGatewayWebSocketUrl(opts.path || "/ws");
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev) => {
      const frame = JSON.parse(ev.data);
      if (frame.type === "event" && frame.event === "agent") {
        // Handle thinking/tool events
      }
    };
  }

  async request(method: string, params: unknown) {
    const id = Math.random().toString(36).slice(2);
    this.ws?.send(JSON.stringify({ type: "req", id, method, params }));
  }
}
```

---

### 2.3. MCP (Model Context Protocol)
MCP supports Context and Tool exchange via JSON-RPC 2.0 over HTTP POST.

### 2.3. MCP Tool Invocation
MCP tools are invoked via REST POST requests to the MCP endpoint.

**Endpoint:** `/api/gateway/mcp/v1/tools/call`

**Sample Payload:**
```json
{
  "name": "vclaw.bill_verifier",
  "arguments": {
    "image_url": "path/to/bill.jpg"
  }
}
```

---

## 3. CODE STRUCTURE IN NEXT.JS ADMIN

To manage connections professionally, avoid exposing tokens on the client side, and ensure maintainability, VClaw Admin should organize code as follows:

### 3.1. Proxy Layer (Next.js API Routes)
**Location:** [`vclaw-ui/app/api/gateway/[...path]/route.ts`](../vclaw-ui/app/api/gateway/[...path]/route.ts)  
Handles token injection and CORS management.

```typescript
// vclaw-ui/app/api/gateway/[...path]/route.ts
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Proxies request to OpenClaw and adds X-Gateway-Token header
```

### 3.2. Client SDK Layer (`vclaw-ui/lib/gateway/client.ts`)
Unified client for REST and WebSocket communication. Exported as `gatewayClient` and `gatewayWs`.  
Used by UI components such as [`vclaw-ui/components/admin/admin-chat-assistant.tsx`](../vclaw-ui/components/admin/admin-chat-assistant.tsx). Related server-side WS helpers may live under `vclaw-ui/lib/openclaw/` (e.g. health checks).

---

## 4. DEVELOPER EXECUTION CHECKLIST

1. **[X] Environment Variables**: `OPENCLAW_GATEWAY_TOKEN` configured in `.env.local`.
2. **[X] API Proxy Setup**: Route handler at [`vclaw-ui/app/api/gateway/[...path]/route.ts`](../vclaw-ui/app/api/gateway/[...path]/route.ts).
3. **[X] Initialize WebSocket**: `GatewayWsManager` in [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts).
4. **[X] Database persistence (partial → ongoing)**: Prisma + `business.sqlite` back admin CRUD; agent MCP tools such as `vclaw.order.create` in [`vclaw-ui/lib/agent/tools.ts`](../vclaw-ui/lib/agent/tools.ts) write orders/customers. Fully automatic social-inbox → CRM pipelines remain incremental work.

---

## 5. IMPORTANT NOTES
- **CORS / origins**: OpenClaw Core should allow the VClaw UI origin in `gateway.controlUi.allowedOrigins`. Local dev serves on **port 12687** (`pnpm dev` per `vclaw-ui`); include `http://localhost:12687` (and locale paths if you validate full URLs).
- **Error Handling**: Always catch stream interruptions on WebSockets and implement an automatic Reconnect mechanism to avoid Dashboard freezing.
- **Security**: Never hardcode tokens in Frontend source code. Always use Next.js API Routes to hide secret tokens.

---

## 6. OPENCLAW ZERO TOKEN

When the gateway process is [openclaw-zero-token](https://github.com/linuxhsj/openclaw-zero-token) (or any OpenClaw build on a **non-default port**):

| Variable | Role |
| :--- | :--- |
| `OPENCLAW_GATEWAY_URL` | HTTP base for [`/api/gateway/*`](../vclaw-ui/app/api/gateway/[...path]/route.ts) proxy (e.g. `http://127.0.0.1:3001`). |
| `OPENCLAW_GATEWAY_TOKEN` | Server-side `X-Gateway-Token`; must match fork `gateway.auth.token`. |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Same value for browser WebSocket `connect` auth in [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts). |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | Full WebSocket URL if not `ws://127.0.0.1:18789/ws` (see [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts)). |

**Health check:** `GET /api/openclaw-health` returns `{ ok, status, baseUrl }` for Admin UI diagnostics.

**Full matrix and ToS notes:** [14-OpenClaw-Zero-Token-Compatibility](14-OpenClaw-Zero-Token-Compatibility.en.md). Packaged / reference fork preset: [`vclaw-ui/resources/openclaw.vclaw.default.json`](../vclaw-ui/resources/openclaw.vclaw.default.json).
---

## 7. ZALO PERSONAL CHANNEL CONFIGURATION (ZALOUSER)

To integrate personal Zalo, the OpenClaw core configuration must declare the corresponding channel, plugin, and installation information.

**Standard Configuration Sample (`openclaw.default.json`):**
```json
{
  "plugins": {
    "allow": [
      "...",
      "zalouser"
    ],
    "entries": {
      "zalouser": {
        "enabled": true
      }
    },
    "installs": {
      "zalouser": {
        "source": "clawhub",
        "spec": "clawhub:@openclaw/zalouser@2026.3.22",
        "version": "2026.3.22"
      }
    }
  },
  "channels": {
    "zalouser": {
      "enabled": true
    }
  }
}
```

**Specific events:**
- `zalouser.message`: Triggered when a new message is received from a customer on Zalo.
- Agents/plugins may call `zalouser.*` tools inside the OpenClaw loop (the admin UI does not have to use MCP for those flows).

The **zalouser admin** page in `vclaw-ui` prefers the **Gateway WebSocket** (`directory.*`, `send`, `web.login.start`, …). For WS vs SSE vs MCP, env vars, and CLI fallback, see [16-OpenClaw-Gateway-Transport-And-Zalouser-Admin](16-OpenClaw-Gateway-Transport-And-Zalouser-Admin.en.md).

**Further Reading**: [15-Social-Integration-Solution](15-Social-Integration-Solution.en.md).
