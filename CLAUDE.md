# CLAUDE.md

This file provides quick-reference commands and layout guidance for Claude Code (claude.ai/code) and other terminal-based agent tools working in this repository.

> [!IMPORTANT]
> For the comprehensive source-of-truth coding standards, system architectures, and event-driven principles, always refer to [AGENTS.md](./AGENTS.md).

---

## 1. Quick Commands

All commands should run from `vclaw-ui/` unless stated otherwise.

```bash
pnpm dev              # Start dev server on port 12687 (runs Next.js & starts gateway listener sync)
pnpm build            # Create Next.js production build
pnpm lint             # Run ESLint validation
pnpm test             # Run Vitest test suite in jsdom
pnpm test:bot-eval    # Run only AI enrichment unit tests (lib/ai/enrichment.test.ts)
pnpm prisma db seed   # Reset database and seed mock data (via prisma/seed.ts)

# Commands from repository root
SKIP_BUILD=1 bash scripts/package-vclaw.sh  # Package macOS app (assumes UI is already built)
```

---

## 2. System Architecture & Boundaries

Please respect the following core design patterns:
1. **Event-Driven UI:** UI components must not mutate data (Orders, Payments, Customers) directly in the database. Instead, UI emits events to the OpenClaw Gateway or dedicated API routes. Direct database writes from UI are reserved for settings only.
2. **Submodule Separation:** `core/openclaw-zero-token/` is an upstream submodule. When working inside `vclaw-ui/`, `scripts/`, or `superpowers/`, the root `AGENTS.md` and `README.md` govern.
3. **Zalo Inbound & AI Enrichment:** Inbound messages are ingested and labeled asynchronously. AI enrichment is decoupled and only triggered on-demand by the OpenClaw Gateway invoking `/api/vclaw/enrich`.

*For detailed file mapping, database schema properties, and message flows, see **[AGENTS.md Section 1](./AGENTS.md#1-project-structure--architecture)**.*

---

## 3. Coding Standards & Conventions

* **Language Stack:** TypeScript, React 19, Next.js App Router, Tailwind CSS v4, Radix UI.
* **Indentation:** 2 spaces.
* **Path Alias:** Use `@/` to import from the `vclaw-ui` root.
* **I18n:** Use `next-intl` for user-facing strings; update `messages/vi/` and `messages/en/` together.
* **Comments & Console Logs:** Must be written in natural, human-like Vietnamese (`natural Vietnamese`).
* **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).

*For testing patterns and other specific requirements, see **[AGENTS.md Section 3 & 4](./AGENTS.md#3-coding-style--conventions)**.*

---

## 4. Blueprint-Driven Execution

For planned features or backlog tasks, check:
* Current Task: `superpowers/CURRENT_TASK.md`
* Checklist Plans: `superpowers/plans/`
* Technical Specs: `superpowers/specs/`
* Check completed checklist items with `- [x]` in the corresponding plan file.
