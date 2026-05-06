# VClaw UI/UX Specifications

This document defines the interface structure for the VClaw **Operations Console (Digital Workspace)**, based on the strategy of "transitioning from a Technical tool (Mission Control) to a Business tool (CRM-lite)."

---

## 1. Design Philosophy

1. **Reject Dev-Ops language:** Concepts like `Terminal`, `Tail Logs`, `Agent Memory`, or `Cron Job` are not present on the main interface. If an error occurs, the AI will summarize it in natural language: *"Could not scan the amount on Customer A's bill."*
2. **Bright, modern, high-aesthetic interface:** SMBs need a workspace that feels light and effortless. Apply a Minimalist style, Glassmorphism (blurred glass layers), rounded corners, and high-contrast colors (clean, banking-grade reliability).
3. **"Human-in-the-loop" Power:** Decisions to change business status (receiving money, shipping goods) are only suggested by the AI; humans click the **[Approve]** button.
4. **Proactive but controlled:** The UI should support content, follow-up, guarded auto-consultation, and campaign drafts, while always exposing policy state, approval queues, and action logs.

---

## 2. Screen System & App Shell Structure (Browser Shell Architecture)

VClaw Desktop is designed as an **Operations Browser**, with the interface divided into 3 main areas:

1. **Left Sidebar (Omnichannel Switcher)**: Allows switching between the VClaw Dashboard and open browser tabs (Shopee, Lazada, FB, Zalo).
2. **Main Content Area (Main View)**:
   - When on the Dashboard: Displays Next.js modules (`/admin/*`).
   - When on a Platform Tab: Displays the actual web interface of the social/merchant platform (wrapped by Playwright/WebView).
3. **Agent Overlay**: A toolbar or mini chatbot remains present across all applications, providing quick processing tools (VietQR, Address Extraction) without interrupting the workflow on the tab.

*   **Setup Wizard (Onboarding)** - Runs only the first time.
*   **Home (Overview Dashboard)** - Central "Operations Console" with full KPI indicators, revenue charts, and urgent task queues.
*   **Customers & Conversations** - Central CRM-lite module combining customer management, omnichannel chat history, and the Task Inbox for quick AI proposal approvals.
*   **Order Workflow (Orders)** - Manage order lifecycles using a Kanban-style interface.
*   **Payments & Shipping** - Specialized modules for cash flow reconciliation and real-time shipping quotes.
*   **VClaw Token (Zalo Integration)** - Manage Zalo connectivity, Bot configuration, and automated workflows.
*   **Settings** - Change prompts, connect VietQR, and configure general workspace settings.

---

## 3. Mockups & Typical Interfaces

Below are draft mockups simulating the visual flow to show the difference between VClaw and the original OpenClaw Control UI.

### 3.1. Initial Installation Flow (Onboarding Wizard)

Unlike developer tools that require entering Tokens and API keys from the command line, VClaw welcomes the seller with a friendly dialog, closer to the feeling of mainstream SMB tools such as Shopify or KiotViet. Here KiotViet is only used as a UX reference familiar to SMB users, not as an implied product integration target.

![VClaw Onboarding UI Mockup](./assets/vclaw_onboarding.png)

> [!TIP]
> **Onboarding Logic:** An AI Agent running in the background will take this information (Shop name, QR image, and Bank name) to automatically insert into the context configuration Prompt without the user ever knowing they are "programming" the AI.

### 3.2. Digital Workspace (Operations Console Dashboard)

This is the screen the business owner sees every morning when opening their laptop or accessing it via a tablet at the shop.

![VClaw Main Dashboard Mockup](./assets/vclaw_dashboard_main.png)

> [!NOTE]
> The screen is divided into clear business areas: Revenue statistics, new leads, the Approval Box (Task Inbox) as the focus, a support chat panel on the right, and visible growth indicators such as pending follow-ups or content waiting for approval.

### 3.3. Omnichannel Browser Interface (Integrated Tabs)

VClaw allows users to open browser tabs directly within the application to interact with third-party platform interfaces.

![VClaw Browser Tabs Mockup](./assets/vclaw_browser_tabs.png)

> [!TIP]
> **Integrated Experience:** When a user is on a Shopee Seller Center tab, they can ask the AI Agent to "Check all pending orders" or "Automatically extract info from the current customer" via the Agent Overlay attached to the browser.

---

## 4. Screen Features Specification

The actual implementation of VClaw includes core operational screens running on Next.js App Router (`/admin/*`) with Light/Dark mode support, strictly adhering to the MVP Usecases:

