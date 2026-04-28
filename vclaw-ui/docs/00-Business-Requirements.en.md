# BUSINESS REQUIREMENTS DOCUMENT (BRD)
## PROJECT: VClaw - Operations and Sales Assistant for Social Commerce Sellers in Vietnam

---

## 1. EXECUTIVE SUMMARY

VClaw is a lightweight **Business Operating System (Business OS)** with an independent management dashboard. It uses OpenClaw Core as a **stable runtime and connectivity layer**; the product vision, data model, and seller workflows are **VClaw-native** and oriented to outcomes OpenClaw alone does not optimize for.

The product focuses on automating tedious operational tasks for business owners, while possessing its own business database (Prisma + SQLite) to manage customers and orders professionally directly on the local computer.

The core business hypothesis of the project is that individual users will be willing to install and maintain an AI tool if it helps them close orders faster, maintain better sales and follow-up rhythm, reduce repetitive actions, and limit daily revenue loss.

In the MVP stage, VClaw does not pursue the ambition of becoming a "comprehensive multi-industry" platform. Instead, the product will focus on a primary user group, high-value scenarios, and a feature set small enough to be deployed, measured, and iterated within 3-6 months.

### 1.1 Product Strategy relative to OpenClaw

VClaw is a **commerce-first, next-generation layer**: it keeps OpenClaw for proven infrastructure (gateway, routing, multi-agent, plugin runtime) and invests differentiation in **business data, Vietnamese workflows, policy/approval, and the SMB operations console**—so the shipped product is **materially ahead** of a stock OpenClaw assistant for closing orders and running a shop.

OpenClaw supplies the engine; VClaw defines the **product surface, domain model, and guardrails** that turn generic AI connectivity into a focused operating system for social-commerce sellers.

Components expected to be reused from OpenClaw:

1. Long-running Gateway acting as a hub for channel connections, session routing, and control plane.
2. WebSocket protocol between gateway, control UI, CLI, and nodes.
3. Control UI/dashboard running on the same gateway port for chat, configuration, and system status.
4. Plugin/channel/tool model to add new integrations and business logic without modifying the entire system.
5. Agent system, sessions, bootstrap context, and system prompt assembly.

Components expected to be customized for VClaw:

1. Product positioning, onboarding, and experience tailored for social commerce sellers in Vietnam.
2. Specific business workflows such as VietQR, bill verification, address standardization, appointments, and growth workflows like content assistance, lead follow-up, and campaign assistance.
3. Policy/confirmation layer for sensitive actions regarding payments, operations, and automation.
4. Skill system, tools, plugins, and dashboard labels serving Vietnamese use cases instead of default personal/coding assistant use cases.

Development principles:

1. **Inherit and Optimize**: Reuse stable OpenClaw modules to focus resources on building high-value features for closing orders and revenue growth.
2. **Deep Upgrading**: Develop specialized Skill and Tool sets that are not present in the default OpenClaw, turning VClaw into a dedicated sales tool.
3. **Superior Experience**: Refine the entire core to ensure the lowest latency and highest compatibility with Vietnamese commercial platforms.

### 1.2 Management Interface

VClaw is packaged as a **Desktop Application** for non-technical users to operate easily. Due to the nature of the Vietnamese SMB audience, the VClaw interface **must not** look like a "DevOps Mission Control" or a technical AI dashboard (with CPU, RAM, Terminal metrics). Instead, it must be an **Operations Console (Digital Workspace / CRM-lite)** focusing entirely on the business perspective.

Proposed management surfaces:

1. **Desktop Operations Console is the primary surface:** providing a professional sales application experience. Used to view the task inbox (Human-in-the-loop), business statistics, connect chat channels, configure payments (VietQR), logistics, and products.
2. **Remote Web Access as an extended surface:** allowing remote management via a secure tunnel when needed.
3. **Chat-native admin surfaces as secondary surfaces:** supporting quick actions via Telegram bot menus, Zalo Web Apps, or lightweight management menus within chats.

Product principles:

1. The user experience must revolve around Customers, Orders, Appointments, and Revenue, hiding technical OpenClaw concepts (session, prompt, model token).
2. Optimize the installation process with a **1-click installer** (Desktop App) instead of requiring users to open a Terminal.
3. OpenClaw CLI Core is retained but intended only for developers, operators, and automated systems.
4. UI layer is fully separate from the stock OpenClaw Control UI so the experience can be tailored end-to-end for SMB e-commerce.

