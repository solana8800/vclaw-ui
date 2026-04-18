# OPENCLAW FORK TECHNICAL BLUEPRINT
## PROJECT: Building VClaw as a product-fork on OpenClaw

---

## 1. DOCUMENT PURPOSE

This document details how VClaw will be built by forking OpenClaw and using OpenClaw's own capabilities to continue developing VClaw.

The blueprint aims to clearly answer the following questions:

1. Why choose OpenClaw as the technical foundation.
2. Which components of OpenClaw will be reused almost as-is.
3. Which components need customization to turn OpenClaw into VClaw.
4. When to expand using plugins/tools/configs versus modifying the core.
5. How to organize the development process "using OpenClaw to code OpenClaw into VClaw".
6. How the management dashboard for non-technical users will be built.
7. How to expand from a technical operational foundation to a sales support platform for SMBs.

---

## 2. TECHNICAL CONCLUSION SUMMARY

VClaw should be built according to a `controlled product-fork` model:

1. **Do not rewrite the gateway from scratch.**
2. **Do not deviate from OpenClaw's session/channel/plugin architecture in the early stages.**
3. **Maximize OpenClaw as the execution substrate** for Gateway, Control UI, session routing, plugin runtime, config system, and agent prompt runtime.
4. **Focus customization resources on the product layer**: business workflows, onboarding, policy layer, dashboard UX, Vietnamese integrations, and growth automation.

This model helps VClaw:

1. Launch MVP faster.
2. Inherit OpenClaw's multi-channel, agent-native, and self-hosted capabilities.
3. Use OpenClaw itself as the development task coordination tool.
4. Reduce the cost of building foundational infrastructure that doesn't create product differentiation.

An important consequence of this choice is:

1. OpenClaw core continues to be a safe infrastructure layer.
2. VClaw must invest more heavily in `admin surfaces` and `commerce workflows`.
3. Product value for SMBs comes from the management experience and sales logic, not just from "being able to set up a gateway".

---

## 3. WHAT OPENCLAW ALREADY PROVIDES

From the analysis of OpenClaw documentation, the important technical pillars already available include:

### 3.1 Centralized Gateway

OpenClaw operates as a `single long-lived Gateway`, acting as a center for:

1. Channel connections.
2. Session routing.
3. Control plane via WebSocket.
4. HTTP surfaces such as Control UI and canvas host.

This is very suitable for VClaw because the product also needs a `single source of truth` for:

1. Messages from chat channels.
2. Sales and operational flows.
3. Task states such as QR generation, bill check, booking, and reminders.

### 3.2 Existing Control UI

OpenClaw already has a `Control UI` running on the same gateway port, which can:

1. Chat with agents.
2. View sessions and history.
3. Edit config.
4. Manage channels, skills, cron jobs, and nodes.
5. Tail logs and check system status.

VClaw should not reuse this interface as its primary surface because it carries a heavy technical DevOps (Mission Control) characteristic. Instead, VClaw's model is:

1. Hide the original technical Control UI / Terminal from business users.
2. Build an independent **VClaw Business Dashboard** (Next.js Standalone) running on port **8800**.
3. **Inter-server communication**: The Dashboard (port 8800) communicates with the OpenClaw Core Engine (port 12687) via the **MCP (Model Context Protocol)**, WebSocket, and REST API.
4. **Native Shell Orchestration**: Distributed via a 1-click installer: A Native App (Swift) will orchestrate the lifecycle of both processes (Next.js server and Node.js core) and open a WebView pointing to port 8800.

### 3.2.1 Proposed Dashboard Model for VClaw

VClaw's dashboard should follow a `layered admin surfaces` model:

1. **Localhost Web Admin**
   - Is the default surface.
   - Used for onboarding, configuring chat channels, payments, logistics, products/services, and monitoring orders/tasks.
2. **Remote Web Access**
   - Is an advanced mode.
   - Leverages OpenClaw's secure remote access mechanisms such as Tailnet/Tailscale Serve or equivalent tunnels.
3. **Chat-native Admin Surfaces**
   - Are auxiliary surfaces for quick tasks.
   - Can go through Telegram bot menus, Zalo Web Apps, or lightweight task menus per channel.

Principles:

1. Web dashboard is where the seller works daily.
2. Remote access is an optional toggle, not the default.
3. CLI remains for dev/ops, not the primary entry point for sellers.

