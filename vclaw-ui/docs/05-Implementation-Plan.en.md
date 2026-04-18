# TECHNICAL IMPLEMENTATION PLAN
## PROJECT: VClaw - MVP Local-first Operations Assistant for Small Businesses in Vietnam

---

## 1. PLAN GOALS

This document describes the implementation of the VClaw MVP in accordance with the BRD and the updated system architecture. The goal is to provide a feasible technical plan in the direction of a `growth + operations assistant`, starting from one primary user segment, one primary communication channel, a strong operational core, and a lightweight growth layer that can create value early:

1. VietQR generation from chat context.
2. Bill verification support.
3. Address normalization and shipping estimation.
4. Basic appointment management and reminders.
5. Near-term content assistance, lead follow-up, and guarded auto-consultation.

This plan does not include items outside the MVP scope, such as self-generating code, self-updating business logic, simultaneous multi-industry expansion, or automated broad operations on the operating system.

---

## 2. IMPLEMENTATION PRINCIPLES

1. **Deploy one end-to-end flow first:** Complete one communication channel and one set of operational workflows before expanding.
2. **Prioritize revenue-critical value:** Items that help close payments, process addresses, confirm transactions, and keep appointments are done first.
3. **Design for early pilot:** Each phase must produce a result that can be tested with real or internal users.
4. **AI supports, does not decide:** Every OCR result, address normalization, or inference from conversation requires an appropriate confirmation threshold.
5. **Keep integration costs low:** Only integrate providers truly necessary for the MVP and near-term growth layer.
6. **Web-first & CRM-lite UI:** The primary management experience must not be a technical dashboard (Mission Control) but a CRM-lite business interface (Operations Console); CLI is a secondary layer for dev/ops.
7. **Guarded growth automation:** Content, follow-up, outbound, and auto-consultation only enter through a draft, approval queue, and policy-first model.

### 2.1 Construction Method: Using OpenClaw to Develop VClaw

VClaw is implemented according to the `product-fork` model on OpenClaw. This means that the development team does not build a completely new system, but leverages OpenClaw itself as the operating platform and simultaneously uses OpenClaw agent workflows to continue developing VClaw.

Implementation Strategy:

1. Use OpenClaw Gateway, Control UI, session runtime, plugin system, and config model as the initial operating foundation.
2. Create specialized agents/workspaces to work directly on the VClaw repo.
3. Use OpenClaw surfaces such as Control UI, chat channels, or CLI to coordinate development tasks, testing, and change reviews.
4. Clearly track the boundaries between `upstream reusable` parts, `VClaw customization` parts, and `VClaw-only business modules`.

Decision-making principles:

1. If a requirement can be achieved through plugins, tools, configs, system prompts, or UI labels, prioritize the extension direction.
2. If a requirement requires changing the behavior of the core control plane, protocol, routing, onboarding shell, or config schema, move it to the core fork branch.
3. Every change to the core must be recorded as a strategic divergence point from upstream OpenClaw.

---

## 3. MVP IMPLEMENTATION SCOPE

### 3.1 In-Scope

1. Local app runtime.
2. Local Web UI for onboarding, configuration, and checking task history.
3. One primary channel adapter.
4. Local database for configuration and operational data.
5. Four business modules FR1-FR4.
6. Basic logging, error handling, and audit trail.
7. A lightweight growth layer including content drafts, follow-up, and controlled auto-consultation.

### 3.2 Out-of-Scope

1. Multi-channel end-to-end in the same phase.
2. Vertical-specific flows such as KOL, real estate, F&B split bill, debt collection.
3. Upstream auto-sync and auto-generated skills.
4. Complete automatic airway bill creation workflow if there is no clear pilot need.
5. Complex permission systems or multi-tenant enterprise.
6. Full-autopilot ads, outbound, or simultaneous multi-channel growth workflows without policy guardrails.

---

## 4. MAIN WORKSTREAMS

### 4.1 Workstream A - Local App Foundation

Scope:

1. Establish a stable local runtime.
2. Normalize environment configurations.
3. Initialize the local database and configuration storage mechanism.
4. Establish minimal logging and audit history.

Output:

