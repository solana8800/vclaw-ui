---
name: engineering_agent
description: >-
  Thiết kế và triển khai code theo Clean Architecture hoặc kiến trúc hiện có,
  đọc test TDD trước khi code, bám Product/BRD docs, xử lý validation,
  persistence, auth, API/UI contract và warnings để build/test pass.
---

# Engineering Agent

Use this skill for backend, frontend, mobile, database, API, integration, refactor, bugfix, and implementation tasks.

Keep this skill low-coupled and high-cohesion: Engineering owns implementation quality and architecture boundaries. Project-specific details such as framework, namespace, source paths, build/test commands, route conventions and design source must come from repo inspection or Project Context.

## Required Order

1. Read Product AC and BRD mapping.
2. Read or create QC tests first via `$qc_agent`.
3. For UI/frontend/mobile work, read Designer handoff and Figma MCP frame/node context before coding.
4. Inspect existing local patterns before adding abstractions.
5. Implement narrowly in the right layer.
6. Run build/test/security checks or report why they could not run.

## Backend Architecture

- Domain/Core: entities, enums, value objects, domain invariants.
- Application/Use Cases: commands, queries, handlers, interfaces, DTOs, validation.
- Infrastructure/Adapters: persistence, external integrations, repositories/gateways.
- API/Presentation: endpoint/controller/screen mapping, auth, request/response boundaries.
- Tests: path and framework from Project Context.

Do not import Infrastructure into Domain/Core or Application/Use Cases. Do not put business logic in controllers/screens when it belongs in handlers/services/domain.

## Repository Patterns

- Prefer the architecture, folder layout and feature style already used by the selected project context.
- Prefer the endpoint/controller/component pattern already used by the touched module.
- Use the request/response envelope declared in project context consistently for public contracts.
- Keep controllers/endpoints thin: auth, route binding, mediator dispatch, response mapping only.
- Do not introduce repositories unless the current module already uses one or the abstraction removes real integration complexity.

## Coding Rules

- Code identifiers in the language declared by project context, defaulting to English.
- Comments and log messages in the language declared by project context, defaulting to Vietnamese.
- No SQL string concatenation.
- No hardcoded secrets.
- No PII in logs.
- Use `CancellationToken` in async persistence/external calls.
- Configure EF conversions carefully; list/JSON conversions need correct comparison behavior when using tracked providers.
- Keep existing route style unless Product/QC contract requires a change.
- Query-only EF calls should use `AsNoTracking()`.
- Pagination must validate page/page size and cap page size for list endpoints.
- Timestamps should be UTC.
- Validation belongs in FluentValidation or Application services, with Vietnamese user-facing messages.
- Avoid returning EF entities directly from API responses; map to DTOs.
- Do not swallow exceptions. Handle expected business failures with typed response paths; let unexpected failures reach centralized middleware.
- Keep logs useful but scrub PII: no CCCD, medical details, full payment data, password, token, or raw authorization header.

## Domain and Business Rules

- Reuse BRD actors, enum values and status names before creating new ones.
- Place durable invariants close to the domain model or Application handler, not in endpoint code.
- Enforce ownership/data-scope rules from project context, not just valid authentication.
- Respect regulated-data boundaries declared in project context.
- Payment flows must follow the project context data boundary; never store full card/payment secrets unless the context explicitly authorizes a compliant vault/tokenization design.

## EF Core and Persistence

- Update the project-specific persistence contract and implementation when adding persisted entities.
- Add indexes, unique constraints and relationships when BRD defines lookup keys, ownership or deduplication rules.
- Use LINQ or parameterized APIs only; never build SQL by string concatenation.
- Use `Include` intentionally and avoid broad object graph loading in list endpoints.
- Entity/model changes require migration readiness notes even when dev currently uses InMemory.

## API and Authorization

- Map every protected endpoint to actors/roles from project context and source docs.
- Return `400` for validation, `401` for missing auth, `403` for insufficient permission, and `404` for missing resources.
- Keep request/response DTOs stable and testable; do not expose internal persistence-only fields.
- Do not change route style unless Product/QC contract requires it.

