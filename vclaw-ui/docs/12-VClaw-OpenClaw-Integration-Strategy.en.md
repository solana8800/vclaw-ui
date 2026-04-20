# VCLAW UI AND OPENCLAW CORE INTEGRATION STRATEGY

---

## 1. PURPOSE
This document provides a detailed analysis of the communication architecture between the **VClaw Admin (Operations Console - Next.js)** and the **OpenClaw Core**. It also outlines the database strategy to ensure the system maintains AI automation standards while remaining flexible for VClaw's specific business requirements.

---

## 2. COMMUNICATION PROTOCOLS ANALYSIS

The OpenClaw Core provides a powerful Gateway supporting multiple protocols. VClaw Admin (`vclaw-ui/app/admin`) interacts with the core through a combination of three standards, depending on the business context:

### 2.1. Native WebSocket (Real-time Streaming & Events)
The OpenClaw Core and VClaw Admin rely on standard WebSockets for real-time status streaming and session management.
- **Application in VClaw**: Used for tasks requiring real-time updates.
  - **Task Inbox Manager**: When a bill is pending approval or a new event occurs, the notification is pushed via WebSocket `chat` or `agent` events.
  - **Agent Live Monitoring**: Real-time tracking of Agent activity (e.g., thinking phases, tool usage).
- **Current Status**: Implemented in `lib/gateway-client.ts` using `GatewayWsManager`.

### 2.2. REST API / Proxy (CRUD & Command Execution)
The OpenClaw Gateway supports HTTP APIs. VClaw UI uses a Next.js Proxy to interact with these safely.
- **Application in VClaw**: Dedicated to synchronous and static actions.
  - Fetching/updating system configurations.
  - Basic Health Check and Model listing.
- **Current Status**: Proxied via `/api/gateway/*` in `vclaw-ui`.

### 2.3. MCP (Model Context Protocol) via JSON-RPC (Primary Controller)
OpenClaw operates according to the MCP standard. This is the primary protocol for the VClaw UI to command the OpenClaw Core.
- **Application in VClaw**: 
  - VClaw UI acts as an **MCP Client**.
  - It invokes tools via the `/mcp/v1/tools/call` endpoint.
  - Example: Calling `vclaw.bill_verifier` to analyze a payment receipt.
- **Current Status**: Supported via `gatewayClient.callTool` in `lib/gateway-client.ts`.

---

## 3. DATABASE MANAGEMENT STRATEGY

### 3.1 Status of OpenClaw DB
OpenClaw currently uses an internal database (SQLite or LevelDB engine) specialized for:
- **Agent State & Memory**: Conversation history, session data, context awareness.
- **System Config & Logs**: Gateway configurations, static API keys, Tool execution logs.

### 3.2 Should VClaw Add its Own Business Database?
**The answer is YES.** VClaw Admin must be equipped with its own **Separate Embedded Database** (SQLite with **Prisma / Drizzle ORM** is the recommended choice for a Next.js application).

### 3.3 Rationale for Separate Databases
Using the OpenClaw Core DB for business operations is a **significant architectural risk** for several reasons:

1. **Separation of Concerns:**
   - *OpenClaw DB*: Specialized for AI, Agent runtime, and pure conversation history.
   - *VClaw Business DB*: Manages strictly structured Business Entities such as `Order`, `Customer`, `Booking`, and `Invoice/Bill`. This data requires complex queries, multi-table JOINs, and financial reporting.

2. **Upgradability & Product-Fork Safety:**
   - OpenClaw is an upstream project with a high velocity of change. If they update the Core DB Schema and VClaw's sales data is stored there, the update could break the VClaw application.
   - Separate SQLite files allow us to easily rebase/update OpenClaw source code while keeping VClaw’s business data assets intact.

3. **Aligns with "Local-first" MVP Architecture:**
   - The 1-click installer will launch two servers simultaneously:
      - **VClaw UI Server**: Port **12687** (Next.js Standalone Server providing full Middleware/API Routes support).
      - **OpenClaw Core Engine**: Port **18789** (Node.js daemon orchestrating Agents and AI).
   - Business data (`business.sqlite`) remains local on the shop owner's machine, ensuring security and easy backups.

### 3.4 Data Interaction Diagram (Next.js App)
```mermaid
graph TD
    Client["Browser (Shop Owner)"] --> UI["VClaw UI (Port 12687)"]
    
    subgraph VClaw Logic
        UI --> BizAPI["Next.js Server Actions / API Routes"]
        BizAPI <--> ORM["Prisma / SQLite"]
        ORM <--> BizDB[("VClaw Business DB")]
    end

    subgraph OpenClaw Engine
        UI <-->|"WebSocket / MCP"| Gateway["OpenClaw Gateway (Port 18789)"]
        BizAPI <-->|"MCP / REST API"| Gateway
    end
    
    subgraph OpenClaw Core
        Gateway <--> Agent["OpenClaw Agent Runtime"]
        Agent <--> CoreDB[("OpenClaw Core DB")]
    end
```

## 4. CONCLUSION AND PROGRESS
1. **Database Deployment**: [DONE] `business.sqlite` is initialized with Prisma within `/vclaw-ui`.
2. **Real-time Channel Setup**: [DONE] Native WebSocket connection is established in `lib/gateway-client.ts` and integrated into the Admin UI.
3. **Control via MCP**: [DONE] Tool calling interface implemented via REST proxy, allowing full agentic automation.