### 3.3 Config Model and Wizards

OpenClaw already has a strong config model with:

1. `gateway.*`
2. `channels.*`
3. `agents.*`
4. `tools.*`
5. `plugins.*`
6. `skills.*`

VClaw should leverage this model instead of designing a new config system. Customization should focus on:

1. Creating defaults suitable for SMBs.
2. Changing names, labels, and wizard copy.
3. Adding plugin schemas for Vietnamese business logic.

### 3.4 Plugin, Tool, and Channel Runtime

OpenClaw supports TypeScript plugins running in-process, which can register:

1. Gateway RPC methods.
2. HTTP handlers.
3. Agent tools.
4. CLI commands.
5. Background services.
6. Messaging channels.
7. Skills.

This is the most important extension point for developing VClaw without needing deep core modifications yet.

### 3.5 Agent Runtime and System Prompt Assembly

OpenClaw possesses its own system prompt runtime, which can inject:

1. Tool lists.
2. Safety guidance.
3. Skills.
4. Workspace bootstrap files.
5. Runtime metadata.
6. Sandbox state.

VClaw can leverage this mechanism to:

1. Transition from "coding assistant" to "business operations assistant".
2. Inject Vietnamese business policies, personas, and instructions.
3. Create agents specialized for operations, sales, growth, or R&D.

#### 3.6 Browser Automation Capability (Playwright) as a UI Feature

OpenClaw core already integrates `playwright-core` and browser control support modules. VClaw will elevate this capability into a core user interface component (not just a background process):

1. **Overcoming API Limitations**: Integrate Zalo, Facebook, Shopee, and TikTok Shop platforms through actual browser tabs.
2. **Embedded Browser Tabs**: Instead of just a chat window, VClaw allows opening Browser Tabs (Headful) directly within the App Shell. Users can manage orders on the VClaw Dashboard while simultaneously opening a Shopee tab to chat with customers or check competitor prices.
3. **Context-Aware Assistance**: The AI Agent in VClaw "sees" the content in the integrated browser tabs to assist with form filling, extracting order data, or suggesting responses directly on the e-commerce platform interface.
4. **Browser Profiles**: Securely store cookies and login status separately for each account, ensuring shop owners don't have to log in repeatedly.

VClaw will build the **Commerce Web Adapters** layer to automate:
- Synchronizing conversations and orders from currently open browser tabs.
- Automating repetitive manual tasks (e.g., bulk printing shipping labels from marketplace websites).

---

## 4. RECOMMENDED ARCHITECTURAL MODEL FOR VCLAW

### 4.1 Reusable OpenClaw Core (Engine - Port 12687)

Parts that should be kept as original as possible, acting as the "Intelligent Backend":

1. Gateway daemon.
2. WebSocket protocol between gateway and clients/nodes.
3. **MCP Server**: Providing Tools and Context to the VClaw UI.
4. Session management and multi-agent routing.
5. Technical Control UI (kept for tech ops).
6. Plugin/channel/tool runtime.
7. Config loading, validation, and persistence.
8. System prompt assembly pipeline.

### 4.2 VClaw Product Layer

Product differentiation parts should be placed here:

1. Rebranding to VClaw.
2. Onboarding for small business households.
3. Configuration flows for payments, logistics, and bookings.
4. Business workflows:
   - VietQR generation
   - Bill verification
   - Address normalization
   - Ship estimate
   - Booking/reminder
   - Content assistance
   - Lead follow-up
   - Campaign drafting
   - Guarded auto-consultation
5. Policy/confirmation layer for sensitive actions.
6. Simplified dashboard for non-technical users.
7. Commerce admin console for configuration and sales operations.

### 4.3 VClaw Growth and Self-Improvement Layer

Expansion layer after MVP or in a near-term growth phase:

1. Market intelligence.
2. Lead discovery.
3. Campaign assistance.
4. Sales automation guardrails.
5. Trend analysis.
6. Skill discovery engine.
7. Sandbox prototyping.
8. Approval-gated release pipeline.

---

## 5. PLUGIN OR CORE DECISIONS

### 5.1 When to Build with Plugin / Tool / Config

Prioritize extensions if requirements fall into these groups:

