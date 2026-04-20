# BUSINESS REQUIREMENTS DOCUMENT (BRD)
## PROJECT: VClaw - Operations and Sales Assistant for Individual Businesses in Vietnam

---

## 1. EXECUTIVE SUMMARY

VClaw is a product developed on the [OpenClaw](https://github.com/openclaw/openclaw) platform, positioned as a local-first AI assistant that helps small business households in Vietnam not only handle revenue-critical operational tasks, but also become more proactive in attracting customers, nurturing leads, creating selling content, and coordinating online sales in a controlled way.

The core business hypothesis of the project is: individual users will be willing to install and maintain an AI tool if that tool helps them both close orders faster and maintain a better selling rhythm, while reducing repetitive work and limiting daily revenue loss.

During the MVP stage, VClaw does not pursue the ambition of becoming a "comprehensive multi-industry" platform. Instead, the product will focus on a primary user group, high-value scenarios, and a feature set small enough to be deployed, measured, and iterated within 3-6 months.

### 1.1 Product Strategy on OpenClaw

VClaw is not oriented as a product built completely from scratch. Instead, the product is developed as a **controlled product fork** from OpenClaw, where OpenClaw acts as the `execution substrate` for foundational capabilities such as gateway, routing, control UI, multi-agent, plugin runtime, and operational configuration.

Components expected to be reused from OpenClaw:

1. Long-running Gateway as the focal point for channel connections, session routing, and control plane.
2. WebSocket protocol between gateway, control UI, CLI, and nodes.
3. Control UI/dashboard running on the same gateway port to serve chat, configuration, and system status.
4. Plugin/channel/tool model to add new integrations and business logic without modifying the entire system.
5. Agent system, session, bootstrap context, and system prompt assembly.

Components expected to be customized into VClaw:

1. Product positioning, onboarding, and experiences suitable for small business households in Vietnam.
2. Specific business workflows such as VietQR, bill verification, address normalization, bookings, and business growth flows such as content assistance, lead follow-up, and campaign assistance.
3. Policy/confirmation layers for sensitive actions regarding payments, operations, and automation.
4. Skill, tool, plugin systems, and dashboard labels serving Vietnamese use cases instead of default personal assistant/coding assistant use cases.

Development principles:

1. Prioritize **inheritance and configuration** before deep core modifications.
2. Prioritize **pluginizing** new capabilities if they do not require changes to the core protocol, routing, or control UI.
3. Only deep fork into the OpenClaw core when it creates clear product differentiation or helps reduce friction for VClaw's target users.

### 1.2 Product Management Surfaces

VClaw needs to be packaged so that non-technical users can operate via a web interface. Due to the nature of the Vietnamese SMB audience, the VClaw interface **must not** look like a technical "DevOps Mission Control" or an AI dashboard (with CPU, RAM, or Terminal metrics). Instead, it must be an **Operations Console (Digital Workspace / CRM-lite)** focused on a business perspective.

Proposed management surface model:

1. **VClaw Business Dashboard (Operations Console) is the primary surface:** presenting the interface of a sales application. Used to manage revenue, Task Inbox (Human-in-the-loop approval), customers, orders, and payment configuration (VietQR). It uses a dedicated **Prisma + SQLite** database for business entities.
2. **OpenClaw Core Engine is the execution layer:** providing AI capabilities, channel connections, and workflow orchestration via MCP.
3. **Remote Web Access is the extended surface:** allowing users to manage remotely via secure tunnels.
4. **Chat-native admin surfaces are auxiliary surfaces:** supporting quick actions via Telegram bot menu, Zalo Web App, or lightweight admin menus in chat.

Product principles:

1. User experience must center around Customers, Orders, Appointments, and Revenue, hiding OpenClaw's technical concepts.
2. Optimize the installation process using a **one-click installer** that launches both VClaw UI and OpenClaw Core.
3. OpenClaw's technical Control UI is retained for debugging but hidden from the end-user.
4. The UI layer is a standalone Next.js application, decoupled from the original OpenClaw Control UI to allow maximum customization into an E-commerce interface for SMBs.

---

## 2. BUSINESS PROBLEM

### 2.1 Context

Small business households and individual sellers in Vietnam often operate via chat channels like Zalo, Facebook Messenger, and Telegram, while also manually managing posting, customer replies, lead follow-up, payment confirmation, and shipping. The selling process is often fragmented across multiple tools: chat, transfer screenshots, Excel files, manual notes, logistics apps, sales pages, and social or marketplace surfaces.

### 2.2 Current Issues

Target user groups often face the following problems:

1. Slow or inconsistent responses when busy with operations.
2. Wasting time recreating the same types of content such as payment QR codes, confirmation messages, and appointment reminders.
3. Difficulty in quickly checking transfer photos or order information due to manual processing.
4. Shipping address information and appointments are often not normalized, causing errors or slow processing.
5. Users lack technical backgrounds, making it hard to accept systems that require complex installation or command-line operations.
6. Sellers lack proactive tools for writing sales content, maintaining a posting rhythm, and bringing older leads back into the funnel.
7. Customer consultation still depends heavily on manual work, even for repetitive and structured questions.

### 2.3 Opportunity

If VClaw solves "near-money," "daily repetitive," and a selected set of structured growth tasks well, the product can create clear value from the first week of use, thereby increasing user retention and expanding to other business areas by industry.

---

## 3. PRODUCT GOALS

### 3.1 MVP Phase Goals

1. Help small business households process payment confirmations, normalize shipping orders, and basic appointment reminders faster.
2. Reduce manual steps in repetitive business tasks occurring on chat.
3. Prove that the local-first model can bring real value to non-technical users.
4. Gradually expand from a reactive operational assistant into a controlled growth + operations assistant for online sellers.

### 3.2 Proposed Success Metrics

1. At least 70% of trial users successfully complete the installation and first communication channel connection flow.
2. Time to generate and send payment codes reduced by at least 50% compared to manual methods.
3. At least 3 actual tasks per day are processed through VClaw per active account.
4. 14-day retention rate reaches at least 30% in the pilot group.
5. There is real usage evidence for at least one proactive capability such as content drafting, follow-up, or guarded auto-consultation assistance.

---

## 4. TARGET AUDIENCES

### 4.1 Priority Segment for MVP

The MVP focuses on the **small business household selling goods and services via chat** group, especially in the cases of:

1. Small online shops receiving orders via Zalo or Messenger.
2. Small service shops like nails, salons, mini spas receiving appointments via chat.
3. Individuals both selling and operating, without a separate receptionist or order processing staff.

### 4.2 Primary User Persona

- Has 1-5 operators.
- Revenue depends on the speed of response and order processing.
- Uses phones and laptops daily but does not want to learn technical tools.
- Accepts granting permissions to the app if it significantly saves time in return.

### 4.3 Users Not Yet Prioritized

The following groups are noted as long-term opportunities but not the focus of the MVP:

1. KOL/KOC and creator management.
2. Tutors, knowledge freelancers, and in-depth debt management.
3. Real estate, second-hand goods, dropship with specific needs.
4. Medium and large enterprises with complex accounting, CRM, and permission processes.

### 4.4 Priority Commerce Use Cases for SMB

In addition to technical tasks such as connecting channels and configuring the system, VClaw needs to directly serve the common business problems of small sellers:

1. Aggregate conversations from multiple chat channels into one place so as not to miss customers.
2. Support fast customer responses with response templates, content suggestions, or sales workflows.
3. Generate and send payment information, verify payments, and record order status.
4. Normalize customer information, addresses, needs, and interaction history.
5. Manage appointments, service schedules, or post-sale follow-up tasks.
6. Step-by-step expansion to catalog management, products, services, or connecting online sales channels.
7. Support sales content drafting, lightweight campaigns, and structured follow-up plans for leads or customer groups.

These online sales channels can include sales websites, landing pages, social commerce, and marketplaces such as Shopee. In the early stages, VClaw should prioritize the `unification of order sources and customer sources` instead of committing to deep synchronization with every platform from the MVP.

In the early stages, the product should prioritize `generic SMB commerce workflows` and `lightweight growth workflows` instead of locking into a single vertical like ticketing, travel, or B2B agents. Verticals like ticketing can become extension packages once the core selling and operational flows are stable.

---

## 5. MVP SCOPE

### 5.1 In-Scope

1. Local application running on the user's machine, packaged as a Desktop app that embeds the VClaw UI as the default interface.
2. **VClaw Business Dashboard** (Next.js) with a dedicated **Prisma + SQLite** business database.
3. **OpenClaw Core Engine** (Go/Node.js) running as a local daemon.
4. Feature set focused on payments, logistics, bookings, lead follow-up, and lightweight proactive workflows within a unified **Operations Console**.
5. Connect at least one primary communication channel in the early stages.
6. **Task Inbox** screen for AI task approval (Human-in-the-loop).

### 5.1.2 Three-layer product framing

To avoid uncontrolled scope expansion while still reflecting the new direction, VClaw should be described in three layers:

1. `Core MVP operations`: QR, bill verification, shipping estimate, booking, task inbox, and local admin.
2. `Near-term growth features`: content assistance, campaign drafting, guarded auto-consultation, lead follow-up, and sales channel awareness.
3. `Future-state expansion`: deep marketplace sync, deeper fulfillment support, larger-scale outbound automation, and vertical-specific workflows.

### 5.1.1 Interpretation of `invoice` in product scope

In the VClaw context, `invoice` should be understood closer to `invoice/order reconciliation` for sales operations:

1. Recording a transaction or order that is waiting to be processed.
2. Attaching payment status, transfer bill/proof, and reconciliation notes.
3. Attaching shipping or service completion status so the seller can track the workflow end-to-end.

This helps sellers control money flow, order flow, and payment evidence better, but it is not the same as e-invoicing, VAT invoicing, or full accounting compliance.

### 5.2 Out-of-Scope for MVP

1. Automatically generating new features by scanning news, articles, or social media trends.
2. Self-updating business source code and self-deploying new features without review.
3. Automatically operating the OS at a wide level or requiring root/admin privileges for every task.
4. Simultaneously covering all industries and all popular chat channels.
5. Accounting, VAT invoices, ERP, or complete CRM problems.
6. A complete enterprise commerce platform with full OMS/CRM/ERP.
7. A full ads platform or a full-autopilot outbound system without approval or policy controls.

---

## 6. PRODUCT PRINCIPLES

1. **Value first, AI later:** Features must solve a specific business task before being optimized by AI.
2. **Narrow but usable MVP:** Only select flows that can be demoed to pilot users in a short time.
3. **Controlled local-first:** Prioritize running on the user's machine, but any behavior accessing files, photos, or external integrations must be transparent and limited.
4. **No dependence on "AI self-coding":** Every new feature in the early stages must go through standard design, development, and testing processes.
5. **Expand by vertical after signals:** After proving a segment's success, then duplicate to other industry groups.
6. **Proactive but controlled:** The product may support promotion, follow-up, or consultation automation in sufficiently structured contexts, but only with clear limits, channel policies, and approval mechanisms.

---

## 7. FUNCTIONAL REQUIREMENTS

### 7.1 P1 Priority Functional Groups

| ID | Feature | Business Description | Value Brought |
|---|---|---|---|
| FR1 | Create VietQR from chat context | The system recognizes the amount and payment content from conversation or quick entry form, then generates a QR image to send to the customer. | Shorten payment closing time and reduce wrong information entry. |
| FR2 | Verify transfer photos at support level | The system reads receipt/screenshot images and checks basic fields such as amount, time, and reference content. Results are returned as suggestions for user confirmation. | Reduce manual bill inspection time and limit confusion. |
| FR3 | Address normalization and shipping estimate | The system normalizes addresses entered from chat, separates key components, and connects with logistics partners to return estimated fees or order preparation data. | Reduce address entry errors and speed up order processing. |
| FR4 | Basic appointment management | The system allows creating appointments, checking empty slots from simple configuration data, and sending appointment reminders according to templates. | Limit missing appointments and reduce the rate of customers forgetting appointments. |

### 7.2 P2 Priority Functional Groups

| ID | Feature | Business Description | Note |
|---|---|---|---|
| FR5 | Response templates and conversation status tracking | Suggest sample responses based on sales situations or payment confirmations. | Should be deployed after P1 flows are stable. |
| FR6 | Daily task report | Summary of the number of QR generations, number of bookings, number of successfully processed orders. | Serving pilot effectiveness evaluation. |
| FR7 | Advanced payment or booking reminders | Allows setting reminder rules according to time milestones. | Need to control sending frequency and recipient experience. |
| FR8 | Content and campaign draft assistance | Suggest captions, post drafts, content variants, and publishing schedules for online sellers. | Reduce content creation cost and help maintain a healthy selling rhythm. |
| FR9 | Controlled lead follow-up | Suggest and prepare follow-up messages for leads who stopped replying, have not paid, or are ready for re-engagement. | Improve conversion and repeat engagement without manual tracking overload. |
| FR10 | Guarded auto-consultation | Suggest or semi-automate answers for repetitive customer intents based on clear rules and approval thresholds. | Reduce repetitive consultation workload without sacrificing trust. |

### 7.3 Integration Requirements

1. In the early stages, choose **one primary communication channel** to deploy end-to-end first, instead of Zalo OA, personal Zalo, Facebook Messenger, and Telegram simultaneously.
2. Logistics integration should only start at the level of address normalization, fee estimation, and shipping data preparation; automatic shipment creation is not yet mandatory in the MVP.
3. If concrete examples are needed, carriers such as `GHTK` and `GHN` can be treated as suitable adapter candidates, but the product design should remain neutral through a delivery-adapter model.
4. Marketplace integration such as `Shopee` should initially focus on identifying the sales channel, order source, and unified selling context; deep synchronization of orders, inventory, or fulfillment should remain post-pilot.
5. For content, follow-up, or guarded auto-consultation flows, the system must have clear channel policies, frequency limits, and approval queues.
6. Every payment and logistics integration must have a clear error handling mechanism when external APIs are slow, wrong, or not responding.

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### 8.1 Availability and Experience

1. The initial installation flow must be simple enough so that users do not need to use the terminal.
2. The interface needs to prioritize fast operation, few screens, and few technical concepts.
3. Important operations need to have logs or minimal history for users to re-check.
4. Daily management tasks should be able to be completed via web admin without using the CLI.
5. Quick actions, such as approving requests, viewing order status, or toggling workflows, can expand to chat-native surfaces after MVP.
6. Growth workflows such as content drafts, outbound approvals, or follow-up queues must still feel like a simple selling tool rather than a complex marketing automation suite.

### 8.2 Security and Privacy

1. User data and operational data are prioritarily stored locally in the early stages.
2. Every behavior reading files, photos, or accessing personal data must have clear user consent.
3. Do not automatically run tasks that can cause system data changes without proper confirmation.
4. Every outreach, promotion, or guarded auto-consultation flow must have policies and logs to avoid spam or incorrect messaging.

### 8.3 Reliability

1. The system must handle external integration errors without hanging the entire operational flow.
2. AI results with deviation risks, such as receipt OCR or address normalization, must be designed towards "support confirmation," not making complete decisions independently.
3. Proactive growth flows must be able to fall back to manual draft-and-review mode if policy or confidence is insufficient.

---

## 9. ASSUMPTIONS AND CONSTRAINTS

### 9.1 Assumptions

1. Users are willing to install desktop/local apps if they see clear benefits in the first week.
2. Pilot can be deployed with some small user groups to observe actual behavior.
3. Necessary third-party APIs or services for QR, OCR, or logistics can be integrated at a commercially acceptable level.

### 9.2 Constraints

1. Initial development resources are limited, so it's not possible to cover many industries and many channels simultaneously.
2. Some chat platforms in Vietnam have integration restrictions or depend on partner policies.
3. Operating deep into the OS and local files increases testing, support costs, and security risks.
4. The quality of OCR, Vietnamese NLP, and address normalization needs to be verified with real data before committing to full automation.
5. Since VClaw is built as a product fork on OpenClaw, any changes to the core need to consider the cost of divergence from upstream and long-term maintenance costs.

---

## 10. MAIN RISKS AND MITIGATION

| Risk | Description | Mitigation |
|---|---|---|
| Scope too wide | Covering many industries and many channels at the same time leading to no flow being good enough. | Choose 1 primary segment and 1 primary channel for MVP. |
| Unstable platform integration | APIs or connection mechanisms with chat/logistics platforms may change. | Design a separate integration layer, prioritize integrations with clear documentation and partners. |
| AI provides wrong results | Receipt OCR, address normalization, or response suggestions may be wrong. | Design according to user confirmation mechanism before closing. |
| Difficult to use installation | Non-technical users easily give up if onboarding is complex. | Minimalize setup flow and have clear configuration checklists. |
| Local security risk | Accessing local data or file operations can cause concern. | Limit permissions, transparent access scope, and add operation history. |
| Uncontrolled growth automation | Content, follow-up, or auto-consultation may become spammy or inaccurate. | Require approval policies, frequency limits, and per-channel review queues. |

---

## 11. PROPOSED ROADMAP

| Phase | Reference Time | Goals | Expected Result |
|---|---|---|---|
| Phase 1: Problem Validation | Week 1-2 | Interview and finalize pilot segment, primary communication channel, priority business flows | MVP use case list, success metrics, specific integration requirements |
| Phase 2: MVP Foundation | Week 3-6 | Complete local setup, first channel configuration, basic logging, and task inbox foundations | Internal trial version for an end-to-end flow |
| Phase 3: Operations MVP | Week 7-10 | Deploy FR1-FR4 with enough stability for pilot | Pilot with real users, actual usage data available |
| Phase 4: Near-term Growth Layer | Week 11-14 | Add FR8-FR10 at the draft, follow-up, and guarded auto-consultation level | Users begin using VClaw for both growth and operations |
| Phase 5: Measure and Lean | Week 15-16 | Measure adoption, fix bugs, remove least-used features | Decision to expand the next channel, automation depth, or vertical |

---

## 12. POST-MVP DIRECTIONS

If MVP proves value and the usage rate is stable, expansion directions can be considered in the later stages, including:

1. Expanding to specific verticals such as spa/nail, small F&B, freelancers.
2. Adding operational reports and advanced task reminders.
3. Increasing the number of supported communication channels.
4. Researching mechanisms to suggest new features from usage data, but not deploying towards self-coding and self-loading unreviewed features.
5. Expanding from chatbot operations to a commerce console connecting more online sales pages, lead sources, catalog/service sources, and controlled growth workflows.

### 12.0 Reference signals from mature SMB products such as KiotViet

Studying mature SMB products such as KiotViet mainly helps VClaw understand which concepts and workflows sellers are already familiar with. From that perspective, VClaw can reference:

1. How mature products organize objects such as `customers`, `orders`, `invoices`, `inventory`, and `sale channels`.
2. How data is often viewed through `store/branch/channel` boundaries in multi-source selling.
3. How an SMB tool balances simplicity for new users with future extensibility.
4. Which workflow and surface patterns are worth studying, without implying that VClaw's future scope must include a direct KiotViet integration.

### 12.1 Business Growth Automation Group

After completing the core MVP layer, VClaw can expand toward a revenue growth assistant even in the near-term roadmap. This feature set aims to help users not only process orders better but also actively find new business opportunities and maintain a healthier selling rhythm.

Researchable functional directions:

1. **Market signal analysis:** Aggregate price trends, demand, seasonality, keywords, or topics gaining interest in each target industry group.
2. **Potential customer search:** Support identifying customer segments, suggesting leads by area, need, or behavior suitable for the user's products/services.
3. **Promotion and sales content support:** Propose post content, reach-out messages, offers, or posting schedules by customer segment.
4. **Controlled sales automation:** Support lead follow-up, response reminders, sending sales content or closing scenarios in situations with clear structure.
5. **Guarded auto-consultation:** Support automated or semi-automated answers for repetitive intents with approval and channel policy controls.

Application principles:

1. This is a `near-term to post-MVP` expansion layer, but it must still be rolled out in increasing levels of automation.
2. The system prioritizes `support` or `semi-automated selling` before moving to fully automated selling.
3. Customer reach, promotion, or closing flows must have mechanisms to limit frequency, control content, and comply with each platform's policies.

### 12.2 Autonomous Product Evolution Group

VClaw can research a new capability layer that helps the system become more useful over time, but it must be in a controlled, tested, and approved direction.

Researchable functional directions:

1. **Trend and feature gap analysis:** The system aggregates usage data, repetitive errors, new requests, and market fluctuations to suggest improvements.
2. **Skill discovery engine:** Self-detect repetitive tasks or new needs to propose new skills/modules.
3. **Prototype or draft workflow creation:** The system can generate logic proposals, prompts, rules, or technical prototypes in a sandbox environment.
4. **"Smarter" self-optimization:** Propose improvements to prompts, routing, templates, or workflows based on actual operational data.

Mandatory guardrails for this group:

1. Do not self-merge source code into production.
2. Do not self-modify system core or running integrations directly.
3. Every new proposal must go through the steps `proposal -> sandbox test -> review -> approve -> release`.
4. Self-proposed changes must have mechanism to measure impact and clear rollback.

---

## 13. CONCLUSION

VClaw has potential if positioned as a local-first growth and operations assistant that helps small business households both handle revenue-critical tasks faster and become more proactive in attracting, nurturing, and consulting customers in a controlled way. To be feasible, the project still needs to avoid expanding too early and focus on proving value in one segment, one communication channel, and a feature set small enough but genuinely usable.

This version of the BRD therefore prioritizes implementation feasibility, measurability, and a foundation for further development. Directions such as growth assistance, follow-up automation, and guarded auto-consultation are moved closer in the roadmap, but they must still be implemented with meaningful controls rather than framed as full autopilot promises.
