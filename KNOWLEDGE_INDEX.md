# VClaw Knowledge Index

Bản chỉ mục giúp Agent và người tra cứu nhanh **hai khu tài liệu** (mục đích khác nhau):

1. **`vclaw-ui/docs/`** — tài liệu **public**: Next.js đọc qua `vclaw-ui/lib/docs.ts`, hiển thị tại `/docs` (danh sách slug public nằm trong `PUBLIC_DOCS_SLUGS`).
2. **`docs/`** (thư mục gốc repo) — tài liệu **private**: không qua viewer web; dùng cho agent/dev trong workspace.

---

## Tài liệu public (`vclaw-ui/docs/` — web `/docs`)

### Nghiệp vụ & sản phẩm
- [00-Business-Requirements](./vclaw-ui/docs/00-Business-Requirements.vi.md)
- [01-System-Architecture](./vclaw-ui/docs/01-System-Architecture.vi.md)
- [02-Product-Requirements-Document](./vclaw-ui/docs/02-Product-Requirements-Document.vi.md)
- [03-Commerce-Admin-and-Omnichannel-Usecases](./vclaw-ui/docs/03-Commerce-Admin-and-Omnichannel-Usecases.vi.md)
- [04-UI-Design-And-Screen-Specs](./vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md)
- [09-Business-Financial-Evaluation](./vclaw-ui/docs/09-Business-Financial-Evaluation.vi.md)
- [11-User-Manual-And-Installation](./vclaw-ui/docs/11-User-Manual-And-Installation.vi.md)

---

## Tài liệu private (`docs/` — không serve qua `vclaw-ui`)

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
- [CRITIQUE](./docs/CRITIQUE.md)

Xem thêm: [docs/README.md](./docs/README.md).

---

## Agent OS & Superpowers

- [README](./README.md)
- [SOUL](./SOUL.md)
- [IDENTITY](./IDENTITY.md)
- [AGENTS](./AGENTS.md)
- [TOOLS](./TOOLS.md)
- [USER](./USER.md)
- [HEARTBEAT](./HEARTBEAT.md)

### Superpowers
- [Kế hoạch thực thi vclaw-ui](./superpowers/plans/2026-04-10-vclaw-ui-implementation.md)
- [Đặc tả thiết kế vclaw-ui](./superpowers/specs/2026-04-10-vclaw-ui-design.vi.md)
- [Kế hoạch triển khai i18n](./superpowers/plans/2026-04-11-vclaw-ui-i18n-implementation.md)
- [Đặc tả thiết kế i18n](./superpowers/specs/2026-04-11-vclaw-ui-i18n-design.vi.md)

---

**Ghi chú cho Agent:** Nhiệm vụ liên quan **UI/docs công khai** → đọc `vclaw-ui/docs/` + `vclaw-ui/lib/docs.ts`. Nhiệm vụ **kiến trúc nội bộ / packaging / tích hợp sâu** → đọc `docs/` ở root. Giữ `KNOWLEDGE_INDEX.md` khớp với vị trí file thực tế khi thêm hoặc di chuyển tài liệu.