1. Adding new partner integrations such as QR providers, OCR providers, and delivery providers.
2. Adding new business tools for agents.
3. Adding channel plugins or customizing existing channel behavior.
4. Adding commands, hooks, or background services.
5. Adding business rules, skills, or templates.
6. Adding new config schemas for business modules.
7. Adding admin quick actions for Telegram/Zalo or other chat-native surfaces.
8. Adding approval queues, rate-limit policies, or outbound schedulers for content and follow-up workflows.

### 5.2 When to Modify OpenClaw Core

Only modify the core when requirements fall into these groups:

1. Need to change gateway control plane behavior.
2. Need to add new semantics to WebSocket/API protocol.
3. Need to deeply change the onboarding shell and setup lifecycle.
4. Need to modify session/routing model to fit the product.
5. Need to change the Control UI shell, not just add panels.
6. Need to change the way system prompts are assembled at the framework level, not just the injected content.

### 5.3 Decision Rules

Every new requirement needs to be classified according to the matrix:

1. `Can configure`
2. `Can extend via plugin`
3. `Needs product-layer code`
4. `Needs core fork`

Only when it falls into the `Needs core fork` group is a divergence increase with upstream allowed.

---

## 6. HOW TO USE OPENCLAW TO BUILD OPENCLAW INTO VCLAW

### 6.1 Proposed Dev Loop

1. Run the local gateway of the VClaw repo itself.
2. Open the Control UI or a dev chat channel.
3. Bind a development-specialized agent to the VClaw repo workspace.
4. Inject bootstrap files and technical documentation into the agent context.
5. Assign tasks to the agent via chat, Control UI, or CLI.
6. The agent reads the source code, edits documentation, creates patches, runs checks, and records results.

### 6.1.1 Use the Dashboard to Develop the Dashboard

VClaw should immediately dogfood its own web management surface:

1. Use Control UI/Web Admin to configure the development environment.
2. Use agents within the repo to edit UI labels, panel logic, and business workflows.
3. Test dashboard usability by seeing if a non-technical operator can complete primary tasks without using CLI.

### 6.2 Proposed Agent Model

At least three agent profiles should be created:

1. `vclaw-core`
   - Specialized in gateway, routing, config, control UI shell, and upstream sync.
2. `vclaw-business`
   - Specialized in business workflows, prompts, rules, tools, and localization.
3. `vclaw-rnd`
   - Specialized in growth automation, market intelligence, and self-improvement sandbox.

This directly leverages OpenClaw's multi-agent routing instead of mixing all responsibilities into a single agent.

### 6.3 Workspace Strategy

1. One main workspace for the product fork.
2. Can use separate sessions or agents for each work branch.
3. For high-risk experiments, use separate sandboxes or worktrees.

### 6.4 Dogfooding Strategy

VClaw should be used to serve the development team early on:

1. Chat with agents to request documentation edits.
2. Use sessions to track tasks.
3. Use Control UI to view logs, config, and status.
4. Use plugins/hooks to automate internal tasks.

If the system doesn't help the dev team work faster on its own repo, it's likely not good enough for end-users yet.

---

## 7. PROPOSED SOURCE ORGANIZATION

### 7.1 Parts to Keep Near Upstream

1. `src/infra`
2. `src/cli`
3. `src/channels`
4. `src/terminal`
5. Control plane and gateway transport parts

Principles:

1. Limit modifications unless truly necessary.
2. If modified, clearly state the product reason.
3. Prioritize maintaining compatibility with upgrade paths from upstream.

### 7.2 Parts to Add or Expand for VClaw

1. `src/vclaw` or equivalent namespace for business modules.
2. `extensions/*` for Vietnamese business plugins.
3. `docs/` for product docs and technical blueprints.
4. New UI panels or flows in Control UI for onboarding and operations.
5. Shared commerce modules for leads, customers, order-like workflows, and follow-ups.
6. Growth modules for content drafts, campaign queues, follow-up policies, and outbound approvals.

### 7.3 Parts to Separate from Core

1. Market intelligence.
2. Lead discovery.
3. Campaign assistant.
4. Skill discovery/sandbox.
5. Local-specific providers.
6. Outbound scheduling and policy engines if multi-channel growth automation expands later.

These parts should be separated as much as possible so as not to turn OpenClaw's core into a vertical industry product.

---

## 8. PHASED FORK PLAN