---

## 2. BUSINESS CASE

### 2.1 Context

Small businesses and social commerce sellers in Vietnam often operate via chat channels like Zalo, Facebook Messenger, and Telegram, while also handling posting, answering customers, following leads, confirming payments, and shipping. This process is often fragmented across multiple tools: chats, transfer screenshots, Excel files, manual notes, shipping apps, sales pages, and social/marketplace platforms.

### 2.2 Current Problems

The target user groups often encounter the following problems:

1. Slow or inconsistent responses when busy with operations.
2. Time wasted recreating the same content like payment QR codes, confirmation messages, or appointment reminders.
3. Difficulty in quickly verifying transfer screenshots or order information due to manual processing.
4. Shipping addresses and appointments are often not standardized, causing errors or processing delays.
5. Users lack technical background, making it hard to accept systems requiring complex installation or command-line operations.
6. Drafting promotional content, scheduling posts, reminding leads, or repetitive consultations still rely heavily on manual actions.

### 2.3 Opportunity

If VClaw effectively solves "money-adjacent", "daily repetitive" tasks and a portion of structured sales growth tasks, the product can create clear value from the first week of use, thereby increasing user retention and expanding into other business logic by industry.

---

## 3. PRODUCT GOALS

### 3.1 MVP Stage Goals

1. Help small business owners process payment confirmations, shipping address standardization, and basic appointment reminders faster.
2. Reduce manual efforts in repetitive business tasks occurring on chat channels.
3. Prove that a local-first model can bring real value to non-technical users.
4. Gradually expand from reactive operational assistant to proactive growth and operational assistant for online sellers.

### 3.2 Proposed Success Metrics

1. At least 70% of pilot users complete the installation and connect their first communication channel.
2. Time spent creating and sending payment codes reduced by at least 50% compared to manual methods.
3. At least 3 actual tasks per day processed via VClaw per active account.
4. Day-14 retention rate reaches at least 30% in the pilot group.
5. Clear signals of usage for at least one proactive capability like content drafting, follow-up, or auto consultation assist.

---

## 4. TARGET AUDIENCE

### 4.1 Priority Segments for MVP

The MVP focuses on **small businesses selling products and services via chat**, specifically:

1. Small online shops receiving orders via Zalo or Messenger.
2. Small service shops like nails, salons, or mini spas taking appointments via chat.
3. Individuals handling both sales and operations without dedicated receptionists or order processors.

### 4.2 Primary User Persona

- Teams of 1-5 people.
- Revenue depends on response speed and order processing.
- Use phones and laptops daily but don't want to learn technical tools.
- Willing to grant app permissions if it results in significant time savings.

### 4.3 Non-priority Users

The following groups are recognized as long-term opportunities but not the focus of the MVP:

1. KOL/KOC and creator management.
2. Tutors, knowledge freelancers, and specialized debt management.
3. Real estate, second-hand goods, or dropshipping with specific needs.
4. Medium to large enterprises with complex accounting, CRM, and permission processes.

### 4.4 Priority SMB Commerce Use Cases

In addition to technical tasks like channel connection and system configuration, VClaw needs to directly serve common business problems for small sellers:

1. Aggregate conversations from multiple chat channels into one place to avoid missing customers.
2. Support quick customer responses with message templates, content suggestions, or sales workflows.
3. Create and send payment information, verify payments, and record order status.
4. Standardize customer information, addresses, needs, and interaction history.
5. Manage appointments, service schedules, or post-sales follow-up tasks.
6. Gradually expand to catalog management, products, services, or connecting online sales channels.
7. Support drafting sales content, light campaigns, and follow-up schedules for structured customer/lead groups.

These online sales channels may include websites, landing pages, social commerce, and marketplaces like Shopee. In the initial stage, VClaw should prioritize "aggregating order and customer sources" into one place instead of committing to deep synchronization across all platforms from the MVP.

In the early stage, the product should prioritize `generic SMB commerce workflows` and `lightweight growth workflows` instead of locking into a single vertical like ticketing, travel, or B2B agencies. Verticals like ticketing can become expansion packs once the operational core and sales growth have stabilized.

---

## 5. MVP SCOPE

### 5.1 In Scope

