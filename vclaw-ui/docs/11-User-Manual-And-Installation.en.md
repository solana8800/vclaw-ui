# VClaw Business Dashboard: User Manual and Installation Guide

Welcome to **VClaw** - An AI-integrated Operations Console designed specifically for SMB sellers to manage their business, automate workflows, and achieve sustainable growth.

---

## 1. Access Methods

You can access VClaw in two primary ways:

### Option 1: Direct Web Access (Cloud)
- URL: [https://vclaw.space](https://vclaw.space)
- Full support for the Dashboard, Product Manager, and Order Management modules.
- No installation required on your computer.

### Option 2: Standalone App (For macOS)
1. Download the `VClawInstaller.pkg` file from GitHub or the official distribution page.
2. Open the file and follow the instructions to install it into the **Applications** folder.
3. Launch the app: VClaw will automatically start the **Business Dashboard** (port 12687) and the **AI Engine** (port 18789) in the background.

---

## 2. Core Modules

### 2.1 Inbox & Task Center
- A unified hub for all customer requests (Zalo, Messenger, Telegram).
- The AI Agent automatically categorizes and places tasks into your Inbox for immediate action.

### 2.2 AI-Powered Product Manager
- **Automated Extraction**: Simply upload a product image, and the AI will analyze and extract the Name, Price, Description, and Category.
- **Marketing Support**: Get AI-generated marketing content that is concise and engaging based on your product details.
- **Standarization**: Centralize your product catalog for future automated sales campaigns.

### 2.3 Order Management (Order Kanban)
- Manage your sales pipeline through various statuses: **Pending -> Paid -> Processing -> Done**.
- An intuitive Kanban board view ensures you never miss a single order.

### 2.4 AI Assistant (AiChatAssistant)
- A floating chat icon always available at the bottom-right of your screen.
- Ask the AI anything: Lookup orders, draft customer replies, or get advice on marketing strategies.

---

## 3. Zero-Onboarding Experience

VClaw is designed for immediate productivity:
- **Default AI Configuration**: Integrated with powerful AI models (DeepSeek, Kimi) out of the box. You don't need to manage API Keys to get started.
- **Ready to Connect**: When using the standalone installer, the app automatically configures local ports (Port 18789) for seamless communication between the UI and the AI Engine.

---

## 4. For Developers (Advanced Users)

If you wish to customize or run VClaw in a development environment:
1. Ensure `Node.js` (v24+) and `pnpm` are installed.
2. In the `vclaw-ui` directory, run:
   ```bash
   pnpm install
   pnpm dev
   ```
3. Access the dashboard at [http://localhost:12687](http://localhost:12687).
4. Configure environment variables in the `.env` file for custom API Keys or gateway settings.

---

## 5. Security & Data Privacy

VClaw is committed to securing your business data. All order and customer logic is stored in a local database (`business.sqlite`). The AI only accesses necessary data when explicitly requested to assist with your decision-making processes.

---
> [!TIP]
> Use the **AI Product Extraction** feature to save up to 80% of the time usually spent on manual item cataloging!
