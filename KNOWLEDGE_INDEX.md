# VClaw Knowledge Index

Bản chỉ mục giúp Agent và người tra cứu nhanh **hai khu tài liệu** (mục đích khác nhau):

1. **`vclaw-ui/docs/`** — tài liệu **public**: Next.js đọc qua `vclaw-ui/lib/docs.ts`, hiển thị tại `/docs` (danh sách slug public nằm trong `PUBLIC_DOCS_SLUGS`).
2. **`docs/`** (thư mục gốc repo) — tài liệu **private**: không qua viewer web; dùng cho agent/dev trong workspace.

---

## Tài liệu public (`vclaw-ui/docs/` — web `/docs`)

### Tầm nhìn & Luồng vận hành
- [00-VClaw-Platform-Vision](./vclaw-ui/docs/00-VClaw-Platform-Vision.vi.md)
- [00-VClaw-Operations-Flow](./vclaw-ui/docs/00-VClaw-Operations-Flow.vi.md)

### Nghiệp vụ & sản phẩm
- [03-Commerce-Admin-and-Omnichannel-Usecases](./vclaw-ui/docs/03-Commerce-Admin-and-Omnichannel-Usecases.vi.md)
- [04-UI-Design-And-Screen-Specs](./vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md)
- [09-Business-Financial-Evaluation](./vclaw-ui/docs/09-Business-Financial-Evaluation.vi.md)
- [11-User-Manual-And-Installation](./vclaw-ui/docs/11-User-Manual-And-Installation.vi.md)

---

## Tài liệu private (`docs/` — không serve qua `vclaw-ui`)

### Yêu cầu & Kiến trúc nền tảng
- [00-Business-Requirements](./docs/00-Business-Requirements.vi.md)
- [01-System-Architecture](./docs/01-System-Architecture.vi.md)
- [02-Product-Requirements-Document](./docs/02-Product-Requirements-Document.vi.md)

### Kiến trúc, roadmap & vận hành nội bộ
- [05-Implementation-Plan](./docs/05-Implementation-Plan.vi.md)
- [06-OpenClaw-Fork-Technical-Blueprint](./docs/06-OpenClaw-Fork-Technical-Blueprint.vi.md)
- [07-Continuous-Automation-Blueprint](./docs/07-Continuous-Automation-Blueprint.vi.md)
- [08-Agentic-Coding-Guide](./docs/08-Agentic-Coding-Guide.vi.md)
- [10-Product-Packaging-And-Release](./docs/10-Product-Packaging-And-Release.vi.md)

### Tích hợp & tham chiếu kỹ thuật (nhạy cảm / nội bộ)
- [12-VClaw-OpenClaw-Integration-Strategy](./docs/12-VClaw-OpenClaw-Integration-Strategy.vi.md)
- [13-Technical-Integration-Reference](./docs/13-Technical-Integration-Reference.vi.md)
- [14-OpenClaw-Zero-Token-Compatibility](./docs/14-OpenClaw-Zero-Token-Compatibility.vi.md)
- [15-Social-Integration-Solution](./docs/15-Social-Integration-Solution.vi.md)
- [16-OpenClaw-Gateway-Transport-And-Zalouser-Admin](./docs/16-OpenClaw-Gateway-Transport-And-Zalouser-Admin.vi.md)
- [17-OpenClaw-JSON-Config-Guide](./docs/17-OpenClaw-JSON-Config-Guide.vi.md)
- [18-VClaw-Zero-Token-Onboarding](./docs/18-VClaw-Zero-Token-Onboarding.vi.md)
- [19-Zalo-Product-Info-Sequence](./docs/19-Zalo-Product-Info-Sequence.vi.md)
- [20-Desktop-App-Startup-Mechanism](./docs/20-Desktop-App-Startup-Mechanism.vi.md)
- [21-VClaw-Middle-API-Reference](./docs/21-VClaw-Middle-API-Reference.vi.md)
- [CRITIQUE](./docs/CRITIQUE.md)

Ghi chú: `docs/` hiện chưa có `README.md`; dùng chỉ mục này để định vị tài liệu private.

---

## Coding Agent OS & Superpowers

- [README](./README.md)
- [Codex AGENTS](./AGENTS.md)

Ghi chú: repo này giữ hướng dẫn cho coding agent. **Runtime persona** của OpenClaw sales bot vẫn nằm tại `~/.openclaw/workspace/` (gateway đọc qua `agents.defaults.workspace`). Không commit `.openclaw/identity/` hay secret vào repo. **Bản seed** (AGENTS/IDENTITY/SOUL/USER/TOOLS/HEARTBEAT) để cài đặt/ghi nhật ký đóng gói nằm trong [`scripts/packaging/openclaw-workspace/`](./scripts/packaging/openclaw-workspace/README.md); `scripts/sync-openclaw-workspace.sh`, `scripts/pkg-scripts/postinstall` và `scripts/vclaw.sh` đồng bộ vào `~/.openclaw/workspace` (mặc định chỉ tạo file **thiếu**, tránh ghi đè chỉnh sửa tay).

### Superpowers
- [Superpowers README](./superpowers/README.md)
- [Current Task](./superpowers/CURRENT_TASK.md)
- [Project State](./superpowers/PROJECT_STATE.md)
- [Roadmap](./superpowers/ROADMAP.md)
- [Decision Log](./superpowers/DECISIONS.md)
- [Document Update Policy](./superpowers/DOC_UPDATE_POLICY.md)
- [Task Template](./superpowers/TASK_TEMPLATE.md)
- [Risk Register](./superpowers/RISK_REGISTER.md)
- [P0 Backlog](./superpowers/backlog/P0.md)
- [P1 Backlog](./superpowers/backlog/P1.md)
- [P2 Backlog](./superpowers/backlog/P2.md)
- [Codex Autonomous Loop](./superpowers/runbooks/codex-autonomous-loop.md)
- [Verification Matrix](./superpowers/runbooks/verification-matrix.md)
- [Zero Token Verification Matrix](./superpowers/runbooks/zero-token-verification-matrix.md)
- [Spec: Codex Autonomous Execution OS](./superpowers/specs/2026-04-25-codex-autonomous-execution-os.vi.md)
- [Spec: Packaging and Web Adapters](./superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md)
- [Plan: Codex Autonomous Execution OS](./superpowers/plans/2026-04-25-codex-autonomous-execution-os.md)
- [Plan: Packaging and Web Adapters](./superpowers/plans/2026-04-16-vclaw-packaging-web-adapters.md)
- [Plan: Zalouser Inbound DB Sync](./superpowers/plans/2026-04-25-zalouser-inbound-db-sync.md)
- [Plan: Zero Token VClaw](./superpowers/plans/2026-04-26-zero-token-vclaw.md)

---

**Ghi chú cho Agent:** Nhiệm vụ liên quan **UI/docs công khai** → đọc `vclaw-ui/docs/` + `vclaw-ui/lib/docs.ts`. Nhiệm vụ **kiến trúc nội bộ / packaging / tích hợp sâu** → đọc `docs/` ở root. Giữ `KNOWLEDGE_INDEX.md` khớp với vị trí file thực tế khi thêm hoặc di chuyển tài liệu.

