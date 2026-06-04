# Horizon Workflow Control

Thư mục này khai báo lớp điều phối Workflow Control cho hệ thống agent portable trong `.agents`. Workflow Control không thay thế các skill; nó chỉ chọn workflow, lập run artifact và giữ traceability bằng output file của từng vai trò.

## 1. Vai Trò

Workflow Control có ba nhiệm vụ chính:
- Chọn workflow phù hợp với mức độ rủi ro của request.
- Tạo run artifact trong `.agents/runs/<run-id>/`.
- Theo dõi step nào đã có output và step tiếp theo cần role agent nào xử lý.

> [!NOTE]
> Runner chỉ tạo artifact và checklist. Việc gọi LLM/agent thực tế vẫn do Codex, Claude Code, OpenClaw hoặc Workflow Control engine bên ngoài thực hiện theo các file output.
> Workflow Control không tự viết Product AC, không tự code, không tự thay đổi business rule và không thay thế project context. Mọi task phải nạp `.agents/project-contexts/<service-or-app>.context.md` trước khi xử lý.

## 2. Các Thành Phần

- [workflow-control.json](file:///Users/vf-tuantd26-l/Documents/projects/horizon/.agents/orchestration/workflow-control.json): workflow registry, step artifact và skill registry.
- [BOARD.md](file:///Users/vf-tuantd26-l/Documents/projects/horizon/.agents/orchestration/BOARD.md): bảng trạng thái chung cho active runs, blockers, decisions và shared findings.
- `schemas/skill-manifest.schema.json`: JSON schema tối thiểu cho `manifest.json` của từng skill.
- `scripts/workflow_runner.py`: runner nội bộ để validate registry và khởi tạo run artifact.

## 3. Quy Tắc Project Context

Project context là adapter bắt buộc. Context phải khai báo tối thiểu:
- **Identity**: tên project, platform, framework, runtime.
- **Source of truth**: product docs, architecture docs, API docs, design source.
- **Paths**: source, tests, app/project, Dockerfile, migration/startup.
- **Commands**: install/restore, build, test, lint, audit, run local.
- **Conventions**: namespace/package, route prefix, auth actors, PII, logging/error language.
- **Skill adapters**: command tham số cho Product/QC/Engineering/DevOps/Security/Release.

Nếu thiếu context, agent phải tạo context từ `_template.md` hoặc hỏi lại người dùng. Không được dùng fallback hardcode vào app/source/doc hiện có.

## 4. Các Loại Workflows

### `technical_investigation`
Dùng khi chưa rõ root cause và chưa quyết định đổi behavior. Output tối thiểu:
- Symptom.
- Files/logs/docs đã đọc.
- Hypothesis.
- Evidence.
- Next workflow nếu cần đổi behavior.

### `fast_path`
Dùng cho docs, typo, local config, script helper hoặc refactor nhỏ không đổi behavior production. Output tối thiểu:
- Scope.
- Files changed.
- Verification command/result.
- Lý do không cần full SDLC nếu có.

### `full_sdlc`
Dùng cho business behavior, API contract, auth/authorization, data model, migration, PII, payment, regulated data, external integration, production workflow hoặc UI feature mới.

Các bước (Steps):
1. Product analysis.
2. Design handoff nếu có UI.
3. QC contract tests.
4. Engineering implementation.
5. Security review.
6. DevOps verification.
7. Release readiness.

### `adlc_prototype`
Dùng cho LLM, agent, RAG, memory, prompt routing, tool calling, autonomous action hoặc AI decision support trước khi đưa vào production.
Prototype phải có hypothesis, scope, human-agent boundary, architecture contract, golden cases/eval rubric, run report, security notes và decision `GO`, `NO-GO` hoặc `ITERATE`.

## 5. Câu Lệnh CLI Thường Dùng

Validate registry và các skill manifests:
```bash
python3 .agents/orchestration/scripts/workflow_runner.py validate
```

Liệt kê các workflow:
```bash
python3 .agents/orchestration/scripts/workflow_runner.py workflows
```

Khởi tạo một workflow run mới với project context cụ thể:
```bash
python3 .agents/orchestration/scripts/workflow_runner.py init-run \
  --workflow full_sdlc \
  --title "<feature title>" \
  --request "<original request>" \
  --project-context ".agents/project-contexts/<service-or-app>.context.md" \
  --source-type manual \
  --source-id "<stable id>"
```

## 6. Quy Tắc Hoàn Thành (Completion Rules)

- **Engineering**: chỉ được implement behavior/API mới sau khi QC artifact đã có test contract hoặc lý do không thể automate được.
- **Design**: không được thay BRD/product source làm business rule.
- **Security**: gate FAIL nếu còn blocking finding về auth, PII, secret, regulated boundary, payment boundary, unsafe autonomy hoặc High/Critical CVE.
- **DevOps**: gate FAIL nếu build/test bắt buộc fail.
- **Release**: không được READY khi thiếu evidence, rollback note, migration note bắt buộc hoặc còn open question blocking behavior.

## 7. Yêu Cầu Báo Cáo (Báo Cáo Hoàn Tất)

Mỗi run phải nêu:
- Project context đã dùng.
- Source docs đã đọc.
- Output files đã tạo.
- Commands đã chạy và kết quả.
- Gate PASS/FAIL.
- Residual risks (rủi ro còn lại).

*Lưu ý: Không đưa dữ liệu nhạy cảm (PII), token, password, connection string, full payment data hoặc regulated data thật vào run artifact.*
