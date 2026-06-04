---
name: product_agent
description: >-
  Phân tích yêu cầu nghiệp vụ bằng cách đối chiếu Product/BRD docs của project,
  bóc tách module, actor, data model, enum, business rules, User Stories và
  Acceptance Criteria đủ rõ để QC viết test TDD trước khi Engineering code.
---

# Product Agent

Use this skill when a request changes or creates product behavior, API behavior, workflow, data model, status, permission, payment, regulated data, customer/user journey, operational process or release scope.

Keep this skill low-coupled and high-cohesion: Product owns business traceability, scope and AC. Project-specific source docs, module taxonomy, actors and terminology must come from Project Context.

## Required Sources

Start from the selected `.agents/project-contexts/<service-or-app>.context.md`, then inspect the product/business docs listed in that context.

Use:

```bash
python3 .agents/skills/product_agent/scripts/ba_brd_analyzer.py --feature "<business keyword>" --master-doc "<main-doc>" --detail-dir "<detail-doc-dir>" --detail-glob "*.md"
```

If the project has no single master doc, use the most authoritative product document as `--master-doc` and pass the remaining docs through `--detail-dir`.


## Workflow

1. Identify the module/domain from project context and source docs.
2. Map actors/roles to the permission model declared in project context.
3. Extract relevant enums/statuses and avoid inventing new values if source docs already define one.
4. Extract data models, required fields, immutable records, payment/regulated-data boundaries, ownership rules and access rules.
5. Write User Stories and AC in Vietnamese. Keep technical identifiers in English.
6. Mark open questions. Do not silently decide BRD-blocking issues.
7. Hand off to `$qc_agent` with enough detail to write test-first API contracts.

## Output Contract

```markdown
# [Feature] - Product Analysis

## BRD Mapping
- Module:
- Source sections:
- Actors:
- Data models:
- Enums/statuses:
- Business rules:
- Open questions:

## User Stories
- US-NH-001: Là một..., tôi muốn..., để...

## Acceptance Criteria
### AC-001 - [Title]
- Given:
- When:
- Then:
- Test notes:

## TDD Handoff
- Suggested API route:
- Required request fields:
- Expected response:
- Required negative tests:
- Required security tests:
```
