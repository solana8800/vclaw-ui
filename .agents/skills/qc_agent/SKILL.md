---
name: qc_agent
description: >-
  Chuyển Product Acceptance Criteria thành test matrix và xUnit integration/API
  contract tests trước khi code, bao phủ happy path, validation, authorization,
  edge cases, tiếng Việt có dấu, security payloads và business rules từ BRD.
---

# QC Agent

Use this skill before implementation for any backend/API behavior change, and after implementation to verify the result.

Keep this skill low-coupled and high-cohesion: QC owns traceability and test coverage, not project-specific architecture. Resolve test directory, namespace, framework and commands from the current project context before generating files.

QC can use multiple input sources:

- Product AC and BRD mapping for business rules.
- Traditional tester Excel/CSV/TSV files for manual test-case import.
- Designer handoff or Figma MCP context for UI states, component variants, responsive behavior and API data dependency.

Figma MCP must not override BRD/AC. Use it to derive UI/UX test coverage and API contract expectations only after Product has confirmed the business rule.

## Non-Negotiables

- Test first. Engineering must not write logic before the contract tests exist.
- Tests must exercise real API/handler behavior. Do not create fake green assertions like `true.Should().BeTrue()`.
- Every Product AC needs at least one test case or an explicit reason why it is not automatable.
- Comments and logs in generated tests must be Vietnamese; C# identifiers must be English.

## Generator

```bash
python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "<EntityName>" --route "<api-route>" --test-dir "<test-dir>" --namespace "<test-namespace>" --actions "Create,GetById,Validation,Unauthorized,Vietnamese,Security"
```

Example with explicit project adapter values:

```bash
python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "VisitBooking" --route "visit-bookings" --test-dir "apps/api/tests/Acme.Api.Tests" --namespace "Acme.Api.Tests"
```

Import from traditional tester Excel/CSV test cases:

```bash
python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "MealRating" --testcase-file "testcases/MealRating.xlsx" --sheet "API Test Cases" --test-dir "apps/api/tests/Acme.Api.Tests" --namespace "Acme.Api.Tests" --dedupe skip
```

Attach Figma MCP/design traceability when tests come from a design frame:

```bash
python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "VisitBooking" --route "visit-bookings" --test-dir "apps/api/tests/Acme.Api.Tests" --namespace "Acme.Api.Tests" --platform web --design-source "Figma MCP: Website / Visit Booking" --figma-node "123:456" --design-note "Form có loading, disabled submit, validation lỗi số điện thoại và success state"
```

Combine Excel import with Figma/design source when a tester file maps to a screen:

```bash
python3 .agents/skills/qc_agent/scripts/qc_test_generator.py --entity "VisitBooking" --testcase-file "testcases/VisitBooking.xlsx" --sheet "UI API Contract" --test-dir "apps/api/tests/Acme.Api.Tests" --namespace "Acme.Api.Tests" --platform web --design-source "Figma MCP: Visit Booking frame" --figma-node "123:456" --dedupe skip
```

Recommended columns:

- `TestCaseId`
- `Scenario`
- `Method`
- `Route`
- `Input`
- `ExpectedStatusCode`
- `ExpectedResult`
- `Actor`
- `Protected`
- `BusinessRule`

Duplicate handling:

- `--dedupe skip` skips duplicate imported rows by test signature.
- `--dedupe error` fails fast when a duplicate is detected.
- `--overwrite` is required to replace an existing generated file.

## Minimum Test Matrix

- `Create_WithValidRequest_ShouldReturnCreated`
- `Create_WithMissingRequiredField_ShouldReturnBadRequest`
- `GetById_WithUnknownId_ShouldReturnNotFound`
- `Request_WithoutToken_ShouldReturnUnauthorized` when endpoint is protected.
- Vietnamese text round-trip test when the feature stores user-entered text.
- SQL injection payload should be treated as plain input or rejected safely.
- One test for each BRD business rule.
- For UI/FE/mobile work from Figma MCP: loading, empty, validation, disabled, error, success, permission, responsive and accessibility states.

## Output Contract

```markdown
# [Feature] - QC Test Plan

## Traceability
| AC | Test ID | Automation | Notes |
| --- | --- | --- | --- |

## API Contract
- Method:
- Route:
- Request:
- Response:
- Status codes:
- Design source/Figma node:

## Test Cases
| Test ID | Scenario | Input | Expected | Type |
| --- | --- | --- | --- | --- |

## Generated/Updated Files
- Project-specific test path from context.

## Verification
- Command:
- Result:
```
