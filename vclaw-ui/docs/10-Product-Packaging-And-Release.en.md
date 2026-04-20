# VClaw Desktop Packaging and Release Strategy

This document describes the technical process for packaging VClaw into a complete Desktop application, enabling non-technical users to use it easily.

---

## 1. Desktop Application Architecture (Browser-Native Shell)

VClaw Desktop is packaged as a **Business Operations Browser**, comprising the following components:

- **Native Shell (Node.js + Playwright)**: Acts as the "App Shell" managing windows and coordinating the lifecycle of the servers. Uses `playwright-chromium` to open a browser window pointing to `http://localhost:12687`.
- **VClaw Business Dashboard (Next.js Standalone - Port 12687)**: Serves as a real server, allowing the use of Middleware to control interactions with OpenClaw.
- **OpenClaw Core Engine (Node.js - Port 18789)**: Focuses on the Agentic runtime and connecting chat channels.

## 2. Packaging Process

The project currently includes a UI written in Next.js (`vclaw-ui`) and an Engine written in OpenClaw (`core/openclaw`). The Desktop build includes both components running in parallel. The application automatically ensures that ports 12687 and 18789 are ready upon startup.

### Step 1: Next.js Static Export Configuration
The `vclaw-ui/next.config.ts` file is configured for `output: 'export'` when triggered by the build script:
```typescript
const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_EXPORT === "true" ? "export" : undefined,
};
```
During the build process, the script exports the UI as static files into the `out/` directory, which are then injected into the Core engine for a truly standalone experience.

### Automated Packaging Script (Recommended)
An automated script is provided at the root directory to handle the entire isolated packaging process, including branding:

```bash
bash scripts/package-vclaw.sh
```

### Step 2: Build and Packaging
The build process creates a Standalone directory for the Native Shell to launch:

```bash
bash scripts/package-vclaw.sh
```

This script performs the following steps:
1. Builds `vclaw-ui` with static export.
2. Injects the result into `dist/control-ui` of the core.
3. Copies the current `openclaw.json` as a configuration template (`openclaw.json.template`).
4. Packages the macOS application and creates a `.dmg` file.

The final release build is located at `build/vclaw-desktop/dist/VClaw.app` and the corresponding `.dmg` installer.

---

## 3. Branding Customization (VClaw)

To fully transition from OpenClaw to VClaw, the following locations are updated:

| Location | File to Modify | Description |
| :--- | :--- | :--- |
| **Product Name** | `apps/macos/Sources/OpenClaw/Resources/Info.plist` | Modifies the application display name. |
| **Bundle ID** | `core/openclaw/scripts/package-mac-app.sh` | Changed to `com.solana8800.vclaw`. |
| **Icon** | `apps/macos/Sources/OpenClaw/Resources/VClaw.icns` | Replaced with the new VClaw logo. |

---

## 4. Auto-Update Mechanism

VClaw uses the **Sparkle** framework to automatically check for and download updates.
- **Feed URL**: Configured in `Info.plist` pointing to the VClaw update server.
- **Release Channel**: Supports `stable` and `beta` channels.

---

> [!TIP]
> **User Approach**: For regular users, they only need to download the `.dmg` file, drag it into the `Applications` folder, and open it. The entire Agent and UI infrastructure will self-start without needing the Terminal, opening an `Operations Console` that serves both operations and growth workflows like content drafting, follow-ups, and approval queues.