1. The application can start stably in the development environment.
2. There is a mechanism to store and load local configurations.
3. There is a basic configuration page for channel connection and essential business information.

### 4.2 Workstream B - Channel Integration

Scope:

1. Choose a primary chat channel for the MVP.
2. Normalize event intake and internal message format.
3. Build an adapter layer separate from the business logic.

Output:

1. Incoming and outgoing messages are received stably via one channel.
2. There is a flow to receive text, images, and basic metadata.
3. Capability to send responses, QR images, and notifications to the same or auxiliary channels.

### 4.3 Workstream C - Payment Workflows

Scope:

1. Generate QR code from amount and reference content.
2. Create bill verification flow with OCR/vision.
3. Design confidence levels and user confirmation steps.

Output:

1. Users can generate VietQR from chat or forms.
2. Users can upload bill photos and receive assisted check results.
3. Every result is recorded in the history for auditing.

### 4.4 Workstream D - Shipping Workflows

Scope:

1. Normalize addresses from natural Vietnamese.
2. Connect with a logistics provider to get estimated fees.
3. Return results to UI or channel.

Output:

1. Addresses are converted to a better-structured format.
2. Estimated shipping fees can be retrieved for successful cases.
3. There is a fallback for missing addresses or external API errors.

### 4.5 Workstream E - Booking Workflows

Scope:

1. Create basic appointments.
2. Check available time slots from the local database.
3. Send appointment reminders according to templates.

Output:

1. Basic appointments can be created, status edited, and viewed.
2. There is a minimal reminder mechanism.
3. There are logs for each reminder sent.

### 4.6 Workstream F - Onboarding and Pilot Readiness

Scope:

1. Minimalize setup flow.
2. Prepare sample data and pilot checklists.
3. Design measurement for usage, retention, and errors.

Output:

1. There is a deployment checklist for pilot users.
2. There are forms or ways to collect feedback after trials.
3. There is a dashboard or report enough to evaluate the MVP.

### 4.7 Workstream G - Fork Foundation and Reusable Core Alignment

Scope:

1. Clearly identify which parts of OpenClaw are kept as-is.
2. Identify which parts of OpenClaw will be rebranded or productized into VClaw.
3. Establish a synchronization process between the VClaw fork and upstream OpenClaw.

Output:

1. List of reusable core components.
2. List of planned divergences at the core level.
3. Plugin-first vs core-fork rules for the development team.
4. Operational documentation for dev workflows using OpenClaw to develop VClaw.

### 4.8 Workstream H - Admin UX and Operations Console

Scope:

1. Remove the DevOps Mission Control layout of the original Control UI. Build a new, decoupled Operations Console (e.g., using Next.js/React stack).
2. Design management screens according to business tasks (Human-in-the-loop task inbox) instead for technical "Terminal/Logging" concepts.
3. Desktop-First Strategy: Package the project as a Native application (.app/.exe) using a Swift host (macOS). The Native Shell will orchestrate the lifecycle of the Next.js Standalone Server (Port 8800) and OpenClaw Core (Port 12687) as sidecars. This mechanism ensures that Middleware and Server Actions are preserved for complex business logic.
for business tasks (Human-in-the-loop task inbox) instead of technical "Terminal/Logging" concepts.

Output:

1. Localhost admin console can be used for onboarding and daily operations.
2. There is a secure remote access model to enable when needed.
3. There is a list of suitable admin quick actions to be deployed via Telegram bot menu or Zalo Web App in later phases.

### 4.9 Workstream I - Generic SMB Commerce Use Cases

Scope:

1. Identify general business use case groups for SMB beyond technical setup.
2. Design data and workflows for leads, orders, follow-ups, and lightweight catalogs.
3. Keep the architecture open to later attach verticals like ticketing or travel resellers.

Output:

1. List of prioritized general commerce use cases.
2. Minimum data model for customers, leads, order-like workflows, and catalog/service entries.
3. Roadmap to expand from generic commerce to vertical-specific commerce.

### 4.10 Workstream J - Growth Assistance and Seller Automation

Scope:

