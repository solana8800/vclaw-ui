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

## 2. 🧠 Activating Zero Token AI

VClaw uses OpenClaw Zero Token to chat through your web login session with an AI provider.

### Step 1: Run webauth setup
1. Close VClaw.app if it is open.
2. Open **Terminal** and run:
   ```bash
   /Applications/VClaw.app/Contents/Resources/vclaw-zero.sh
   ```

### Step 2: Sign in to the web model
The script opens Chrome debug at `http://127.0.0.1:9222`. Sign in to the web provider you want to use, return to Terminal, and press **Enter** to run onboarding.

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
- **Browser Data (Cookies/Session):** `~/Library/Application Support/VClaw/ShellElectron` (Electron). **Zero Token:** run `Contents/Resources/vclaw-zero.sh` — Chrome CDP uses that same folder automatically. Prefer closing VClaw.app before running the script so only one process uses the profile at a time.
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
> You only need to sign in once per web provider. VClaw can reuse that browser session afterward.
