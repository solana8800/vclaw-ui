# Workflow Runs

Moi lan Workflow Control nhan mot task co the tao mot thu muc run tai day:

```text
.agents/runs/<timestamp>-<slug>/
├── README.md
└── run.json
```

Trong qua trinh thuc thi, cac agent them artifact theo workflow, vi du:

```text
01-product-analysis.md
02-design-handoff.md
03-qc-test-plan.md
04-engineering-handoff.md
05-security-review.md
06-devops-report.md
07-release-readiness.md
```

Moi artifact ban giao nen co metadata ngan:

```yaml
handoff_status: READY
ack_required: true
next_owner: qc_agent
taskbox_message_id: 123
```

Thu muc nay la audit trail cho SDLC/ADLC. Khong dua PII, token, mat khau,
connection string hoac du lieu thanh toan day du vao artifact.
