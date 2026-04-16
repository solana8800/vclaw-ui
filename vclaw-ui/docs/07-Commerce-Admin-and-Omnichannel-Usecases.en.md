# COMMERCE ADMIN AND OMNICHANNEL USE CASES
## PROJECT: VClaw - Sales Management Layer for SMBs on OpenClaw

---

## 1. DOCUMENT PURPOSE

This document focuses on product-oriented questions:

1. How non-technical sellers will manage VClaw.
2. Which core business use cases VClaw needs to support beyond technical setup.
3. How to expand the product from chat operations to commerce operations without bloating the scope too early.

---

## 2. PRODUCT PRINCIPLES

1. Sellers should not need the CLI for daily use.
2. The primary experience must go through an easy-to-understand web admin console centered on sales and operations.
3. Chat-native admin is only an auxiliary surface for quick tasks.
4. The product core should serve `generic SMB commerce` before entering specific verticals.
5. Verticals such as ticketing, attraction sales, or B2B agents should only be expanded when the commerce core is solid.
6. The product should not stay limited to reactive inbound help; it should also support `proactive growth workflows` with clear guardrails.

---

## 3. LAYERED ADMIN SURFACES

### 3.1 Localhost Web Admin (Decoupled Operations Console)

This is the primary management surface for end-users. Unlike the technical interfaces (Mission Control) of OpenClaw, this Dashboard is a business Web App following the CRM-lite model:

Recommended areas:

1. **Onboarding**
   - Choose the primary chat channel
   - Connect account
   - Set up payment QR
   - Set up logistics
   - Set up appointment or service hours
2. **Operations Console**
   - View conversations
   - View pending tasks
   - View bills needing verification
   - View appointments
   - View errors or warnings
3. **Commerce Console**
   - Customers
   - Leads
   - Orders or transactions
   - Products/services
   - Follow-up
4. **Campaign / Content / Automation**
   - Content drafts
   - Campaign drafts
   - Automation queue
   - Follow-up policies
5. **Integrations**
   - Chat channels
   - QR/payment
   - Delivery
   - Catalog/service sources
   - Marketplace / sales channels such as Shopee
6. **Automation**
   - Templates
   - Rules
   - Reminders
   - Follow-up policy

### 3.2 Remote Web Access

This is an additional mode for users who need to manage outside the installation machine.

Principles:

1. Default is still local-only.
2. Remote access is only enabled when the user needs it.
3. Prioritize tunnels or secure remote access layers over direct public exposure.
4. Sensitive actions need additional authentication and auditing.

### 3.3 Chat-native Admin Surfaces

These surfaces are for quick actions:

1. Telegram bot menu
2. Zalo Web App or mini admin surface
3. Quick action menus in chat

Suitable tasks:

1. Approve recently OCR-processed bills
2. View order/task status
3. Enable or pause a workflow
4. View daily sales summary
5. Open the web admin for deep configuration when needed

---

## 4. GENERAL COMMERCE USE CASES FOR SMB

### 4.1 Omnichannel lead intake

Sellers receive customers from many sources:

1. Zalo
2. Messenger
3. Telegram
4. External forms or links
5. Online sales pages or landing pages
6. Marketplaces such as Shopee

VClaw needs to:

1. Consolidate leads into one place.
2. Tag lead source.
3. Set lead status.
4. Suggest follow-ups.
5. Attach a clear enough `sales channel` so the system can support both operations and growth use cases.

In the near term, the goal is to recognize where the customer came from and attach the correct `sales channel` so the seller gets a unified inbox. Deep synchronization of order status, inventory, or fulfillment from Shopee should remain a post-pilot expansion direction.

### 4.2 Assisted selling

VClaw helps sellers close deals faster:

1. Quick response suggestions.
2. Closing content suggestions.
3. **VietQR Generation**: Automatically detects amount and content from conversation to generate a QR image for the customer.
4. Record transaction state and set operational notes.

### 4.3 Bill Verification (OCR/Vision)

A core daily operational use case:

