# VCLAW UI AND OPENCLAW CORE INTEGRATION STRATEGY

---

## 1. PURPOSE
This document provides a detailed analysis of the communication architecture between the **VClaw Admin (Operations Console - Next.js)** and the **OpenClaw Core**. It also outlines the database strategy to ensure the system maintains AI automation standards while remaining flexible for VClaw's specific business requirements.

---

## 2. COMMUNICATION PROTOCOLS ANALYSIS

The OpenClaw Core provides a powerful Gateway supporting multiple protocols. VClaw Admin (`vclaw-ui/app/admin`) interacts with the core through a combination of three standards, depending on the business context:

### 2.1. WebSocket / Socket.IO (Real-time Streaming & Events)
The OpenClaw Dashboard (`Control UI`) relies on WebSockets for log streaming and session lifecycle management.
- **Application in VClaw**: Used for tasks requiring real-time updates.
  - **Task Inbox Manager**: When a bill is pending approval or a new Zalo message triggers an Agent alert, the event must be pushed immediately to the UI for the user (shop owner) to act on.
  - **Agent Live Monitoring**: Real-time tracking of Agent activity (e.g., running Playwright to fetch orders from Shopee).
- **Recommendation**: Use as the primary protocol for the interaction loop between users and Agents (Human-in-the-loop).

### 2.2. REST API (CRUD & Command Execution)
The OpenClaw Gateway supports HTTP APIs (e.g., `/api/sessions`, `/api/config`).
- **Application in VClaw**: Dedicated to synchronous and static actions.
  - Fetching/updating system configurations, Payment, and Shipping settings.
  - Sending simple control commands.
  - Basic Audit Log tracking.
- **Recommendation**: Use for VClaw Admin to initialize the interface and perform traditional static data management.

### 2.3. MCP (Model Context Protocol) via HTTP/SSE (Primary Controller)
OpenClaw operates according to the MCP standard (`src/gateway/mcp-http.protocol.ts`). MCP is the primary protocol for the VClaw UI (Control) to command the OpenClaw Core (Engine).
- **Application in VClaw**: 
  - VClaw UI acts as an **MCP Client**.
  - It invokes "Tools" from the OpenClaw Core (Engine) running on port **18789** to perform AI actions.
  - Example: Clicking "Approve Order" on the Dashboard (port 12687) sends an MCP request to port 18789 to start the Agent's packaging or confirmation message process.
- **Recommendation**: This is the mandatory technical standard for synchronizing business Context with Agent actions.

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

## 4. CONCLUSION AND IMPLEMENTATION ROADMAP
1. **Database Deployment**: Immediately initialize `business.sqlite` using Prisma within `/vclaw-ui`. Start defining schemas for `TaskInbox`, `Orders`, and `Customers`.
2. **Real-time Channel Setup**: Configure a Socket.IO client to connect to port **18789** of OpenClaw upon application mount.
3. **Control via MCP**: Prioritize using MCP for VClaw UI to invoke analytical skills or automated actions from the OpenClaw Core Engine.