### 4.1 Dashboard / Overview
The central "Operations Console" providing a 360-degree view of business health:
*   **KPI Indicators (Quick Stats):** `Pending Payments`, `Open Orders`, `Bookings Today`, `Open Tasks`.
*   **Growth Charts:** Track real-time revenue (Revenue Chart) and customer growth over time.
*   **AI Efficiency:** Statistics on the effectiveness of automated tasks performed by the Agent.
*   **Task Inbox Widget:** A compact version of the urgent task queue for immediate action from the home screen.

### 4.2 Customers & Conversations (Customers - `/admin/customers`)
The most critical module, where customer data and real-time interactions converge.
*   **Task Inbox Manager:** Implements the *Human-in-the-loop* philosophy at the top of the page. The AI presents proposals (Bill verification, Address confirmation, Booking reminders) for human approval. Quick actions: `[Approve]`, `[Reject]`, `[Edit]`.
*   **Customer Manager & Omnichannel Chat:** Customer list with integrated omnichannel chat (Zalo, Telegram...). Allows quick lookup of order history and personal info within the conversation context.
*   **Channel Thread Panel:** A detailed chat window appearing when a conversation is selected, supporting messaging and AI interaction logs.

### 4.3 Payments & Bill Verification (`/admin/payments`)
Specialized cash flow handling to reduce AI errors.
*   **Bill Verification Manager:** Supports OCR scanning for transaction images.
*   **Reconciliation Table:** A visual 2-column comparison between "Expected Amount" and "Detected Amount (from Bill)".
*   **Status Suggestion:** Auto-highlights using color coding (Green/Amber) depending on the match level, so users can confidently "Confirm Receipt" pushing the event to the Backend.

### 4.4 Booking Management (`/admin/bookings`)
Dedicated to service-based sellers (Spa, Salon, Clinics...).
*   **Booking Manager:** Visual interface showing the list of customers who booked.
*   **Conflict Resolution:** The system automatically checks for available slots and blocks double-bookings.
*   **Reminder Configuration:** A checkbox allowing the AI to automatically text a reminder to the customer `X hours` beforehand.

### 4.5 Shipping & Quotes (`/admin/shipping`)
Connects internal chat with delivery partners like GHN, GHTK.
*   **Shipping Manager:** Analyzes a continuous chat string from the customer (e.g. *123 Le Loi, D1, HCM*) and normalizes it into 4-level geographic data.
*   **Real-time Quotes:** Calls Delivery Adapters to fetch quotes, displaying transparent shipping costs for the seller to finalize with the customer.

### 4.6 Order Workflow (`/admin/orders`)
A lightweight, flexible CRM-lite solution rather than a heavy OMS:
*   **Order Kanban:** Drag-and-drop column interface with standardized status flows: `Wait Pay` -> `Paid` -> `Processing` -> `Done`.
*   **Compact Statistics:** Small order cards with `ID`, `Customer Name`, and `Total Value`, tracking the order lifecycle right from the chat context.

### 4.7 VClaw Token & Automation (Zalo User - `/admin/zalouser`)
Where the technical "soul" of the system is managed but presented in business language:
*   **Bot Zalo:** Monitor connection status, scan QR codes to login, and manage Agent sessions.
*   **Automation:** Configure workflows such as auto-replies, re-engagement (follow-up), manage the Automation Queue, and marketing campaigns.
*   **Settings:** Personalize the Agent, choose Prompt Personas, and configure Payment/Shipping adapters.

---

## 5. Proposed Frontend Development Architecture (Tech Stack)

To design Wireframes like the modern Mockups above, we need:

1. **Framework:** Next.js 14/15 (App Router). Allows static Frontend code to link with local files via API routes.
2. **UI Library:** Tailwind CSS + Shadcn UI (Excellent for making Dashboard components with Glassmorphism or Card layouts).
3. **State Management:** Zustand (lighter than Redux for holding order status).
4. **Data Sync:** Read directly from the `workspace.json` and `local.db` files written by the OpenClaw core engine.

> [!IMPORTANT]  
> Actions on the UI should not poke directly into the Database to change status. The UI should only send `Events` down to the OpenClaw Gateway. For example: When a user clicks [Approve Bill], the Web UI sends the `USER_APPROVED_BILL_ID_1` event via WebSocket, then the OpenClaw Core Workflow Orchestrator handles everything (Updating DB, notifying Agent to respond to customer). This model ensures complete separation between the UI and the Logic processing layer.