1. Draft post content, captions, and selling messages.
2. Create campaign drafts or follow-up schedules for customer groups.
3. Support guarded auto-consultation for structured repetitive intents.
4. Design approval queues, rate limits, and channel policies for outbound workflows.

Output:

1. A `draft before automation` layer for content and follow-up.
2. At least one growth workflow that can be trialed alongside the operational core.
3. Clear guardrails for outbound messaging and guarded auto-consultation.

### 4.11 Workstream K - Browser Automation & Web Adapters

Scope:

1. Establish Playwright control mechanisms from OpenClaw SDK.
2. Build account adapters for Zalo Web (Personal Account).
3. Implement Headful (QR scan) and Headless background login flows.
4. Manage Browser Profiles for secure session storage.

Output:

1. Capability to open browsers for Zalo/Facebook login from the UI.
2. Agents can read and reply to messages through a platform's web interface.
3. Locally stored cookies/sessions are stable and secure.

---

## 5. 16-WEEK IMPLEMENTATION ROADMAP

### Phase 1 - Problem Validation and Scope Finalization (Weeks 1-2)

Goal:

1. Finalize a pilot segment and a primary channel.
2. Convert BRD into specific use cases.
3. Finalize the list of external integrations truly needed for the MVP.

Items:

1. Define pilot personas and daily use scenarios.
2. Finalize `QR generation`, `bill check`, `address/ship`, and `booking` workflows.
3. Finalize the minimum local data structure.
4. Finalize user confirmation principles in high-risk flows.
5. Finalize the list of reusable OpenClaw components and planned product-fork points.
6. Finalize key management tasks that must appear in the web admin for non-technical users.

Completion Criteria:

1. List of prioritized use cases and acceptance criteria for FR1-FR4.
2. Clear decision on the primary channel and integration providers.
3. Data and workflow map enough to begin construction.
4. Clear classification of `reuse vs customize vs fork-core`.
5. List of prioritized admin workflows and commerce workflows.

### Phase 2 - MVP Foundation Building (Weeks 3-6)

Goal:

1. Complete local runtime, configuration, and the first channel adapter.
2. Have functional local UI and local database.
3. Have basic audit logging and error handling.

Items:

1. Establish local environment and configuration storage.
2. Build Local Web UI for onboarding and task checking.
3. Create a unified `Workflow Orchestrator` and event schema.
4. Integrate the primary channel to receive text and images.
5. Add activity log and task history.
6. Establish initial product-fork branch: basic branding, agent identity, and config defaults for VClaw.
7. Productize Control UI into an admin console using business terminology.

Completion Criteria:

1. Primary channel can be configured and connected from the local UI.
2. Can receive incoming messages and display processing logs.
3. Skeleton workflows for business modules are in place.
4. Development environment where OpenClaw is being used to support VClaw repo development.
5. Admin console simple enough for a pilot user to perform basic setup steps independently.
6. Implementation of the Human-in-the-loop task inbox screen.

### Phase 3 - Core Capability Completion (Weeks 7-10)

Goal:

1. Deploy FR1-FR4 enough for the pilot.
2. Test each flow with simulated and trial data.

Items:

1. Complete VietQR generation module.
2. Complete bill verification module with assisted results.
3. Complete address normalization and estimated shipping fee module.
4. Complete basic appointment and reminder module.
5. Implement Zalo Web Adapter (Personal) using Playwright: enable personal account message monitoring.
6. Add message templates and user confirmations at necessary points.
7. Integrate the above workflows into the admin console so users do not need to operate via CLI.

Completion Criteria:

1. All 4 flows run end-to-end in the internal environment.
2. Common errors are clearly displayed to the user.
3. Enough logging to track successful/failed tasks.
4. Common operational tasks can be performed via the web admin.

### Phase 4 - Near-term Growth Layer (Weeks 11-14)

Goal:

1. Add a lightweight growth layer that creates visible value for online sellers.
2. Preserve the human-in-the-loop and policy-first principle for every outbound flow.

Items:

1. Add content drafting for posts, captions, or selling scripts.
2. Add follow-up drafts and reminder timing for lead states.
3. Add guarded auto-consultation for repetitive intents.
4. Design approval queues for content, follow-up, and outbound actions.
5. Attach source and channel awareness to lead or order-like records when data is available.

