# Repository Guidelines

## Project Structure & Module Organization

This repository is a VClaw product workspace. The main Next.js application lives in `vclaw-ui/`. App Router routes are under `vclaw-ui/app/`, reusable UI is in `vclaw-ui/components/`, shared server/client logic is in `vclaw-ui/lib/`, locale messages are in `vclaw-ui/messages/`, and Prisma files are in `vclaw-ui/prisma/`. Public documentation served by the app is in `vclaw-ui/docs/`; private architecture and integration notes are in root `docs/`. OpenClaw Zero Token runtime code is a submodule at `core/openclaw-zero-token/`.

This file is for coding agents working in the VClaw repo. Runtime persona for the sales bot is read from `~/.openclaw/workspace/` (not from random paths in the repo). **Packaging seeds** for that folder live under `scripts/packaging/openclaw-workspace/` and are copied by `scripts/sync-openclaw-workspace.sh` (used by `package-vclaw.sh`, pkg postinstall, and `vclaw-zero.sh`). Do not commit `.openclaw/identity/` or live customer secrets into the repository.

## Build, Test, and Development Commands

Run commands from `vclaw-ui/` unless noted.

- `pnpm dev`: start the Next.js dev server on port `12687`.
- `pnpm build`: create the production Next.js standalone build.
- `pnpm start`: run the production server on port `12687`.
- `pnpm lint`: run ESLint with Next.js core web vitals and TypeScript rules.
- `pnpm test`: run the Vitest suite in `jsdom`.
- `SKIP_BUILD=1 bash scripts/package-vclaw.sh`: package the macOS app from the repo root when the UI build already exists.

## Coding Style & Naming Conventions

Use TypeScript, React 19, Next.js App Router patterns, Tailwind CSS, and shadcn/radix-style components. Prefer 2-space indentation, named exports for shared utilities, and path alias imports via `@/`. Component files should use kebab-case or established local names, for example `components/docs/markdown-viewer.tsx`. All UI strings must use `next-intl`; update `messages/vi/` and `messages/en/` together. Code comments, console logs, and user-facing errors should be natural Vietnamese.

## Testing Guidelines

Tests use Vitest with React Testing Library and `jsdom`. Place tests beside the unit under test using `*.test.ts` or `*.test.tsx`, as in `lib/i18n/routing.test.ts` and `components/docs/markdown-viewer.test.tsx`. Add focused tests for routing, i18n, data formatting, and admin workflows when behavior changes. Run `pnpm test` before submitting.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style, for example `feat: add OpenClaw JSON Config Guide`. Keep commit subjects imperative and scoped when useful: `fix: handle zalouser empty batch`. Pull requests should include a short summary, affected paths, linked issue or plan/spec when applicable, screenshots for UI changes, and the exact lint/test/build commands run.

## Security & Agent-Specific Notes

Do not commit secrets, local credentials, SQLite production data, or private customer information. Check `KNOWLEDGE_INDEX.md` before moving docs so public `vclaw-ui/docs/` and private `docs/` stay separated. For blueprint-driven work, follow `superpowers/specs/` and `superpowers/plans/`, and mark completed checklist items with `- [x]`. Keep coding-agent instructions separate from OpenClaw runtime bot instructions; `~/.openclaw/workspace/AGENTS.md` is the runtime source of truth when `core/openclaw-zero-token/server.sh` starts the gateway.