1. When a customer sends a payment receipt or screenshot, AI uses OCR/Vision to extract data.
2. Extracted fields: Amount, time, reference content (order code).
3. The system returns a reconciliation suggestion (match, mismatch, or needs verification).
4. The user retains final decision authority instead of the system automatically marking it as paid.

### 4.4 Address Normalization and Shipping Estimate (Shipping Assist)

Ensuring packaging and quoting are seamless:

1. Receives natural language/handwritten addresses from customer messages.
2. Uses AI to split geography levels (Province/City, District, Ward, Street/House number).
3. Calls Delivery Adapters (e.g., GHN, GHTK) to fetch estimated shipping fee tables.
4. Suggests the best shipping options and calculates the total quote for the customer.

### 4.5 Booking and Reminder Management

Specifically for service-based businesses (spa, nail, salon):

1. Extracts desired time slots from chat conversations.
2. Checks for scheduling conflicts (available slots).
3. Creates bookings and attaches corresponding service labels.
4. Sets up automated reminder sequences that can be configured by time (e.g., 2 hours before).

### 4.6 Task Inbox (Human-in-the-loop)

The central operational hub to prevent AI errors:

1. Collects all high-risk AI-generated suggestions (bill approvals, shipping quotes, order creation) into a unified queue.
2. Provides a simplified interface for sellers to "Approve" or "Edit".
3. Every action is recorded in an Audit Log for historical tracking.

### 4.7 Proactive selling and growth assistance

Beyond helping after the customer has already asked, VClaw should also help sellers become more proactive:

1. Draft selling content by product, campaign, or customer segment.
2. Suggest posting cadence or follow-up timing.
3. Prepare re-engagement content for old customers or unconverted leads.
4. Suggest or semi-automate answers in repetitive, policy-safe situations.
5. Route every outbound action into an approval queue or rule engine when needed.

### 4.8 Order-like workflow

Even before a full OMS exists, VClaw should have a simple workflow:

1. Interested customer
2. Consulted
3. Price/QR sent
4. Awaiting payment
5. Paid
6. Processing
7. Completed
8. Follow-up required

This workflow can be used for:

1. Selling products
2. Booking services
3. Reservation
4. Selling service packages
5. Later expansion to ticketing

### 4.9 Lightweight Catalog or Service Listing

In the early stages, VClaw only needs basic support:

1. Product list
2. Service list
3. Price
4. Short description
5. Availability status

The goal is not to build an e-commerce platform, but to help the agent have enough context for sales and consultation.

### 4.10 Follow-up and Retention

VClaw should help sellers not forget customers:

1. Remind customers who haven't replied.
2. Remind customers who haven't paid.
3. Remind customers about appointments.
4. Post-sale care.
5. Suggesting repeat purchases.

Principles here:

1. Start with `semi-automated follow-up`.
2. Enforce per-channel frequency limits.
3. Use approval policies for higher-risk or higher-volume outbound actions.

### 4.11 Marketplace-aware commerce

When sellers start receiving orders from platforms such as Shopee, VClaw should see the problem in two layers:

1. **Near-term:** recognize the `sales channel`, attach the order source, and unify the customer plus conversation into one operational record.
2. **Future-state:** synchronize orders, customers, shipping status, catalog, or inventory more deeply when there is a real partner path and business demand.

This keeps VClaw positioned as a `unified commerce console`, instead of trying to turn the MVP into a fully fledged multi-marketplace OMS from day one.

### 4.12 Campaign and content operations

For online sellers, `content` and `campaign` work should not be disconnected from commerce workflows. VClaw should support:

1. Writing captions or sales posts by product, service, or promotion.
2. Creating content variants by channel such as chat, social, marketplace notes, or landing-page copy.
3. Moving content into an `approval queue` before publishing or sending.
4. Connecting content and campaign work to lead sources or sales channels so the seller can see what is creating demand.

### 4.13 Guarded auto-consultation

Some repetitive consultation situations can be handled through semi-automated selling assistance:

