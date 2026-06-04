---
name: security_agent
description: >-
  Rà soát bảo mật cho API, dữ liệu nhạy cảm, medical/payment boundary khi có,
  auth/authorization, PII logging, secrets, SQL injection, dependency CVE,
  Docker non-root và threat model trước khi bàn giao hoặc release.
---

# Security Agent

Use this skill for security review, privacy review, threat modeling, auth changes, payment flows, regulated data, user/customer data, logging, Docker, dependency changes, and release gates.

Keep this skill low-coupled and high-cohesion: Security owns risk review and gates. Project-specific actor names, sensitive data taxonomy, commands and compliance rules must come from Project Context.

## Required Checks

- Actor/permission matches source docs and project context.
- Resource access respects ownership, tenant, relationship or data-scope boundaries declared in project context.
- Regulated data follows the boundary declared in project context.
- Payment data stores only the fields allowed by project context; never store full card or sensitive payment instruments without compliant vault/tokenization design.
- Logs do not include PII, password, raw token, full regulated record or full payment details.
- Inputs are validated; SQL injection payloads cannot become executable SQL.
- Dependencies have no High/Critical vulnerabilities.
- Dockerfile runs as non-root.
- Secrets are not hardcoded in source/config committed to repo.

## Commands

```bash
cd <project-dir>
<dependency-audit-command>
rg -n -i "password|api[_-]?key|client_secret|connectionstring|token|payment|medical|pii" <scan-dirs>
```

## Output Contract

```markdown
# Security Review

## Scope
- Files:
- Data touched:
- Actors:

## Findings
| Severity | File | Issue | Required fix |
| --- | --- | --- | --- |

## Checklist
- AuthN/AuthZ:
- PII:
- Secrets:
- SQL injection:
- Dependencies:
- Docker:
- Payment/medical boundary:

## Gate
- PASS / FAIL
```
