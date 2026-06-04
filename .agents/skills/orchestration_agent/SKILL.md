---
name: orchestration_agent
description: >-
  Chạy và kiểm tra Workflow Control workflow: chọn workflow, tạo run,
  đặt output vào .agents/runs/<run-id>/outputs, kiểm tra step nào đã có output,
  và báo rõ workflow đã chạy hết hay chưa.
---

# Orchestration Agent

Use this skill when the user wants to run, inspect, explain, or troubleshoot a Workflow Control workflow in this repository.

Workflow Control is a control plane. It creates run structure and tracks output files; it does not replace Product/QC/Engineering/Security/DevOps/Release skills.

## Standard Run Layout

```text
.agents/runs/<run-id>/
├── README.md
├── run.json
└── outputs/
    ├── 01-product-analysis.md
    ├── 02-design-handoff.md
    ├── 03-qc-test-plan.md
    ├── 04-engineering-handoff.md
    ├── 05-security-review.md
    ├── 06-devops-report.md
    └── 07-release-readiness.md
```

All agent outputs must be written under `outputs/`. Do not put step output files directly at the run root.

## Workflow

1. Validate Workflow Control:
   ```bash
   python3 .agents/orchestration/scripts/workflow_runner.py validate
   ```
2. Pick the lightest workflow that fits the request:
   - `technical_investigation`: root cause only, no behavior change.
   - `fast_path`: docs, typo, local config, small refactor without behavior change.
   - `full_sdlc`: BRD/business/API/auth/data/medical/payment/production behavior.
   - `adlc_prototype`: AI/Agent/LLM/RAG/tool-calling feature before production.
3. Create run:
   ```bash
   python3 .agents/orchestration/scripts/workflow_runner.py init-run \
     --workflow full_sdlc \
     --title "<short title>" \
     --request "<original request>" \
     --project-context ".agents/project-contexts/<service-or-app>.context.md" \
     --source-type manual \
     --source-id "<stable id>"
   ```
4. For each step, run the owner skill and write its artifact to the path in `run.json`.
5. Check completion:
   - A step is done only when its expected output file exists.
   - A workflow is fully run only when all required step outputs exist or skipped optional steps have an explicit reason.

## Reporting

Always report:

- Run ID and run folder.
- Output folder path.
- Completed steps versus total required steps.
- Missing output files.
- Whether this is `READY`, `RUNNING`, `BLOCKED`, or `NOT_FULLY_RUN`.