1. Basic questions about price, stock status, shipping time, or booking availability.
2. Follow-up questions when enough customer context already exists.
3. Suggested or semi-automated replies only when policy classifies the intent as safe.

Should not:

1. Auto-consult every ambiguous case.
2. Automatically promise pricing, stock, or policy outcomes outside approved rules.

---

## 5. MINIMUM DATA OBJECTS

At least the following data objects should be present in the commerce layer:

### 5.1 Customer

1. Name
2. Source channel
3. Contact information
4. Labels/tags
5. Interaction history

### 5.2 Lead

1. Lead source
2. Need
3. Status
4. Responsible person or assigned agent
5. Next follow-up milestone

### 5.3 Order-like entity

1. Transaction code
2. Customer
3. Value
4. Status
5. Payment proof
6. Operational notes

### 5.4 Catalog or service item

1. Name
2. Type
3. Price
4. Status
5. Basic metadata

---

## 6. VERTICAL EXPANSION ROADMAP

### 6.1 Generic SMB First

Must complete first:

1. Lead intake
2. Follow-up
3. Payment assist
4. Booking/service workflow
5. Basic commerce admin
6. Basic order-source and sales-channel attribution from social, website, and marketplace inputs
7. Content and campaign assistance at the draft + approval level
8. Guarded auto-consultation for repetitive intents

### 6.2 Ticketing and Reseller Later

Only after generic commerce is stable, expand to:

1. B2C attraction tickets
2. Travel tickets
3. Attraction reseller
4. B2B reseller distributing to multiple platforms

Then, the product will need:

1. Inventory or quota sync
2. Reseller pricing policy
3. Booking reference / ticket code
4. Reconciliation with partners
5. Multi-supplier mapping

### 6.3 Marketplace and POS/OMS integration direction

If VClaw expands from `channel-aware` commerce into `system-aware commerce`, it will need a more structured integration layer:

1. **Marketplace adapters:** for example Shopee and future marketplaces.
2. **Delivery adapters:** for example GHN and GHTK to connect order flow with shipping flow.
3. **System-aware data model:** if VClaw later needs external data, the model must be clear enough for `orders`, `invoices`, `customers`, `inventory`, and `sale channels`.
4. **Incremental sync + webhook intake:** this is a pattern worth learning from mature systems, not a commitment that VClaw will directly integrate with a product such as KiotViet.

This is a future-state direction, not a prerequisite for MVP value.

### 6.4 Guardrails for growth automation

When VClaw supports more proactive workflows, the product documentation should lock a few principles:

1. No default mass auto-posting or mass auto-sending.
2. Approval queues for higher-risk content or outbound actions.
3. Per-channel rate limits and channel policies.
4. Audit trails for every outbound action.

---

## 7. KEY UX DECISIONS

1. The dashboard must use business language such as `Customers`, `Orders`, `Payments`, `Appointments`, `Sales Channels`.
2. Do not push concepts like `session`, `agent`, `routing`, or `tool policy` to the front for SMB users.
3. Every channel configuration and primary workflow must go through a wizard or form.
4. Sensitive confirmations must clearly show "AI suggestion" and "User decision".
5. Proactive actions such as writing content, follow-up, or guarded auto-consultation must still feel like selling assistance, not a heavy marketing-automation suite.

---

## 8. CONCLUSION

VClaw should not only be seen as a technical layer or a pure DevOps "Mission Control" interface forked from OpenClaw. To survive and take root in the SMB market, it must become:

1. A `web-based operations console (CRM-lite)` that is extremely easy to install using a **one-click installer**.
2. A `commerce operations assistant` that supports lead consolidation, bill verification, order tracking, and follow-up via an automated assistant reporting through a Task Inbox.
3. A `seller growth + operations assistant` that can help create content, maintain selling rhythm, support follow-up, and offer guarded consultation instead of only reacting to incoming work.
4. A platform that can gradually expand to verticals like ticketing or multi-platform resellers once the generic commerce core is proven.
