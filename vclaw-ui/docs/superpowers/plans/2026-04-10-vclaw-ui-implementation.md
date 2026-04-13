# VClaw UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable `vclaw-ui` Next.js app with a complete landing page, markdown docs viewer backed by repo docs, and a frontend-ready admin shell, with `docs/` as the single source of truth for product documentation.

**Architecture:** Create a new standalone Next.js app in `vclaw-ui`, keep repo-level `docs/` as the single source of truth, and load markdown from that directory through server utilities. Use a shared design system for marketing, docs, and admin surfaces so the product reads as one coherent website.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, React Markdown, Mermaid, Vitest, Testing Library

---

## File Map

### Repo-level moves

- Keep: `docs/` as the canonical product documentation directory
- Keep: `docs/superpowers/specs/2026-04-10-vclaw-ui-design.md`
- Create: `docs/superpowers/plans/2026-04-10-vclaw-ui-implementation.md`

### VClaw UI app

- Create: `vclaw-ui/package.json`
- Create: `vclaw-ui/tsconfig.json`
- Create: `vclaw-ui/next.config.ts`
- Create: `vclaw-ui/postcss.config.mjs`
- Create: `vclaw-ui/next-env.d.ts`
- Create: `vclaw-ui/vitest.config.ts`
- Create: `vclaw-ui/vitest.setup.ts`
- Create: `vclaw-ui/app/layout.tsx`
- Create: `vclaw-ui/app/globals.css`
- Create: `vclaw-ui/app/page.tsx`
- Create: `vclaw-ui/app/docs/page.tsx`
- Create: `vclaw-ui/app/docs/[[...slug]]/page.tsx`
- Create: `vclaw-ui/app/admin/layout.tsx`
- Create: `vclaw-ui/app/admin/page.tsx`
- Create: `vclaw-ui/app/admin/onboarding/page.tsx`
- Create: `vclaw-ui/app/admin/inbox/page.tsx`
- Create: `vclaw-ui/app/admin/customers/page.tsx`
- Create: `vclaw-ui/app/admin/orders/page.tsx`
- Create: `vclaw-ui/app/admin/payments/page.tsx`
- Create: `vclaw-ui/app/admin/bookings/page.tsx`
- Create: `vclaw-ui/app/admin/integrations/page.tsx`
- Create: `vclaw-ui/app/admin/automation/page.tsx`
- Create: `vclaw-ui/app/admin/settings/page.tsx`
- Create: `vclaw-ui/components/marketing/*`
- Create: `vclaw-ui/components/docs/*`
- Create: `vclaw-ui/components/admin/*`
- Create: `vclaw-ui/components/ui/*`
- Create: `vclaw-ui/lib/docs.ts`
- Create: `vclaw-ui/lib/docs.test.ts`
- Create: `vclaw-ui/lib/mock-data.ts`
- Create: `vclaw-ui/lib/utils.ts`
- Create: `vclaw-ui/components/docs/markdown-viewer.tsx`
- Create: `vclaw-ui/components/docs/markdown-viewer.test.tsx`

### Verification targets

- Run in: `vclaw-ui`
- Commands:
  - `npm install`
  - `npm test`
  - `npm run lint`
  - `npm run build`

---

### Task 1: Consolidate docs into the repo-level `docs/` directory

**Files:**
- Modify: repo root folders
- Verify: `docs/00-Business-Requirements.md`

- [ ] **Step 1: Consolidate the docs directory**

Ensure the product markdown files live under `docs/` while preserving `docs/superpowers/**`.

- [ ] **Step 2: Verify the moved docs exist**

Run: `ls docs`
Expected: the five VClaw markdown files plus `superpowers/`

- [ ] **Step 3: Search for stale pre-move references**

Run: `rg "vclaw-docs/" docs vclaw-ui README.md`
Expected: either no matches or intentional historical references only

### Task 2: Scaffold the standalone Next.js app

**Files:**
- Create: `vclaw-ui/package.json`
- Create: `vclaw-ui/tsconfig.json`
- Create: `vclaw-ui/next.config.ts`
- Create: `vclaw-ui/postcss.config.mjs`
- Create: `vclaw-ui/next-env.d.ts`
- Create: `vclaw-ui/app/layout.tsx`
- Create: `vclaw-ui/app/globals.css`

- [ ] **Step 1: Write the app manifest and configs**

Create a standalone app with scripts for `dev`, `build`, `start`, `lint`, and `test`.

- [ ] **Step 2: Configure Next.js file tracing for repo docs**

Set `outputFileTracingIncludes` so Vercel bundles the repo `docs/` directory for routes that read markdown.

- [ ] **Step 3: Add the root layout and global styles**

Create the shared shell used by landing, docs, and admin routes.

### Task 3: Add docs utilities with tests first

**Files:**
- Create: `vclaw-ui/lib/docs.test.ts`
- Create: `vclaw-ui/lib/docs.ts`

- [ ] **Step 1: Write failing tests for docs discovery**

Cover:
- listing markdown docs
- turning filenames into slugs/titles
- reading markdown content by slug
- rejecting path traversal

- [ ] **Step 2: Run the test file and confirm it fails**

Run: `npm test -- docs.test.ts`
Expected: failures because `lib/docs.ts` does not exist yet