1. Local application running on the user's computer, prioritizing a 1-click installer (.exe / .dmg).
2. Application UI (App UI) oriented towards a CRM-lite platform, providing convenience instead of traditional technical setup methods.
3. Connect at least one major communication channel in the early stage. Other channels only expand once the main flow is stable.
4. Feature set focused on payments, logistics, appointments, lead follow-up, and light proactive workflows like approved content/campaign assistance. Inbox screen for AI approval tasks (Human-in-the-loop).
5. Store basic operational data locally with the ability to sync or backup when needed.
6. VClaw is not just a chat interface, but an **Operations Console** (Next.js) that allows:
- Viewing order lists, customers, and appointments from a dedicated database.
- Controlling Agents to perform tasks via buttons (MCP) or automated workflows.
- Approving pending requests from Agents (Human-in-the-loop).

### 5.1.1 3-Layer Product Direction Expansion

To avoid excessive scope creep while reflecting the true development direction, VClaw should be described in 3 layers:

1. `Core MVP operations`: QR, bill verification, ship estimate, appointments, task inbox, local admin.
2. `Near-term growth features`: content assistance, campaign drafting, auto consultation with guardrails, lead follow-up, sales channel awareness.
3. `Future-state expansion`: deep marketplace sync, deep fulfillment, large-scale outbound automation, vertical-specific workflows.

### 5.1.2 Invoice/Receipt Interpretation in Product Scope

In the context of VClaw, "invoice" or "receipt" should be understood as `invoice/order reconciliation` serving sales operations:

1. Recording a pending transaction or order.
2. Attaching payment status, bills/transfer screenshots, and reconciliation notes.
3. Attaching shipping status or service completion status for end-to-end tracking.

This part helps sellers control money, orders, and payment proof better, but does not equate to e-invoicing, VAT invoices, or legal compliance accounting.

### 5.2 Out of Scope for MVP Stage

1. Automatically generating new features by scanning news, articles, or social media trends.
2. Self-updating business source code and deploying new features without review.
3. Automatically manipulating the operating system at a broad level or requiring root/admin privileges for all tasks.
4. Simultaneously covering all industries and all popular chat channels.
5. Accounting, VAT invoicing, ERP, or complete CRM problems.
6. A complete enterprise commerce platform with full OMS/CRM/ERP.
7. A full ads platform or full autopilot system for outbound automation without approval/policy mechanisms.

---

## 6. PRODUCT PRINCIPLES

1. **Value first, AI later:** Features must solve a specific business task before being optimized by AI.
2. **Narrow MVP but truly usable:** Only choose flows that can be demonstrated to pilot users in a short time.
3. **Controlled Local-first:** Prioritize running on the user's machine, but all file, image, or external integration access must be transparent and limited.
4. **No reliance on "AI self-coding":** All new features in the early stage must go through standard design, development, and testing processes.
5. **Expand by vertical after signals:** After proving success in one segment, then replicate to other industry groups.
6. **Proactive but with guardrails:** Can support automated promotion, follow-up, or consultation in structured contexts, but must have frequency limits, channel policies, and appropriate approval mechanisms.

---

## 7. FUNCTIONAL REQUIREMENTS

### 7.1 P1 Priority Functional Group

| ID | Feature | Business Description | Delivered Value |
|---|---|---|---|
| FR1 | Contextual VietQR Generation | System recognizes amount and payment content from chat or quick forms, then generates QR images for the customer. | Shortens payment closing time and reduces input errors. |
| FR2 | Assisted Bill Verification | System reads receipts/screenshots and checks basic fields like amount, time, and reference content. Returns results as suggestions for user confirmation. | Reduces manual bill checking time and limits confusion. |
| FR3 | Address Standardization & Shipping Estimate | System standardizes addresses from chat, extracts main components, and connects with logistics partners for estimated fees or order preparation data. | Reduces address input errors and speeds up order processing. |
| FR4 | Basic Appointment Management | System allows creating appointments, checking free slots from simple config data, and sending reminders based on templates. | Limits missed appointments and reduces customer no-show rates. |

### 7.2 P2 Priority Functional Group

