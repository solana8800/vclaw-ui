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
Connects to `ws://127.0.0.1:18789/ws`. Uses a JSON-RPC 2.0 based protocol with a challenge-response handshake.

**Core Methods:**
- `connect`: Initial handshake with client capabilities and token.
- `chat.send`: Send message to a session (e.g., `agent:main:main`).
- `config.apply`: Dynamically update core settings.

**Key Events:**
- `connect.challenge`: Received upon connection, requires a `connect` response.
- `agent`: Streams agent state (thinking phase, tool start/end).
- `chat`: Streams message deltas and final response.

**Implementation Example (`lib/gateway-client.ts`):**
```typescript
class GatewayWsManager {
  connect(opts: GatewayWsOptions) {
    this.ws = new WebSocket("ws://127.0.0.1:18789/ws");
    this.ws.onmessage = (ev) => {
      const frame = JSON.parse(ev.data);
      if (frame.event === "agent") {
        // Handle thinking/tool events
      }
    };
  }
  
  async request(method: string, params: any) {
    this.ws.send(JSON.stringify({ type: "req", method, params }));
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
**Location:** `app/api/gateway/[...path]/route.ts`
Handles token injection and CORS management.

```typescript
// app/api/gateway/[...path]/route.ts
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Proxies request to OpenClaw and adds X-Gateway-Token header
```

### 3.2. Client SDK Layer (`lib/gateway-client.ts`)
Unified client for REST and WebSocket communication. Exported as `gatewayClient` and `gatewayWs`.
Used by UI components like `ai-chat-assistant.tsx`.

---

## 4. DEVELOPER EXECUTION CHECKLIST

1. **[X] Environment Variables**: `OPENCLAW_GATEWAY_TOKEN` configured in `.env.local`.
2. **[X] API Proxy Setup**: Route Handler active at `app/api/gateway/[...path]/route.ts`.
3. **[X] Initialize WebSocket**: `GatewayWsManager` logic finalized in `lib/gateway-client.ts`.
4. **[ ] Database Persistence**: Map agent results to `business.sqlite` records for order tracking.

---

## 5. IMPORTANT NOTES
- **CORS Handling**: OpenClaw Core must be configured with `gateway.controlUi.allowedOrigins` to allow `localhost:3000` (Next.js) for WebSocket connections.
- **Error Handling**: Always catch stream interruptions on WebSockets and implement an automatic Reconnect mechanism to avoid Dashboard freezing.
- **Security**: Never hardcode tokens in Frontend source code. Always use Next.js API Routes to hide secret tokens.