- [ ] **Step 3: Implement the docs utility minimally**

Use Node `fs` and `path` helpers to:
- resolve repo docs root
- enumerate markdown docs
- group and order docs
- read file content
- guard against `..`

- [ ] **Step 4: Re-run the tests and confirm they pass**

Run: `npm test -- docs.test.ts`
Expected: all tests pass

### Task 4: Build the docs UI and markdown renderer

**Files:**
- Create: `vclaw-ui/components/docs/markdown-viewer.test.tsx`
- Create: `vclaw-ui/components/docs/markdown-viewer.tsx`
- Create: `vclaw-ui/components/docs/docs-sidebar.tsx`
- Create: `vclaw-ui/components/docs/docs-layout.tsx`
- Create: `vclaw-ui/app/docs/page.tsx`
- Create: `vclaw-ui/app/docs/[[...slug]]/page.tsx`

- [ ] **Step 1: Write failing tests for markdown rendering**

Cover:
- heading rendering
- table rendering
- fenced code rendering
- link rendering

- [ ] **Step 2: Run the markdown viewer tests and confirm they fail**

Run: `npm test -- markdown-viewer.test.tsx`
Expected: failures because the viewer does not exist yet

- [ ] **Step 3: Implement the markdown viewer and docs routes**

Render docs index and doc detail pages using the shared docs utility. Add sidebar, breadcrumb, and previous/next navigation.

- [ ] **Step 4: Re-run the docs tests**

Run: `npm test -- markdown-viewer.test.tsx docs.test.ts`
Expected: all pass

### Task 5: Implement the landing page

**Files:**
- Create: `vclaw-ui/app/page.tsx`
- Create: `vclaw-ui/components/marketing/*`
- Modify: `vclaw-ui/app/globals.css`

- [ ] **Step 1: Create the marketing sections**

Implement:
- hero
- problem
- capabilities
- product surfaces
- workflow
- trust/openclaw
- CTA footer

- [ ] **Step 2: Wire navigation into docs and admin**

Ensure the primary CTAs point to `/docs` and `/admin`.

- [ ] **Step 3: Smoke-check the landing route**

Run: `npm run build`
Expected: the `/` route is included in the build output

### Task 6: Implement the admin shell and product routes

**Files:**
- Create: `vclaw-ui/lib/mock-data.ts`
- Create: `vclaw-ui/app/admin/layout.tsx`
- Create: `vclaw-ui/app/admin/page.tsx`
- Create: `vclaw-ui/app/admin/onboarding/page.tsx`
- Create: `vclaw-ui/app/admin/inbox/page.tsx`
- Create: `vclaw-ui/app/admin/customers/page.tsx`
- Create: `vclaw-ui/app/admin/orders/page.tsx`
- Create: `vclaw-ui/app/admin/payments/page.tsx`
- Create: `vclaw-ui/app/admin/bookings/page.tsx`
- Create: `vclaw-ui/app/admin/integrations/page.tsx`
- Create: `vclaw-ui/app/admin/automation/page.tsx`
- Create: `vclaw-ui/app/admin/settings/page.tsx`
- Create: `vclaw-ui/components/admin/*`

- [ ] **Step 1: Define shared mock data**

Create mock entities for:
- conversations
- customers
- orders
- bookings
- payments
- integrations
- rules/templates

- [ ] **Step 2: Create the admin shell layout**

Implement sidebar navigation, top bar, page header zone, and reusable stat cards/table shells.

- [ ] **Step 3: Build the onboarding route**

Include wizard sections for channel, payment, delivery, booking/service setup, and final review.

- [ ] **Step 4: Build the remaining admin pages**

Each route must render real UI with mock data rather than placeholders.

- [ ] **Step 5: Verify route coverage in the build**

Run: `npm run build`
Expected: all `/admin/*` routes compile successfully

### Task 7: Add polish for Vercel readiness

**Files:**
- Modify: `vclaw-ui/next.config.ts`
- Modify: `vclaw-ui/package.json`
- Modify: any route or docs utility files required by the build

- [ ] **Step 1: Ensure file tracing includes repo docs**

Keep only the minimal tracing config needed for repo-level markdown loading.

- [ ] **Step 2: Ensure no build-time dependency on local-only services**

Remove any code that assumes custom servers, runtime APIs, or undeclared environment variables.

- [ ] **Step 3: Keep the app self-contained for Vercel**

Make sure the default `build` and `start` scripts are sufficient for deployment.

### Task 8: Verify the implementation

**Files:**
- Verify: `vclaw-ui`

- [ ] **Step 1: Install app dependencies**

Run: `npm install`
Expected: install succeeds with a lockfile inside `vclaw-ui`

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: passing test suite

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: successful Next.js production build

- [ ] **Step 5: Manual spot-check the app locally if needed**

Run: `npm run dev`
Verify:
- landing page loads
- `/docs` loads repo docs
- `/docs/00-Business-Requirements` renders markdown
- `/admin` and child routes load

---

## Execution Note

The recommended handoff would normally be:

1. Subagent-Driven execution.
2. Inline execution.

Because the user explicitly asked to implement immediately in this session, proceed with **Inline Execution** now.