| ID | Feature | Business Description | Notes |
|---|---|---|---|
| FR5 | Message Templates & Interaction Status | Suggests message templates based on sales situations or payment confirmations. | Should deploy after P1 flows are stable. |
| FR6 | Daily Task Reports | Summarizes QR generation count, appointment count, and successfully processed orders. | Serves pilot evaluation. |
| FR7 | Advanced Payment or Appointment Reminders | Allows setting reminder rules based on time milestones. | Needs frequency and user experience control. |
| FR8 | Content & Campaign Draft Support | Suggests captions, posts, content variations, and posting schedules for online sellers. | Reduces content creation costs and maintains sales rhythm. |
| FR9 | Controlled Lead Follow-up | Suggests and prepares follow-up messages for unresponsive leads, unpaid orders, or old customers. | Increases conversion and retention while maintaining spam control. |
| FR10 | Guardrailed Auto Consultation | System can suggest or semi-automatically reply in repetitive Q&A situations, with appropriate policies and confirmation thresholds. | Reduces repetitive consultation load without sacrificing reliability. |

### 7.3 Integration Requirements

1. The initial stage should choose **one primary communication channel** for end-to-end deployment, instead of Zalo OA, personal Zalo, Facebook Messenger, and Telegram simultaneously.
2. Logistics integration should only start at address standardization, estimated fee retrieval, and order data preparation; automated waybill creation is not mandatory in the MVP.
3. Logistics partners like `GHTK` or `GHN` can be considered as adapter directions, but the product design should remain neutral using a delivery adapter model.
4. Marketplace integration like `Shopee` should prioritize channel awareness, order sources, and sales context aggregation; deep order/inventory/fulfillment sync should be post-pilot.
5. For content, follow-up, or auto-consultation flows, the system needs channel policies, frequency limits, and clear approval queues.
6. All payment and logistics integrations must have clear error handling for slow or unresponsive external APIs.

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### 8.1 Availability and Experience

1. Initial installation flow must be simple enough for users without terminal usage.
2. Interface should prioritize quick actions, fewer screens, and fewer technical concepts.
3. Important actions need minimum logs or history for user review.
4. Daily management tasks should be completed via the app UI without CLI.
5. Quick actions like approving requests or checking order status can expand to chat-native surfaces post-MVP.
6. Growth flows like content drafting or outbound follow-up must be as intuitive as a sales tool, without complex marketing automation language.

### 8.2 Security and Privacy

1. User and operational data prioritized for local storage in the early stage.
2. Any behavior reading files, images, or accessing personal data must have clear user consent.
3. No automatic execution of tasks that could change system data without appropriate confirmation.
4. All outreach, promotion, or auto-consultation flows must have policies and logs to avoid spam risks or incorrect messaging.

### 8.3 Reliability

1. System must handle external integration errors without hanging the entire operational flow.
2. AI results with deviation risks, such as receipt OCR or address standardization, must be designed as "assisted confirmation", not fully autonomous decisions.
3. Proactive growth flows must be able to fallback to draft/manual mode if policies or confidence are insufficient.

---

## 9. ASSUMPTIONS AND CONSTRAINTS

### 9.1 Assumptions

1. Users are willing to install desktop/local apps if they see clear benefits within the first week.
2. Pilot deployment with small groups is possible to observe real behavior.
3. Necessary third-party APIs or services for QR, OCR, or logistics can be integrated at acceptable commercial levels.

### 9.2 Constraints

1. Limited initial development resources mean not covering all industries and channels simultaneously.
2. Some chat platforms in Vietnam have integration limits or depend on partner policies.
3. Deep manipulation of the OS and local files increases testing, support costs, and security risks.
4. Quality of OCR, Vietnamese NLP, and address standardization needs verification with real data before committing to full automation.
5. Where the shared runtime gains capabilities, VClaw can adopt what fits—but **roadmap priority** stays on commerce, Vietnamese integrations, and operator trust (policies, logs, approvals), so the product stays **ahead of a generic assistant stack** for sellers rather than tracking it feature-for-feature.

---

## 10. KEY RISKS AND MITIGATION

| Risk | Description | Mitigation |
|---|---|---|
| Scope Creep | Covering too many industries/channels leading to no high-quality flows. | Choose 1 primary segment and 1 channel for MVP. |
| Unstable Integration | Chat/logistics platform APIs or connection mechanisms may change. | Design decoupled integration layers, prioritizing documented partners. |
| Incorrect AI Results | Receipt OCR, address standardization, or reply suggestions may be wrong. | Design as user-confirmation mechanisms before finalized. |
| Poor Onboarding | Non-technical users give up if setup is complex. | Minimize setup flow with clear configuration checklists. |
| Local Security Concerns | Accessing local data or files may cause worry. | Limit permissions, be transparent about access scope, and add action history. |
| Uncontrolled Growth Automation | Content, follow-up, or auto-consultation may cause spam or wrong messages. | Mandatory policy approval, frequency limits, and channel queues. |

