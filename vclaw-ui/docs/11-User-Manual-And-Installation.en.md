# 🚀 VClaw Business Dashboard: User Manual & Installation

Welcome to **VClaw** - The professional AI Assistant designed specifically for online sellers (SMBs). 

> [!IMPORTANT]
> **Key Information:**
> - The website [https://vclaw.space](https://vclaw.space) is for product information and landing page content ONLY.
> - The VClaw system runs **ENTIRELY LOCALLY** on your personal computer to ensure maximum performance and absolute data security.

---

## 1. 📥 Installation and Access

VClaw is designed to be installed and run directly on your machine:

### Desktop Installation (For Mac Users)
1. Download the `VClawInstaller.pkg` installer.
2. Open the file and follow the instructions to install it into your **Applications** folder.
3. **Launch the app:** Open **VClaw** from your Launchpad or the Applications folder. The Business Dashboard will appear immediately for you to start working.

### Desktop window stuck on an error screen

The Mac `.pkg` build opens VClaw inside an **Electron** shell (not a full browser), so you do not get a browser address bar. If the window shows a generic “screen could not load” / server error screen:

- Use the in-window **Retry / Home / Quit** buttons when the app shows the VClaw recovery screen (after a failed load or renderer crash).
- Or use the menu bar: **Điều hướng** (Navigate) → **Tải lại** (Reload), **Về màn hình chính** (Home Screen, shortcut **Cmd+Shift+H**), **Quay lại** / **Tiến** (Back / Forward).
- To exit completely: **VClaw** → **Quit VClaw** (or **Cmd+Q**).

---

## 2. 🧠 Activating the "AI Brain" (Ollama Cloud)

VClaw uses the **Ollama** app to power its AI features (such as reading product photos and analyzing trends).

### Step 1: Open the Ollama App
- Ensure you have installed Ollama (download from [ollama.com](https://ollama.com/)).
- When Ollama is running, you will see a small camel icon in the top Menu Bar of your Mac screen.

### Step 2: Sign In
This is a one-time mandatory step to connect your computer to our powerful AI Cloud service:
1. Press **Command + Space** and type `Terminal`, then hit **Enter**.
2. Copy and paste the command below into the window that appears, then hit **Enter**:
   ```bash
   ollama signin
   ```
3. A web page will automatically open. Simply **Sign In** and click the **Authorize** button to confirm.

![Ollama Sign-in Guide](/assets/ollama-guidance.png)
*(Illustration: How to type the command and authorize in your browser)*

---

## 3. 📦 Key Features for Sellers

### 3.1 📥 AI Task Inbox
- The AI automatically reads customer messages and organizes important requests into the Dashboard for you to handle.

### 3.2 🏷️ Smart Product Cataloging (Product Manager)
- **Turbo Extraction:** Upload product photos, and the AI automatically fills in the Name, Price, and Description.
- **Content Marketing:** The AI drafts ready-to-use social media posts based on your product data.

### 3.3 📋 Order Kanban Board
- Visual order tracking: **Pending -> Paid -> Shipping -> Completed**.
- Simple drag-and-drop interface for seamless operations.

---

## 4. 🔒 Privacy & Security

Because the system is **Local-first**:
- Your customer and order data stay exclusively on your computer.
- The AI Cloud only facilitates processing and "thinking" tasks; it never stores your personal data on external servers.

---

## 5. 📂 Directory Structure (For Technical Users)

If you need to manually inspect or backup your data, VClaw stores files in the following locations:

- **Main Application:** `/Applications/VClaw.app`
- **AI Core (OpenClaw Runtime):** `~/.openclaw/runtime` (Local user-space install, no root required).
- **Configuration & Extensions (Zalo, etc.):** `~/.openclaw/`
- **Browser Data (Cookies/Session):** `~/Library/Application Support/VClaw/ShellElectron`
- **CLI Control Command:** `~/.local/bin/openclaw`

---

## 6. 🗑️ Uninstalling the App

To completely remove VClaw and its components, open your **Terminal** and run:
```bash
sudo /Applications/VClaw.app/Contents/Resources/uninstall-vclaw.sh
```
*Note: This command will stop background services and wipe the local OpenClaw data from your machine.*

---
> [!TIP]
> You only need to perform the **Ollama Sign-in** once. After that, VClaw will be ready to assist you every time you start your computer.
