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
4. **Integrations**
   - Chat channels
   - QR/payment
   - Delivery
   - Catalog/service sources
5. **Automation**
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

VClaw needs to:

1. Consolidate leads into one place.
2. Tag lead source.
3. Set lead status.
4. Suggest follow-ups.

### 4.2 Assisted selling

VClaw supports sellers with:

1. Quick response suggestions.
2. Closing content suggestions.
3. Payment QR generation.
4. Bill verification.
5. Recording transaction states.

### 4.3 Order-like workflow

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

### 4.4 Lightweight Catalog or Service Listing

In the early stages, VClaw only needs basic support:

1. Product list
2. Service list
3. Price
4. Short description
5. Availability status

The goal is not to build an e-commerce platform, but to help the agent have enough context for sales and consultation.

### 4.5 Follow-up and Retention

VClaw should help sellers not forget customers:

1. Remind customers who haven't replied.
2. Remind customers who haven't paid.
3. Remind customers about appointments.
4. Post-sale care.
5. Suggesting repeat purchases.

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

---

## 7. KEY UX DECISIONS

1. The dashboard must use business language such as `Customers`, `Orders`, `Payments`, `Appointments`, `Sales Channels`.
2. Do not push concepts like `session`, `agent`, `routing`, or `tool policy` to the front for SMB users.
3. Every channel configuration and primary workflow must go through a wizard or form.
4. Sensitive confirmations must clearly show "AI suggestion" and "User decision".

---

## 8. CONCLUSION

VClaw should not only be seen as a technical layer or a pure DevOps "Mission Control" interface forked from OpenClaw. To survive and take root in the SMB market, it must become:

1. A `web-based operations console (CRM-lite)` that is extremely easy to install using a **one-click installer**.
2. A `commerce operations assistant` that supports lead consolidation, bill verification, order tracking, and follow-up via an automated assistant reporting through a Task Inbox.
3. A platform that can gradually expand to verticals like ticketing or multi-platform resellers once the generic commerce core is proven.
