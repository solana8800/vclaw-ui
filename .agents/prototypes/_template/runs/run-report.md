# Prototype Run Report

## 1. Run Info

- Date: `<YYYY-MM-DD>`
- Runner: `<agent/person>`
- Prototype: `<feature-slug>`
- Code/config version: `<commit/hash or note>`
- Model/provider: `<model/provider>`
- Dataset: `cases/golden-cases.jsonl`

## 2. Metrics

| Metric | Threshold | Result | Pass/Fail |
| --- | --- | --- | --- |
| Accuracy/quality | `<target>` | `<result>` | `<PASS/FAIL>` |
| Hallucination or unsafe-response rate | `<target>` | `<result>` | `<PASS/FAIL>` |
| Tool success/error rate | `<target>` | `<result>` | `<PASS/FAIL>` |
| Latency p50/p95 | `<target>` | `<result>` | `<PASS/FAIL>` |
| Token/cost estimate | `<target>` | `<result>` | `<PASS/FAIL>` |

## 3. Findings

Passed cases:

- `<case id and reason>`

Failed cases:

- `<case id, observed behavior, root cause>`

Security or safety findings:

- `<finding or none>`

## 4. Decision

Decision: `<GO/NO-GO/ITERATE>`

Reason:

- `<short decision reason>`

Required next steps:

- `<next step before implementation or next prototype iteration>`
