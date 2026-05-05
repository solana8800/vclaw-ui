# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `vclaw-ui/` unless noted.

```bash
pnpm dev          # dev server on port 12687 (also starts gateway sync)
pnpm build        # Next.js production build
pnpm lint         # ESLint
pnpm test         # Vitest full suite
pnpm test:bot-eval  # run only enrichment bot tests (lib/ai/enrichment.test.ts)
vitest run lib/ai/enrichment.test.ts  # run a single test file

# Prisma
pnpm prisma migrate dev   # apply schema changes to local SQLite
pnpm prisma db seed       # seed via prisma/seed.ts

# From repo root
SKIP_BUILD=1 bash scripts/package-vclaw.sh  # package macOS .app/.pkg (assumes UI already built)

# OpenClaw core (core/openclaw-zero-token/)
pnpm build && pnpm gateway:watch   # build + watch gateway
```

## Architecture Overview

### Repo layout (3 layers)

```
core/openclaw-zero-token/   ← git submodule: gateway daemon, channel adapters, agent runtime
vclaw-ui/                   ← Next.js App Router: landing + admin shell + API
scripts/                    ← packaging and workspace sync scripts
superpowers/                ← specs/, plans/, CURRENT_TASK.md, ROADMAP.md (blueprint-driven work)
```

**Rule:** when a task is in `vclaw-ui/`, `scripts/`, or `superpowers/`, the root `README.md` and `AGENTS.md` govern — not the rule files inside `core/openclaw-zero-token/`.

### vclaw-ui internal structure

```
app/api/vclaw/       ← internal API called by OpenClaw gateway
  enrich/            ← POST: builds enriched prompt for LLM
  agent-tools/       ← POST: executes named agent tools (order, payment, shipping…)
  automation/        ← automation job triggers

lib/ai/              ← enrichment pipeline and intent classification
  enrichment.ts      ← getEnrichedContext(): builds context string + executes side effects
  intent-classifier.ts ← keyword-based intent tagger (used for customer labeling, NOT inside enrichment)
  prompts/           ← system prompts and sales guidelines

lib/agent/
  tools.ts           ← executeVclawAgentTool(): 8 named tools (order, payment, product, shipping…)
                        every call is logged to AgentToolLog in DB

lib/zalouser/        ← Zalo OA webhook handling, message sync, outgoing media
lib/channel/         ← channel-agnostic ingest (dedup, conversation threading, rapid-fire merge)
lib/actions/         ← server actions for DB mutations
```

### Zalo message flow (end-to-end)

```
Zalo webhook → /api/webhooks/channel/zalo
  → lib/zalouser/zalo-webhook.ts     (signature verify, parse event)
  → lib/channel/ingest.ts            (dedup, 12s rapid-fire merge, save ConversationMessage, create Task)
  → zalouser-conversation-sync.ts    (intent label via intent-classifier → writes Customer.labels)

  [separate, on-demand]
  OpenClaw gateway → POST /api/vclaw/enrich
  → lib/ai/enrichment.ts             (getEnrichedContext: DB queries + heuristic matching + side effects)
      ↓ if buy intent detected → executeVclawAgentTool("vclaw.order.create")
      ↓ if payment keyword   → update order status
  → buildEnrichedPrompt()
  → returns { prompt } to gateway → gateway sends to LLM
```

**Important:** enrichment is NOT triggered automatically on webhook arrival. The OpenClaw gateway decides when to call `/api/vclaw/enrich`. Most messages are stored and labeled but not enriched.

### AI enrichment vs agent tools (coupling to be aware of)

`enrichment.ts` currently does both context-building (pure) and side-effect execution (impure: order creation, payment status change) by calling `executeVclawAgentTool` directly. This is a known architectural debt — the files are in `lib/ai/` and `lib/agent/` but tightly coupled with no abstraction layer.

### Database

SQLite via Prisma (`prisma/business.sqlite`, schema at `prisma/schema.prisma`). Key models: `Customer`, `Order`, `OrderItem`, `Payment`, `Booking`, `Product`, `ShopSettings`, `Conversation`, `ConversationMessage`, `AgentToolLog`, `AutomationJob`.

`AgentToolLog` captures every `executeVclawAgentTool` call with tool name, payload (truncated 8KB), and ok/error status.

### Event-driven principle

UI should not mutate business state directly in the DB. UI emits events to the OpenClaw gateway (or API routes); the gateway is the authority for state changes, audit logging, and agent decisions. Direct DB writes from UI are only acceptable for settings/configuration, not for order/payment/customer workflows.

## Coding conventions

- **Language:** TypeScript, React 19, Next.js App Router, Tailwind CSS v4, shadcn/radix-style components.
- **UI strings:** always use `next-intl`; update `messages/vi/` and `messages/en/` together.
- **Code comments, console logs, user-facing errors:** natural Vietnamese.
- **Imports:** path alias `@/` for vclaw-ui root.
- **Commits:** Conventional Commits — `feat:`, `fix:`, `refactor:`, etc.

## OpenClaw runtime bot

The sales bot persona lives at `~/.openclaw/workspace/` on the local machine (not in the repo). Seeds are in `scripts/packaging/openclaw-workspace/` and synced by `scripts/sync-openclaw-workspace.sh`. Do not commit `.openclaw/identity/` or live customer data.

## Blueprint-driven work

For planned features, check `superpowers/CURRENT_TASK.md` first, then `superpowers/plans/` for step-by-step checklists and `superpowers/specs/` for design specs. Mark completed steps `[x]` in the plan file.