### Phase A - Foundation Fork

Goal:

1. Fork repo and clarify reusable/custom boundaries.
2. Basic rebranding.
3. Establish agents/workspaces to use OpenClaw to develop VClaw.

Output:

1. VClaw repo is running.
2. Gateway and Control UI operate under the new product identity at a minimum level.
3. Clear blueprints and dev rules in place.

### Phase B - Business Workflow Enablement

Goal:

1. Add P1 business modules.
2. Integrate Vietnamese providers.
3. Add policy/confirmation to all sensitive flows.

Output:

1. VietQR, bill verification, ship estimate, and booking/reminder are running end-to-end.

### Phase C - Productization (Sidecar Integration)

Goal:

1. Build the VClaw UI (Next.js) in **Standalone Mode**.
2. Configure VClaw UI to run on port **8800** as the default interface.
3. Configure OpenClaw Core to run on port **12687** ensuring local security.
4. Synchronize Context and control via **MCP**.
5. Release the **VClaw Native Shell** (Swift) to bundle the entire server and Node.js runtime if necessary.

### Phase D - Growth Automation

Goal:

1. Add market intelligence, lead discovery, and campaign assistance.
2. Create guarded sales automation.
3. Bring content drafting, approval queues, and follow-up orchestration into the product layer before increasing automation depth.

### Phase D.1 - Generic SMB Commerce

Before going deep into specific verticals like ticketing, VClaw should add a general commerce layer for SMBs:

1. Lead intake and lead follow-up.
2. Customer history and tagging.
3. Basic catalog/service listing.
4. Unified order-like or booking-like workflows.
5. Connections with online sales sources in step-by-step configurations.
6. Content assistance and campaign assistance at the draft + approval level.
7. Guarded auto-consultation for sufficiently structured intents.

### Phase E - Self-Improvement Sandbox

Goal:

1. Create trend analysis and skill discovery proposals.
2. Test self-improvement workflows in a sandbox environment.
3. Maintain approval-gated release mechanism.

---

## 9. MAIN TECHNICAL RISKS

### 9.1 Deep Divergence with Upstream

Risk:

1. Hard to update bug fixes from OpenClaw.
2. Maintenance costs increase.
3. Loss of ability to reuse community plugins/ecosystem.

Mitigation:

1. Plugin-first.
2. Mandatory record of divergence.
3. Periodic review of core changes.

### 9.2 Product UX Not Simple Enough

Risk:

Original OpenClaw is aimed at power users and developers, while VClaw targets non-technical SMB users.

Mitigation:

1. Minimalist dashboard.
2. Change display language to business tasks.
3. Package onboarding by use case instead of technical concepts.

### 9.3 Plugin Sprawl

Risk:

If everything is pushed into plugins without a clear architecture, VClaw will fragment.

Mitigation:

1. Define module standards.
2. Clearly classify P1 business modules, growth modules, and R&D modules.
3. Regulate naming, ownership, and config schema.

### 9.4 Uncontrolled Self-Improvement

Risk:

Capabilities like skill discovery or auto-improvement easily slide into risky zones if touching production directly.

Mitigation:

1. No auto-merging.
2. No auto-modifying running runtime.
3. All proposals must go through sandbox and approval.

---

## 10. LIST OF DECISIONS TO BE FINALIZED EARLY

1. What is the primary channel for the MVP.
2. How long to maintain config compatibility with OpenClaw.
3. Whether Control UI will be partially rebranded or a completely separate product shell.
4. Which business modules are plugins, internal modules, or core changes.
5. Whether to maintain periodic upstream syncs or accept hard divergence in some areas.
6. Whether agent structure for the dev team will follow domains or technical layers.
7. Whether remote access is enabled by default or only on-demand.
8. Which chat-native admin surfaces will be prioritized first: Telegram, Zalo, or both.
9. Whether the general commerce layer will use its own data model or be directly attached to existing session/activity models.

---

## 11. CONCLUSION

The most suitable technical option currently is:

1. **Use OpenClaw as the execution infrastructure.**
2. **Use a product-fork to repackage it into VClaw.**
3. **Use OpenClaw itself to develop VClaw daily.**

This is the most balanced choice between product speed, ability to leverage the existing platform, and the level of control necessary to create a vertical product for the Vietnamese market.
