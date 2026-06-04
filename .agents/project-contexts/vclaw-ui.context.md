# Project Context: VClaw UI

This file serves as the adapter between the portable `.agents` ADLC framework and the VClaw project.

## Identity

- Project name: VClaw
- Context id: vclaw-ui
- Platform: mixed (Next.js web app + local macOS standalone packaging + gateway socket connection)
- Primary language/framework: TypeScript, React 19, Next.js App Router (16.2.3), Tailwind CSS v4, Prisma
- Runtime: Node.js (pnpm)
- Repository root: /Users/vf-tuantd26-l/Documents/projects/vclaw
- Owning team: Core
- Main environments: local, production

## Source Of Truth

- Product/business docs: docs/ (Root directory) - contains private system design, API integrations, and internal blueprints.
- Technical architecture docs: AGENTS.md, README.md
- API contract docs: docs/ (Root directory)
- Design source/Figma MCP: TODO
- Data model/schema docs: vclaw-ui/prisma/schema.prisma
- Security/compliance docs: TODO
- Release/runbook docs: TODO

## Scope Boundary

- In scope: vclaw-ui/, scripts/, superpowers/
- Out of scope: core/openclaw-zero-token/ (submodule)
- Upstream systems: Zalo webhook
- Downstream systems: OpenClaw Gateway
- External integrations: Zalo API
- Production actions requiring approval: prisma db push/db seed in production, modifying core submodule.

## Paths

- Source root: vclaw-ui
- Test root: vclaw-ui
- API/backend project: vclaw-ui
- Web/mobile app: vclaw-ui
- Config/env samples: vclaw-ui/.env
- Dockerfile: TODO
- Migration project: vclaw-ui/prisma
- Startup project: vclaw-ui
- Generated code destination: vclaw-ui
- Generated test destination: vclaw-ui

## Commands

- Install/restore:
  ```bash
  pnpm install
  ```

- Build:
  ```bash
  pnpm build
  ```

- Test:
  ```bash
  pnpm test
  ```

- Lint/format:
  ```bash
  pnpm lint
  ```

- Security/dependency audit:
  ```bash
  pnpm audit
  ```

- Run locally:
  ```bash
  pnpm dev
  ```

- Migration create/apply/check:
  ```bash
  pnpm prisma migrate dev
  pnpm prisma db seed
  ```

- Full verification:
  ```bash
  pnpm build && pnpm lint && pnpm test
  ```

## Architecture Conventions

- Architecture style: Next.js App Router (pages/api, React components)
- Namespace/package root: `@/` alias mapped to `vclaw-ui/`
- Route/API prefix: `/api/`
- Endpoint/controller/component conventions: kebab-case files under components/ and app/ routes
- Request/response envelope: Standard JSON responses, next-intl for localization
- Persistence pattern: Prisma ORM with SQLite database (prisma/schema.prisma)
- Migration policy: Run prisma migrations on schema change
- Error handling pattern: standard try-catch, custom JSON error responses
- Logging pattern: natural Vietnamese in logs and comments
- Timezone/time source: ICT (Indochina Time) / UTC+7

## Product Conventions

- Validation language: Vietnamese
- User-facing error language: Vietnamese (Conversational)
- Code identifier language: English
- Logging/reporting language: Vietnamese

## Sensitive Data And Security

- Sensitive data/PII: User conversation sync data
- Regulated data: TODO
- Secrets/config policy: Do not commit local secrets, environment credentials, sqlite database files (`prisma/*.sqlite`).
- AuthN mechanism: Zalo Webhook signature verification, auth session management.
- Tenant/resource ownership checks: User and conversation mappings.

## UI/Design Conventions

- Brand/design system: Tailwind CSS v4, Radix UI / shadcn style primitives.
- Microcopy language: Vietnamese
- Figma file/page/node: TODO

## Testing Conventions

- Test framework: Vitest + jsdom
- Unit test style: Place unit tests next to the file under test using the `*.test.ts` or `*.test.tsx` extensions.

## Skill Adapters

- Product docs to inspect:
  ```bash
  python3 .agents/skills/product_agent/scripts/ba_brd_analyzer.py --feature "<feature keyword>" --master-doc "docs/README.md" --detail-dir "docs" --detail-glob "*.md"
  ```

- Designer/Figma source:
  ```text
  TODO
  ```

- QC test generator arguments:
  ```bash
  TODO
  ```

- Engineering code generator arguments:
  ```bash
  TODO
  ```

- DevOps pipeline arguments:
  ```bash
  bash .agents/skills/devops_agent/scripts/devops_pipeline.sh \
    --project-dir "vclaw-ui" \
    --scan-dirs "vclaw-ui" \
    --cmd-restore "pnpm install" \
    --cmd-build "pnpm build" \
    --cmd-test "pnpm test" \
    --cmd-audit "pnpm audit"
  ```

## Completion Evidence Required

- Product: Acceptance Criteria document, scope mapping
- Design: Component contract and state specifications
- QC: Vitest pass report, test coverage index
- Engineering: Clean build output, no linter errors
- Security: No credential/secrets committed check
- DevOps: Pipeline run command output showing success
- Release: Release version increment and packaging verification
