# VClaw Desktop Packaging and Release Strategy

This document describes the technical process for packaging VClaw into a complete Desktop application, enabling non-technical users to use it easily.

---

## 1. Desktop Application Architecture

VClaw Desktop is built based on the OpenClaw architecture, consisting of 3 main layers:
- **Native Host (Swift)**: Responsible for the application window on macOS, lifecycle management, and system menus.
- **UI Layer (Next.js)**: The `vclaw-ui`, packaged as static resources within the application.
- **Agent Engine (Node.js)**: The agentic processing core located in `core/openclaw`, running in the background (daemon) to execute tasks.

Under the current product direction, this UI layer is not just for internal operations. It also needs to support surfaces such as `Campaigns / Content`, `Task Inbox`, `Commerce`, and policy screens for guarded growth automation.

## 2. Packaging Process

To create a `.app` or `.dmg` release, we use the existing script system in `core/openclaw/scripts`:

### Step 1: Build UI & JS
Run the build command for the entire project to prepare assets:
```bash
# In the vclaw root directory
cd vclaw-ui && pnpm build && npm run export
cd ../core/openclaw && pnpm build
```

### Step 2: Run Mac Packaging Script
Use the `package-mac-app.sh` script adjusted for VClaw:
```bash
./core/openclaw/scripts/package-mac-app.sh
```
The result will be at: `dist/VClaw.app`

### Step 3: Create Installer (.dmg)
Use the `create-dmg.sh` script to create a user-friendly installer:
```bash
./core/openclaw/scripts/create-dmg.sh
```

---

## 3. Branding Customization (VClaw)

To fully transition from OpenClaw to VClaw, the following locations need to be updated:

| Location | File to modify | Description |
| :--- | :--- | :--- |
| **Product Name** | `apps/macos/Sources/OpenClaw/Resources/Info.plist` | Change the application display name. |
| **Bundle ID** | `core/openclaw/scripts/package-mac-app.sh` | Change to `com.solana8800.vclaw`. |
| **Icon** | `apps/macos/Sources/OpenClaw/Resources/OpenClaw.icns` | Replace with the new VClaw logo. |

---

## 4. Auto-Update Mechanism

VClaw uses the **Sparkle** framework to automatically check for and download updates.
- **Feed URL**: Configured in `Info.plist` pointing to the VClaw update server.
- **Release Channel**: Supports `stable` and `beta` channels.

---

> [!TIP]
> **User Approach**: For regular users, they just need to download the `.dmg` file, drag it into the `Applications` folder, and open it. The entire Agent infrastructure and UI will start automatically without using the Terminal, opening an `Operations Console` that supports both day-to-day operations and controlled growth workflows such as content drafts, follow-up, and approval queues.