---

## 11. PROPOSED ROADMAP

| Phase | Reference Time | Objective | Expected Outcome |
|---|---|---|---|
| Phase 1: Problem Validation | Week 1-2 | Interview and finalize pilot segment, primary channel, priority business flows | MVP use case list, success criteria, specific integration requirements |
| Phase 2: MVP Foundation | Week 3-6 | Finalize local setup, first channel config, basic logging, and task inbox | Internal test version for one end-to-end flow |
| Phase 3: Operations MVP | Week 7-10 | Deploy FR1-FR4 with pilot-grade stability | Pilot with real users, actual usage data |
| Phase 4: Near-term Growth Layer | Week 11-14 | Add FR8-FR10 (draft, follow-up, auto-consultation with guardrails) | Users start using VClaw for both growth and operations |
| Phase 5: Measurement & Lean | Week 15-16 | Measure adoption, fix bugs, remove unused features | Decision on next vertical, channel, or automation depth |

---

## 12. POST-MVP DIRECTION

If the MVP proves value and stable usage, expansion directions for later stages include:

1. Expanding to specific verticals like spa/nails, small F&B, freelancers.
2. Adding operational reports and advanced task reminders.
3. Increasing the number of supported communication channels.
4. Researching mechanisms to suggest new features from usage data, but not self-coding/deploying unreviewed features.
5. Expanding from chatbot operations to a commerce console connecting online stores, lead sources, and growth workflows.

### 12.0 Reference signals from SMB products like KiotViet

Studying mature SMB products like KiotViet primarily helps VClaw understand what concepts and workflows sellers are familiar with. From that perspective, VClaw can reference:

1. How mature products organize objects like `customers`, `orders`, `invoices`, `inventory`, `sale channels`.
2. How data is viewed by `store/branch/channel` in multi-source sales contexts.
3. How an SMB tool balances simplicity for new users with long-term scalability.
4. Patterns for workflow and product surface design (doesn't mean mandatory KiotViet integration).

### 12.1 Business Growth Automation Group

After completing the core MVP layer, VClaw can expand into proactive revenue growth in the near-term roadmap.

Functional areas for research:

1. **Market Signal Analysis:** Aggregating trends in prices, demand, seasonality, or topics of interest in target industries.
2. **Lead Discovery:** Assisting in identifying customer segments, suggesting leads by area, need, or behavior.
3. **Promotion & Content Support:** Proposing posts, messages, offers, or schedules by segment.
4. **Controlled Sales Automation:** Supporting lead follow-up, reply reminders, or closing scenarios in structured situations.
5. **Auto-consultation with Guardrails:** Assisting automated or semi-automated responses for repetitive intents with policy-based approval.

### 12.2 Autonomous Product Evolution Group

VClaw can research a new capability layer to make the system more useful over time, in a controlled and approved manner.

Functional areas for research:

1. **Trend & Feature Gap Analysis:** Aggregating usage data, recurring errors, and market changes to propose improvements.
2. **Skill Discovery Engine:** Automatically detecting repetitive tasks or new needs to suggest new modules.
3. **Prototype/Draft Workflow Generation:** System can generate logic proposals, prompts, or rules in a sandbox.
4. **Smart Optimization:** Proposing improvements to prompts, routing, or templates based on operational data.

Mandatory guardrails:

1. No automatic source code merging into production.
2. No direct modification of the operational core or live integrations.
3. All proposals must follow: `proposal -> sandbox test -> review -> approve -> release`.

---

## 13. CONCLUSION

VClaw has potential if positioned as a local-first operational and growth assistant helping small businesses process revenue-adjacent tasks while being proactive in lead generation and controlled consultations. To be feasible, the project must avoid over-expansion and focus on proving value in one segment, one channel, and a small but usable feature set.

This BRD prioritizes deployment feasibility, measurability, and a foundation for further development. Directions like growth assistance, follow-up automation, and guardrailed auto-consultation are moved closer in the roadmap but must be implemented with appropriate control levels instead of promising full autopilot.
