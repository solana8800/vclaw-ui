# VClaw Desktop Packaging and Release Strategy

This document describes the technical process for packaging VClaw into a complete Desktop application, enabling non-technical users to use it easily.

---

## 1. Desktop Application Architecture (Browser-Native Shell)

VClaw Desktop is packaged as a **Business Operations Browser**, consisting of the following components:

- **Native Host (Swift/Electron)**: Acts as the "App Shell" managing the application window and Browser Tabs. The Native Host is responsible for initializing Headful tabs (via Playwright or Native WebView) for user interaction with Shopee, Zalo, and Facebook.
- **VClaw Dashboard Layer (Next.js)**: The default tab when the application opens, serving as the "Operations Console" (statically built) for order management, agent configuration, and task approval.
- **Agent Engine (Node.js)**: Runs as a daemon, connecting directly to the browser tabs via CDP (Chrome DevTools Protocol) to observe and assist users right on third-party web interfaces.

## 2. Packaging Process

The current project split includes the UI written in Next.js (`vclaw-ui`) and the Engine in Node.js (`core/openclaw`). For the Desktop application to identify the new interface instead of the original OpenClaw UI, we must statically export the VClaw UI and inject it into OpenClaw's UI folder before starting the packaging process.

### Step 1: Configure VClaw UI for Static Export
The `vclaw-ui/next.config.ts` uses a conditional flag to enable static export only when building for distribution:
```typescript
const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_EXPORT === "true" ? "export" : undefined,
};
```
This allows standard dynamic local development while supporting the desktop build.

### Automated Build Script (Recommended)
An automated script is provided in the root directory to handle the entire isolated build process, including rebranding and packaging:

```bash
bash scripts/package-vclaw.sh
```

### Manual Packaging Steps (Details)
If you prefer manual steps, build the VClaw UI and copy the exported source over:

```bash
cd vclaw-ui
pnpm install
NEXT_PUBLIC_EXPORT="true" pnpm build

# Move files to build/vclaw-desktop/ (Isolated from core)
# (Refer to scripts/package-vclaw.sh for the exact orchestration)
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
