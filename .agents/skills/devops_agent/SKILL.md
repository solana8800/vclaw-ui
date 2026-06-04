---
name: devops_agent
description: >-
  Chạy và phân tích pipeline project: restore/build/test, vulnerability audit,
  Docker non-root check, secrets/PII scan, migration readiness và báo cáo release
  gate bằng tiếng Việt với bằng chứng kiểm chứng cụ thể.
---

# DevOps Agent

Use this skill when implementation is ready for verification, when CI/build/test fails, before release, or when dependencies, Dockerfile, migrations, or environment config change.

Keep this skill low-coupled and high-cohesion: DevOps owns verification gates and evidence. Project-specific solution path, project directory, scan directories, Dockerfile and migration project must come from Project Context or CLI parameters.

## Pipeline

```bash
bash .agents/skills/devops_agent/scripts/devops_pipeline.sh \
  --project-dir "<project-dir>" \
  --scan-dirs "<source test dirs>" \
  --cmd-restore "<restore command>" \
  --cmd-build "<build command>" \
  --cmd-test "<test command>" \
  --cmd-audit "<audit command>"
```

With explicit project adapter (e.g. .NET):

```bash
bash .agents/skills/devops_agent/scripts/devops_pipeline.sh \
  --project-dir "apps/api" \
  --scan-dirs "src tests" \
  --cmd-restore "dotnet restore Acme.Api.sln" \
  --cmd-build "dotnet build Acme.Api.sln" \
  --cmd-test "dotnet test Acme.Api.sln --logger 'trx;LogFileName=test.trx'" \
  --cmd-audit "dotnet list package --vulnerable --include-transitive"
```

With migration command:

```bash
bash .agents/skills/devops_agent/scripts/devops_pipeline.sh \
  --project-dir "apps/api" \
  --scan-dirs "src tests" \
  --cmd-migration-create "dotnet ef migrations add AddMealRating --project src/Acme.Infrastructure --startup-project src/Acme.Api"
```

## Gates

- Project build command must pass.
- Project test command must pass.
- Vulnerability audit command must not show High/Critical vulnerabilities.
- Dockerfile must use a non-root `USER`.
- Secrets scan must not find hardcoded password, token, key, connection string.
- PII scan must not find obvious logging of CCCD, password, medical record details, or full payment data.
- Code formatting check must pass, if configured.

## Migration Rules

- Entity changes need EF Core migration planning unless the project intentionally uses InMemory only for the current slice.
- Do not run destructive database operations without explicit user approval.
- Report migration command and target project/startup project.

## Output Contract

```markdown
# DevOps Verification Report

## Commands
- ...

## Results
- Build:
- Tests:
- Vulnerability audit:
- Docker:
- Secrets/PII:
- Migration:

## Blocking Issues
- ...

## Release Gate
- PASS / FAIL
```
