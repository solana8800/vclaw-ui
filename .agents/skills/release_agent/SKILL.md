---
name: release_agent
description: >-
  Tổng hợp release readiness sau Product, QC, Engineering, Security và DevOps:
  thay đổi nghiệp vụ, migration, test evidence, security gate, rollback notes,
  release notes và rủi ro còn lại.
---

# Release Agent

Use this skill when a feature, bugfix, sprint slice, or deployment candidate is ready to hand over.

Keep this skill low-coupled and high-cohesion: Release owns readiness, evidence, risk and handover. Project-specific gates, environments, rollback mechanism and deployment commands must come from Project Context.

## Inputs

- Product AC and BRD mapping.
- QC test report.
- Engineering files changed.
- Security review.
- DevOps pipeline results.
- Migration or seed-data notes.

## Gate Rules

Do not mark release ready if:

- Build or test failed.
- Required TDD tests are missing.
- High/Critical dependency vulnerability remains.
- Dockerfile runs as root.
- Secrets/PII issue remains unresolved.
- A BRD blocking open question affects behavior.

## Output Contract

```markdown
# Release Readiness - [Feature/Version]

## Scope
- Included:
- Excluded:

## Business Traceability
- BRD sections:
- AC covered:

## Technical Changes
- Files:
- Migration:
- Config/env:

## Verification Evidence
- Build:
- Tests:
- Security:
- Manual/UI checks:

## Rollback
- Code:
- Database:
- Config:

## Release Gate
- READY / NOT READY
- Remaining risks:
```
