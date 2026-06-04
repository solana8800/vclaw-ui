# Project Context Template

Use this file as the adapter between the reusable `.agents` ADLC framework and one concrete project. Copy it to `.agents/project-contexts/<service-or-app>.context.md` for each app, service, package, mobile app, portal, miniapp, library or platform slice.

Do not put concrete project paths, domains, actors, BRDs or commands into reusable skills. Put them here.

## Identity

- Project name:
- Context id:
- Platform: backend / web / mobile / miniapp / portal / library / data / ai-agent / mixed
- Primary language/framework:
- Runtime:
- Repository root:
- Owning team:
- Main environments:

## Source Of Truth

- Product/business docs:
- Technical architecture docs:
- API contract docs:
- Design source/Figma MCP:
- Data model/schema docs:
- Security/compliance docs:
- Release/runbook docs:

## Scope Boundary

- In scope:
- Out of scope:
- Upstream systems:
- Downstream systems:
- External integrations:
- Production actions requiring approval:

## Paths

- Source root:
- Test root:
- API/backend project:
- Web/mobile app:
- Shared packages:
- Config/env samples:
- Dockerfile:
- Migration project:
- Startup project:
- Generated code destination:
- Generated test destination:

## Commands

- Install/restore:
  ```bash
  <command>
  ```

- Build:
  ```bash
  <command>
  ```

- Test:
  ```bash
  <command>
  ```

- Lint/format:
  ```bash
  <command>
  ```

- Security/dependency audit:
  ```bash
  <command>
  ```

- Run locally:
  ```bash
  <command>
  ```

- Migration create/apply/check:
  ```bash
  <command>
  ```

- Full verification:
  ```bash
  <command>
  ```

## Architecture Conventions

- Architecture style:
- Namespace/package root:
- Route/API prefix:
- Endpoint/controller/component conventions:
- Request/response envelope:
- Persistence pattern:
- Migration policy:
- Error handling pattern:
- Logging pattern:
- Timezone/time source:
- Pagination/idempotency conventions:

## Product Conventions

- Modules/domains:
- Actors/roles:
- Permission model:
- Ownership/data-scope rules:
- Enum/status source:
- Business rule source:
- Validation language:
- User-facing error language:
- Code identifier language:
- Logging/reporting language:

## Sensitive Data And Security

- Sensitive data/PII:
- Regulated data:
- Payment data boundary:
- Medical/health data boundary:
- Secrets/config policy:
- AuthN mechanism:
- AuthZ mechanism:
- Tenant/resource ownership checks:
- Audit logging requirements:
- Security gates:

## UI/Design Conventions

- Brand/design system:
- Component library:
- Accessibility target:
- Responsive breakpoints:
- Required UI states:
- Microcopy language:
- Figma file/page/node:
- Analytics/audit events:

## Testing Conventions

- Test framework:
- Contract/integration test style:
- Unit test style:
- UI/E2E test style:
- Fixture/seed data:
- Required happy path:
- Required negative cases:
- Required security cases:
- Required Unicode/localization cases:
- Eval/golden dataset path for AI/Agent features:

## ADLC Conventions For AI/Agent Features

- Allowed model/providers:
- Prompt source path:
- Tool contract path:
- Memory policy:
- RAG/context source:
- Human approval boundary:
- Forbidden autonomous actions:
- Eval thresholds:
- Monitoring signals:
- Rollback/containment:

## Skill Adapters

- Product docs to inspect:
  ```bash
  python3 .agents/skills/product_agent/scripts/ba_brd_analyzer.py --feature "<feature keyword>" --master-doc "<main-doc>" --detail-dir "<detail-dir>" --detail-glob "*.md"
  ```

- Designer/Figma source:
  ```text
  <Figma MCP URL/node, design export, or design handoff path>
  ```

- QC test generator arguments:
  ```bash
  python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "<EntityName>" --route "<route>" --test-dir "<test-dir>" --namespace "<test-namespace>"
  ```

- Engineering code generator arguments:
  ```bash
  python3 .agents/skills/engineering_agent/scripts/dotnet_codegen.py --entity "<EntityName>" --properties "<Field:Type,...>" --root-namespace "<Namespace>" --domain-dir "<domain-dir>" --application-dir "<application-dir>" --api-endpoint-dir "<api-endpoint-dir>"
  ```

- DevOps pipeline arguments:
  ```bash
  bash .agents/skills/devops_agent/scripts/devops_pipeline.sh \
    --project-dir "<project-dir>" \
    --scan-dirs "<source test dirs>" \
    --dockerfile "<Dockerfile>" \
    --cmd-restore "<restore-command>" \
    --cmd-build "<build-command>" \
    --cmd-test "<test-command>" \
    --cmd-audit "<audit-command>"
  ```

- Security gates:
- Release gates:

## Completion Evidence Required

- Product:
- Design:
- QC:
- Engineering:
- Security:
- DevOps:
- Release:
