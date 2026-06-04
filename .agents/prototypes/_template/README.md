# Prototype: <feature-name>

## 1. Summary

- Feature slug: `<feature-slug>`
- Project context: `.agents/project-contexts/<service-or-app>.context.md`
- Module/domain: `<module-or-domain-from-context>`
- Owner agent: `<product_agent/qc_agent/engineering_agent/...>`
- Status: `<DRAFT/RUNNING/GO/NO-GO/ITERATE>`
- Last updated: `<YYYY-MM-DD>`

## 2. Hypothesis

Gia thuyet can kiem chung:

```text
<Neu agent duoc cung cap ... thi agent se ... voi chat luong/cost/latency chap nhan duoc.>
```

Success signals:

- `<metric or observable outcome>`

Failure signals:

- `<metric or unsafe behavior>`

## 3. Scope

In scope:

- `<workflow step>`
- `<actor>`
- `<data source>`
- `<allowed tool/action>`

Out of scope:

- `<workflow step>`
- `<production action>`
- `<sensitive data>`

## 4. Source Trace

- Product/source docs:
  - `<path>`
- Business rules referenced:
  - `<section/rule>`

## 5. Human-Agent Boundary

Agent may:

- `<read/suggest/classify/draft>`

Agent must ask human approval before:

- `<write/send/payment/medical/action>`

Agent must never:

- `<forbidden action>`

Escalation conditions:

- `<low confidence/missing context/security boundary/tool failure>`

## 6. Prototype Architecture

- Model/provider: `<model/provider>`
- Prompt source: `prompts/system-prompt.md`
- Context/data source: `<fixture/mock/sandbox/RAG source>`
- Tools: `tools/tool-contract.md`
- Memory policy: `<none/session/sandbox>`
- Fallback path: `<human handoff/rule-based response/refusal>`

## 7. Evaluation Plan

- Golden cases: `cases/golden-cases.jsonl`
- Scoring method: `<exact match/rubric/LLM-as-judge/human review>`
- Quality threshold: `<target>`
- Safety threshold: `<target>`
- Latency threshold: `<target>`
- Cost threshold: `<target>`

## 8. Run Results

Latest report: `runs/run-report.md`

Baseline metrics:

- Accuracy/quality: `<value>`
- Hallucination or unsafe-response rate: `<value>`
- Tool success/error rate: `<value>`
- Latency p50/p95: `<value>`
- Token/cost estimate: `<value>`

## 9. Decision

Decision: `<GO/NO-GO/ITERATE>`

Reason:

- `<short decision reason>`

Required next steps:

- `<next step>`
