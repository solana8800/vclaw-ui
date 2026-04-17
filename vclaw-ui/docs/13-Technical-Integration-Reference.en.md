# TECHNICAL REFERENCE: CONNECTING VCLAW ADMIN TO OPENCLAW CORE

---

## 1. INFRASTRUCTURE OVERVIEW
The VClaw system operates on a Gateway-Client model.
- **OpenClaw Core (Gateway)**: Runs on the default port `18789`.
- **VClaw Admin (Next.js)**: Acts as the Client, interacting via HTTP REST, WebSocket, and MCP.

---

## 2. API ENDPOINTS DETAIL

### 2.1. REST API (HTTP)
These endpoints support CRUD operations and one-off command dispatches.

| Function | Method | Full Path | Notes |
| :--- | :--- | :--- | :--- |
| **OpenAI-Compatible Chat** | POST | `http://127.0.0.1:18789/v1/chat/completions` | Fully compatible with OpenAI SDK |
| **Dispatch to Agent** | POST | `http://127.0.0.1:18789/hooks/agent` | Used to dispatch tasks (bill verification, address, etc.) |
| **Session History** | GET | `http://127.0.0.1:18789/sessions/{id}/history` | Retrieve detailed conversation history |
| **Direct Tool Invocation**| POST | `http://127.0.0.1:18789/tools/invoke` | Call a specific Tool (e.g., `vietqr.generate`) |
| **List Models** | GET | `http://127.0.0.1:18789/v1/models` | Check available LLMs |
| **Health Check** | GET | `http://127.0.0.1:18789/health` | Check Gateway status |

**Required Headers:**
```http
Authorization: Bearer <OPENCLAW_GATEWAY_TOKEN>
Content-Type: application/json
```

---

### 2.2. WebSocket (Real-time Events)
Uses the same port `18789`. This is the primary communication channel for the Dashboard.

**Methods (Sent to Gateway):**
- `logs.subscribe`: Subscribe to system log streams.
- `chat.completions`: Send chat messages and receive streaming results.
- `config.get` / `config.apply`: Read and write Gateway configuration.

**Events (Received from Gateway):**
- `GATEWAY_EVENTS`: Events regarding Agent status, Sessions, or background task results.

**Sample Code (Frontend):**
```typescript
import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:18789", {
  extraHeaders: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_GATEWAY_TOKEN}`
  }
});

socket.on("connect", () => {
  console.log("Connected to OpenClaw Core");
  // Subscribe to a specific session
  socket.emit("sessions.subscribe", { sessionId: "current-session-id" });
});

socket.on("session.message", (data) => {
  console.log("Agent response:", data.message);
});
```

---

### 2.3. MCP (Model Context Protocol)
MCP supports Context and Tool exchange via JSON-RPC 2.0 over HTTP POST.

**Endpoint:** `http://127.0.0.1:18789/tools/invoke` (This is OpenClaw's MCP wrapper).

**Sample Request (Calling bill verification skill):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "vclaw.bill_verifier",
    "arguments": {
      "image_url": "path/to/bill.jpg",
      "expected_amount": 500000
    }
  },
  "id": 1
}
```

---

## 3. CODE STRUCTURE IN NEXT.JS ADMIN

To manage connections professionally, avoid exposing tokens on the client side, and ensure maintainability, VClaw Admin should organize code as follows:

### 3.1. Middleware Layer (Next.js API Routes)
**Location:** `app/api/vclaw/[...path]/route.ts`
This acts as a "bridge." Instead of the UI calling port 18789 directly (which can lead to CORS issues or token exposure), it calls Next.js's own API.

```typescript
// sample: app/api/vclaw/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const targetPath = params.path.join('/');
  const coreUrl = `http://127.0.0.1:18789/${targetPath}`;
  
  const body = await req.json();
  
  const response = await fetch(coreUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

### 3.2. Client SDK Layer (lib/openclaw)
**Location:** `lib/openclaw/client.ts`
Contains helper functions for type-safe API calls from the UI.

```typescript
// lib/openclaw/client.ts
export const openClawClient = {
  dispatchTask: async (agentId: string, message: string) => {
    const res = await fetch('/api/vclaw/hooks/agent', {
      method: 'POST',
      body: JSON.stringify({ agentId, message })
    });
    return res.json();
  },
  // Other functions...
};
```

---

## 4. DEVELOPER EXECUTION CHECKLIST

1. **[ ] Environment Variables**: Add `OPENCLAW_GATEWAY_TOKEN` to the `.env.local` file of `vclaw-ui`.
2. **[ ] API Proxy Setup**: Create the Route Handler at `app/api/vclaw/[...path]/route.ts` to wrap requests to the Core.
3. **[ ] Initialize WebSocket**: Create a Context Provider (e.g., `OpenClawProvider`) wrapping the Admin Layout to maintain a single Socket connection.
4. **[ ] Database Schema**: When receiving results from `hooks/agent`, store the identifier (runId) in the `business.sqlite` (Next.js) for future order status lookups.

---

## 5. IMPORTANT NOTES
- **CORS Handling**: OpenClaw Core must be configured with `gateway.controlUi.allowedOrigins` to allow `localhost:3000` (Next.js) for WebSocket connections.
- **Error Handling**: Always catch stream interruptions on WebSockets and implement an automatic Reconnect mechanism to avoid Dashboard freezing.
- **Security**: Never hardcode tokens in Frontend source code. Always use Next.js API Routes to hide secret tokens.