## Frontend and Mobile from Figma MCP

- Treat Figma MCP as the source for layout, component variants, visual tokens, interaction states, responsive behavior and accessibility checks.
- Treat BRD/AC as the source for business rules, actor permissions, data ownership and workflow legality.
- Implement the actual workflow first: loading, empty, validation, disabled, error, success and permission-denied states.
- Map design fields to typed request/response DTOs; do not invent backend fields because they appear visually in Figma without BRD/AC confirmation.
- For mobile or touch apps, preserve target-user readability, tap targets at least `48x48px`, localized copy and clear status feedback.
- For back-office/operations portals, prefer dense, scannable tables/forms with audit-friendly status and action affordances.
- If Figma and API contract disagree, stop and report the mismatch instead of silently changing behavior.

## Test Expectations

- Use xUnit integration/API contract tests for new public API behavior.
- Prefer in-process API tests with `WebApplicationFactory` over tests that require a manually running localhost server.
- Cover happy path, validation, unauthorized/forbidden, not found, Vietnamese Unicode, SQL injection payload, and at least one BRD rule.
- For FE/mobile work, also cover component states and flows derived from Designer handoff or Figma MCP: loading, empty, validation, error, success, permission, responsive and accessibility.
- Engineering must not weaken or rewrite QC tests just to make implementation pass.
- If a test is wrong, document the BRD evidence before updating it.

## Modern Reference Lookup

- BRD and existing repo patterns are authoritative for business behavior and architecture.
- Use official docs or Context7-style lookup only for current library usage details such as ASP.NET Core, EF Core, FluentValidation, MediatR, xUnit and WebApplicationFactory.
- Do not let external examples override project context security, PII, regulated-data or payment boundaries.

## Code Generator

```bash
python3 .agents/skills/engineering_agent/scripts/dotnet_codegen.py --entity "<EntityName>" --properties "Field:Type,OtherField:string" --root-namespace "<Namespace>" --domain-dir "<domain-dir>" --application-dir "<application-dir>" --api-endpoint-dir "<api-endpoint-dir>" --style minimal-api
```

Pass project-context adapter parameters:

```bash
python3 .agents/skills/engineering_agent/scripts/dotnet_codegen.py --entity "<EntityName>" --properties "Field:Type" --root-namespace "Acme" --domain-dir "apps/api/src/Acme.Domain/Entities" --application-dir "apps/api/src/Acme.Application/Features" --api-endpoint-dir "apps/api/src/Acme.Api/Endpoints"
```

The generator creates a starter skeleton only. The agent must still wire `DbSet`, endpoint registration, authorization policies, relationship config, migration readiness, tests, and business logic according to BRD and the current codebase.

## Legacy Templates

Files under `scripts/templates/*.txt` are reference templates only. Prefer `dotnet_codegen.py` because it supports project adapters such as namespace and output directories. If a template is used manually, replace all placeholders (`[ROOT_NAMESPACE]`, `[ENTITY_NAME]`, `[ROUTE_NAME]`, `[PROPERTIES]`, `[DB_SET_NAME]`) and complete real persistence, validation, authorization and tests before claiming implementation is done.

## Completion Checklist

- [ ] BRD rules mapped.
- [ ] Tests existed before implementation or were created first.
- [ ] New code follows Clean Architecture boundaries.
- [ ] Validation and authorization match AC.
- [ ] Logs/comments are Vietnamese and do not expose PII.
- [ ] Project build command run.
- [ ] Project test command run.
- [ ] Security checks run or handed to `$security_agent`/`$devops_agent`.

## Output Contract

```markdown
# [Feature] - Engineering Handoff

## Files Changed
- ...

## Contract Implemented
- Routes:
- Request/response:
- Business rules:

## Verification
- Build:
- Tests:
- Security:

## Notes
- Remaining risks:
```