Completion Criteria:

1. At least one growth workflow is trialed alongside the operational core.
2. No outbound flow runs without a clear policy or approval rule.
3. Pilot users start seeing VClaw as both a growth tool and an operations tool.

### Phase 5 - Pilot and Lean Refinement (Weeks 15-16)

Goal:

1. Give the product to a small pilot group for real use.
2. Measure adoption, processing time, and errors.
3. Refine flows before deciding to expand.

Items:

1. Onboard the first pilot group.
2. Monitor counts of QR generation, bill checks, shipping estimates, bookings, and growth-workflow usage.
3. Record issues with onboarding, integration, outbound policy, and AI quality.
4. Prioritize fixing bugs and removing friction steps.
5. Test remote access needs and suitable admin actions for chat-native surfaces.
6. Release Beta Desktop (.dmg) integrating the Standalone Dashboard and Core Engine.

Completion Criteria:

1. At least 2 weeks of usage data available from the pilot group.
2. Summary report of what works and what hasn't met expectations.
3. Clear decision for the next expansion step.
4. Clear decision between `localhost only` or `remote-enabled by default` for the next phase.

---

## 6. FEATURE PRIORITIZATION

### P1 - Must-have for pilot

1. Local setup and basic configuration.
2. One primary channel adapter.
3. VietQR generation.
4. Assisted bill verification.
5. Address normalization and ship fee estimate.
6. Basic booking and reminders.
7. Minimal audit log and error handling.
8. Clear fork foundation between OpenClaw core and VClaw product layer.
9. Admin console usable for non-technical pilot users.

### P2 - Should-have if P1 stabilizes early

1. Context-based response templates.
2. Daily task reports.
3. Advanced reminder rules.
4. Controlled remote web access.
5. Admin quick actions via chat-native surfaces.
6. Content drafting and campaign drafts at the approval-queue level.
7. Guarded lead follow-up.
8. Guarded auto-consultation for repetitive structured intents.

### P3 - Post-MVP

1. Simultaneous multi-channel support.
2. Vertical-specific workflows per industry.
3. Cloud sync or multi-device management.
4. Automatic airway bill creation.
5. Feature suggestion mechanisms from usage data.
6. Automated market analysis, lead discovery, and promotional support.
7. Self-improvement layers like skill discovery or sandbox prototyping.
8. Vertical-specific commerce like ticketing, attraction sales, or B2B agents.
9. Large-scale outbound automation or auto-publishing across multiple platforms without approvals.

---

## 7. TECHNICAL DEPENDENCIES

1. One integrated channel that can be used stably for pilot.
2. A suitable QR service or VietQR generation mechanism.
3. An OCR/vision provider good enough with real transfer photos.
4. A logistics partner with API for shipping fees or address data.
5. Notification mechanism suitable for the chosen channel.
6. OpenClaw documentation clear enough to identify extension points such as gateway, config, control UI, plugins, and system prompt.
7. A policy or rules layer clear enough to govern outbound, follow-up, and guarded auto-consultation.

If a dependency is unstable, the implementation team needs a fallback plan from the start, for example:

1. Switch from automated to semi-automated.
2. Request more manual confirmations.
3. Reduce the scope of the affected module.

### 7.1 Platform Dependencies from OpenClaw

VClaw depends heavily on several OpenClaw pillars:

1. Gateway as the single source of truth for sessions, routing, and channel connections.
2. Control UI as the browser control plane layer running on the same port as the gateway.
3. Plugin runtime as the primary extension point for adding channels, tools, hooks, CLI commands, and background services.
4. Config model provided as the centralized configuration point for channels, tools, agents, gateway, and plugins.
5. System prompt assembly is the suitable mechanism to inject business context, identity, and skills without rewriting the entire runtime prompt stack.

---

## 8. TESTING AND QUALITY ASSURANCE

### 8.1 Required Testing

1. Unit tests for each data processing module.
2. Integration tests for channel adapters and external providers.
3. Minimal end-to-end tests for the 4 main flows.
4. Manual pilot checklist for onboarding and common error scenarios.

### 8.2 Testing Data to Prepare

1. Sample messages with amounts and payment content.
2. Successful, wrong amount, wrong content, and low-quality transfer photos.
3. Diverse set of Vietnamese addresses for normalization.
4. Sample appointment set for a small service.
5. Sample prompts and content sets for promotion, follow-up, and auto-consultation.

### 8.3 Quality Criteria Before Pilot

1. Installation flow does not require terminal operation.
2. Each main flow has a successful result and easy-to-understand error reporting.
3. No important business action occurs without a log or lookup history.
4. No outbound workflow runs without a policy, approval state, or audit trail.

---

## 9. IMPLEMENTATION RISKS

| Risk | Impact | Mitigation |
|---|---|---|
| Choosing wrong first channel | Slows entire MVP due to integration hurdles | Evaluate channels based on stability, pilot capability, and support cost |
| OCR not accurate enough | Bill verification causes loss of trust | Design for assisted confirmation, not auto-closing |
| Real-world addresses too diverse | Ship estimate fails or errors frequently | Prepare real address datasets and add manual editing steps |
| Difficult onboarding | Users quit halfway | Reduce setup steps, have checklists and instruction screens |
| Scope creep | Losing focus, pilot delay | Lock P1/P2/P3 from the beginning |
| Large divergence from upstream OpenClaw | Fork maintenance cost increases rapidly | Apply plugin-first principle, record core divergences, and review periodically |
| Growth automation becomes spammy or inaccurate | Loss of trust and damage to seller brand | Policy-first, approval queue, rate limits, and fallback to draft mode |

---

## 10. EXPECTED OUTPUT AFTER MVP

After 16 weeks, the implementation team should have:

1. A VClaw MVP running locally, usable with one primary chat channel.
2. Four core capabilities stable enough for pilot.
3. A lightweight growth-assistance layer stable enough for real trial use.
4. Usage data and real feedback from the first user group.
5. A basis to decide on expanding by vertical, adding channels, or increasing automation levels.

---

## 11. POST-MVP EXPANSION PLAN

### Phase 5 - Business Growth Automation (Reference: 4-8 weeks after pilot)

Goal:

1. Expand VClaw from an operational assistant to a revenue growth assistant.
2. Add market research, lead generation support, and controlled promotional support workflows.

Items:

1. Build `Market Intelligence Module` to aggregate market signals and industry trends.
2. Build `Lead Discovery Module` to identify and rank potential customers by specific criteria.
3. Build `Campaign Assistant Module` to propose promotional content, follow-up schedules, and sales scenarios.
4. Add `Sales Automation Guardrail` to control frequency, targets, and automation levels per channel.

Completion Criteria:

1. Users can view market insights or lead suggestions from allowed data.
2. Promotional content or follow-ups can be generated and approved via semi-automated workflows.
3. No automated outreach flow runs without clear policy configuration.

### Phase 6 - Skill Discovery and Self-Improvement R&D (Reference: after sufficient data available)

Goal:

1. Create a foundation for VClaw to self-detect improvement opportunities.
2. Ensure every self-improvement capability goes through a sandbox and approval mechanism.

Items:

1. Build `Trend Analysis Engine` from usage logs, user feedback, and market data.
2. Build `Skill Discovery Engine` to generate proposals for new workflows, rules, or modules.
3. Build `Sandbox Prototyping Environment` to evaluate prompts, rules, or technical prototypes.
4. Build `Approval-Gated Release Pipeline` to manage the `proposal -> sandbox -> evaluation -> review -> approval -> release` flow.

Completion Criteria:

1. The system can self-generate structured proposals for new improvements.
2. No new source code or skill is introduced into production without review.
3. There is an evaluation and rollback mechanism for every approved change.

---

## 12. CONCLUSION

This implementation plan is built to turn VClaw from a broad idea into a quickly verifiable MVP. The focus is not on creating many skills, but on doing a few workflows with clear business value right, with stable operation and good enough quality for users to return and use.

After the MVP proves its value, VClaw can expand in two major directions: `Business Growth Automation` and `Autonomous Product Evolution`. Both directions are considered post-pilot stages and must be accompanied by risk control, sandbox, and clear approval mechanisms.
