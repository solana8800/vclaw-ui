# VClaw Desktop Packaging and Release Strategy

This document describes the technical process for packaging VClaw into a complete Desktop application, enabling non-technical users to use it easily.

---

## 1. Desktop Application Architecture (Browser-Native Shell)

VClaw Desktop is packaged as a **Business Operations Browser**, consisting of the following components:

- **Native Host (Swift)**: Acts as the "App Shell" managing the application window and orchestrating the lifecycle of the local servers. Using `WKWebView` pointing to `http://localhost:8800`.
- **VClaw Business Dashboard (Next.js Standalone - Port 8800)**: Runs as a full server, allowing the use of Middleware to control interactions with OpenClaw.
- **OpenClaw Core Engine (Node.js - Port 12687)**: Focuses on Agentic runtime and connecting chat channels.

## 2. Packaging Process

The current project split includes the UI written in Next.js (`vclaw-ui`) and the Engine in Node.js (`core/openclaw`). The Desktop build includes both components running in parallel (**Sidecar Architecture**). The application automatically ensures that ports 8800 and 12687 are available upon startup.

### Step 1: Configure Next.js Standalone Mode
The `vclaw-ui/next.config.ts` is configured with `output: 'standalone'` to optimize packaging:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
};
```
When running `npm run build`, Next.js creates a self-contained directory at `.next/standalone` including all necessary server code and node_modules. This ensures Middleware and Server Actions are preserved in the desktop application.

### Automated Build Script (Recommended)
An automated script is provided in the root directory to handle the entire isolated build process, including rebranding and packaging:

```bash
bash scripts/package-vclaw.sh
```

### Step 2: Build and Package
The build process generates more than just public assets; it creates the Standalone bridge:

```bash
cd vclaw-ui
pnpm install
pnpm build
# The .next/standalone directory is ready to be bundled into the App
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
