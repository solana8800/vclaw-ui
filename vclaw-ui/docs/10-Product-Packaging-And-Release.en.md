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

The current project split includes the UI written in Next.js (`vclaw-ui`) and the Engine in Node.js (`core/openclaw`). For the Desktop application to identify the new interface instead of the original OpenClaw UI, we must statically export the VClaw UI and inject it into OpenClaw's UI folder before starting the packaging process.

### Step 1: Configure VClaw UI for Static Export
Make sure `vclaw-ui/next.config.ts` has the `output: 'export'` flag enabled:
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  // Other configs...
};
```

### Step 2: Build UI and Transfer Files
Run the build command for VClaw UI and copy the entire statically exported source (`out/`) over to OpenClaw's control-ui folder:
```bash
# Enter the UI folder and build
cd vclaw-ui
pnpm install
pnpm build

# Remove OpenClaw's old UI and copy the new one over
rm -rf ../core/openclaw/dist/control-ui
mkdir -p ../core/openclaw/dist/control-ui
cp -R out/* ../core/openclaw/dist/control-ui/
```

### Step 3: Run Mac Packaging Script
Move to the core directory to proceed with building the macOS app. It is REQUIRED to pass the environment variable `SKIP_UI_BUILD=1` so that OpenClaw does not automatically rebuild the old technical interface and overwrite the newly injected VClaw UI.
```bash
cd ../core/openclaw
pnpm install
pnpm build

# Create VClaw.app package
SKIP_UI_BUILD=1 ./scripts/package-mac-app.sh

# Create .dmg installer
SKIP_UI_BUILD=1 ./scripts/create-dmg.sh
```
The final release build will be located at `core/openclaw/dist/VClaw.app` and its corresponding `.dmg` installer.

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
