# Repository Guidelines & Agent Instructions

This document defines the guidelines and workflows for coding agents (such as Gemini, Cursor, and Claude Code) working in this repository.

---

## 1. Project Structure & Architecture

### 1.1 Repo Layout (3 Layers)
* `core/openclaw-zero-token/` (submodule) — OpenClaw runtime, gateway, and channel adapters.
* `vclaw-ui/` — The main Next.js App Router workspace (landing, docs viewer, and admin shell).
* `scripts/` — Packaging and workspace sync scripts.
* `superpowers/` — The execution framework: specifications (`specs/`), plans (`plans/`), tasks, and runbooks.

**Rule:** When working inside `vclaw-ui/`, `scripts/`, or `superpowers/`, these root guidelines (`AGENTS.md`, `README.md`) govern—do not let the local rule files inside the `core/` submodule override them.

### 1.2 vclaw-ui Module Organization
* `vclaw-ui/app/` — App Router routes (including i18n routes under `[locale]/`).
* `vclaw-ui/components/` — Reusable React UI components (e.g., admin shell, docs rendering).
* `vclaw-ui/lib/` — Shared server and client logic (AI enrichment, db clients, helper utils).
* `vclaw-ui/messages/` — Localization dictionary files (`vi/`, `en/`).
* `vclaw-ui/prisma/` — Database schema (`schema.prisma`), migrations, and seeds (`seed.ts`).
* `vclaw-ui/docs/` — Public documentation served at `/docs`.
* `docs/` (Root directory) — Private system design, API integrations, and internal blueprints (not exposed to `/docs`).

### 1.3 Key Architectural Principles

#### Event-Driven UI Principle
UI components must not mutate business state (e.g. creating/modifying orders, payments, customers) directly in the database. Instead, UI emits events to the OpenClaw Gateway (or specific backend API route), which is the authority for execution, state changes, auditing, and logging. Direct DB writes from the UI are only acceptable for settings and configurations.

#### Zalo Inbound Message Flow (End-to-End)
```text
Zalo webhook → /api/webhooks/channel/zalo
  → lib/zalouser/zalo-webhook.ts     (Signature verification, event parsing)
  → lib/channel/ingest.ts            (Deduplication, 12s message merging, DB write)
  → zalouser-conversation-sync.ts    (Intent labeling via intent-classifier)

  [On-Demand / Pull-based]
  OpenClaw Gateway → POST /api/vclaw/enrich
  → lib/ai/enrichment.ts             (Context gathering, execution of tools if buy intent)
  → buildEnrichedPrompt()            (Returns final prompt to gateway for LLM execution)
```

---

## 2. Build, Test, and Development Commands

All commands should be executed from `vclaw-ui/` unless stated otherwise:

* `pnpm dev`: Start the Next.js dev server on port `12687` (includes gateway listener sync).
* `pnpm build`: Generate the production Next.js standalone build.
* `pnpm start`: Run the production Next.js server on port `12687`.
* `pnpm lint`: Run ESLint using the custom configuration rules.
* `pnpm test`: Execute the Vitest suite in the `jsdom` environment.
* `pnpm test:bot-eval`: Run specific test files for the AI enrichment engine (`lib/ai/enrichment.test.ts`).
* `pnpm prisma db seed`: Seed the local SQLite database using the Prisma seed script.
* `SKIP_BUILD=1 bash scripts/package-vclaw.sh`: Package the macOS standalone app from the root folder (requires existing UI build).

---

## 3. Coding Style & Conventions

* **Tech Stack:** TypeScript, React 19, Next.js App Router, Tailwind CSS v4, and Radix UI / shadcn style primitives.
* **Indentation:** Prefer 2-space indentation.
* **Exports:** Use named exports for shared utilities.
* **Imports:** Use path alias imports via `@/` pointing to the `vclaw-ui` root.
* **Naming:** Component files must use kebab-case (e.g., `components/app/firebase-analytics.tsx`) or local folder conventions.
* **Localization:** All user-facing strings must be localized using `next-intl`. When changing strings, update `messages/vi/` and `messages/en/` together.
* **Language & Tone:** Code comments, terminal logs, console prints, and user-facing error messages must be in natural, conversational Vietnamese.
  *(Comment và log luôn dùng tiếng Việt tự nhiên để tạo cảm giác do con người viết, không phải AI dịch tự động)*

---

## 4. Testing & Verification Guidelines

* Place unit tests next to the file under test using the `*.test.ts` or `*.test.tsx` extensions (e.g., `lib/i18n/routing.test.ts`).
* Always verify implementation with focused tests for routing, internationalization, data parsing, and critical workflows.
* Run `pnpm test` and `pnpm lint` before requesting code verification.

---

## 5. Security & Agent-Specific Notes

* Do not commit local secrets, environment credentials, sqlite database files (`prisma/*.sqlite`), or private customer data.
* Do not update public documentation under `vclaw-ui/docs/` with private/sensitive files. Check `KNOWLEDGE_INDEX.md` before moving docs.
* Coding agent guidelines are separate from the runtime bot persona. Do not copy runtime persona profiles (`~/.openclaw/workspace/AGENTS.md`) into the repository.
* When working on a blueprint-driven task, strictly follow the steps in `superpowers/specs/` and `superpowers/plans/`, and mark completed items with `- [x]`.

---

## 6. AI Vibe Coding Guidelines (Best Practices)

To ensure the best Pair Programming experience with the developer, always follow these rules:

1. **Be Precise & Non-Intrusive:** Implement the narrowest scope of changes required. Avoid "cascade refactoring" unless explicitly requested.
2. **Review Knowledge Indexes FIRST:** Before building new logic, check `KNOWLEDGE_INDEX.md` and current knowledge summaries to see if a similar pattern exists.
3. **Verify Build Continuously:** Run `pnpm build` or check for SSR compatibility whenever editing layout wrappers or React components.
4. **Natural Vietnamese Communication:** Always converse with the user in natural Vietnamese. Keep explanations concise, clear, and direct. Highlight files modified using markdown links with the `file://` scheme.
5. **Leverage Design & Style Skills:** When working on UI/UX design, landing pages, or custom layouts, leverage the local design intelligence skill [.agent/skills/ui-ux-pro-max](./.agent/skills/ui-ux-pro-max) to search and generate consistent design systems (using the Master + Overrides pattern).
