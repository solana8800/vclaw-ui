# VClaw Continuous Development & Automation Blueprint

This document outlines the strategy for the **Continuous, Automated, and AI-native** development of VClaw. As a "controlled product fork" of OpenClaw, VClaw requires a specialized workflow that keeps the core up-to-date while automating the business-layer (UI and CRM) evolution.

---

## 1. Automated Infrastructure

### 1.1 Git Submodule Strategy
- **Upstream Sync**: Weekly automated pulls from `openclaw/openclaw` into `/core/openclaw`.
- **Plugin Decoupling**: Business logic (VietQR, Shipping, etc.) is developed as independent OpenClaw plugins to avoid merge conflicts with the core.
- **VClaw UI**: Versioned independently, consuming core APIs via standard WebSocket/REST contracts.

### 1.2 Development Environment Automation
- **Bootstrap Script**: A single `scripts/bootstrap.mjs` that:
  1. Installs all UI dependencies.
  2. Runs `pnpm install` and `pnpm build` in the core.
  3. Verifies the Node.js and Go environment.
- **One-Click Startup**: `npm run dev:full` will concurrently start the OpenClaw Gateway (core) and the Next.js Operations Console (UI).

---

## 2. Agentic Development Workflow (Coding via Messages)

VClaw is designed to be **Agentic-first**. This means the software itself helps you build it.

### 2.1 Workspace Awareness
OpenClaw is configured with a `workspace.json` that gives the internal AI agent full context of:
- The `vclaw-ui` component library (shadcn/ui).
- The `core/openclaw` plugin API.
- The `docs/` directory as the "Source of Truth" for requirements.

### 2.2 Continuous Coding Loop
1. **Instruction**: You send a message via the VClaw Admin Chat (e.g., *"VClaw, add a new field 'Store Location' to the Onboarding Wizard"*).
2. **Analysis**: The VClaw Dev Agent analyzes the React component and the underlying JSON schema in the Core.
3. **Execution**: The Agent performs the multi-file edit (UI form, i18n payloads, and backend schema).
4. **Verification**: Automated Vitest suites run to ensure no regressions.

---

## 3. CI/CD & Deployment Automation

### 3.1 Automated Quality Assurance
- **Lint Gating**: Pre-commit hooks run `oxlint` and `eslint` to maintain banking-grade code quality.
- **Agentic Testing**: If a test fails, a specialized "Fixer Agent" investigates the logs and proposes a patch.

### 3.2 Continuous Delivery
- **Vercel Integration**: Automatic previews of the `vclaw-ui` surface for every PR.
- **Native Packaging**: Github Actions automated nightly builds of the `.exe` and `.dmg` 1-click installers.

---

## 4. Roadmap to Full Automation

| Stage | Focus | Automation Level |
| :--- | :--- | :--- |
| **Foundation** | Submodule & Env | Manual setup with bootstrap helpers. |
| **UI Integration** | Mock to Real logic | Semi-automated (AI writes UI, human verifies). |
| **Full Agentic** | Self-Improvement | Fully automated (Agent detects trends and proposes features). |

> [!IMPORTANT]  
> All automated "Self-Improvement" actions are gated by the **Human-in-the-loop Task Inbox**. AI never pushes code to production without your explicit `[Approve]` click in the Admin Console.
