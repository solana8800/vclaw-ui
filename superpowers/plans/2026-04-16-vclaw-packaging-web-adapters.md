# VClaw Packaging and Web Adapters Implementation Plan

**Status:** Active  
**Owner:** Codex  
**Last reviewed:** 2026-04-25  
**Reference spec:** `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`  
**Use for:** Theo dõi các bước packaging/Zalo live verification còn chưa hoàn tất.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theo dõi trạng thái đóng gói Desktop và Zalo/Web Adapter theo kiến trúc hiện tại của VClaw.

**Architecture:** VClaw UI chạy Next.js standalone để giữ API routes, middleware, Server Actions, Prisma SQLite và Gateway proxy. Packaging dùng `scripts/package-vclaw.sh` để tạo macOS `.pkg` chứa Electron shell, Next standalone app, OpenClaw bundled tarball, zalouser bundled tarball và config mặc định.

**Tech Stack:** Next.js standalone, Electron launcher, Prisma SQLite, OpenClaw Gateway, local `core/extensions/zalouser`, macOS `pkgbuild`/`productbuild`.

---

## Status

In Progress.

Spec: `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`.

Khi tiếp tục packaging, ưu tiên script/code hiện tại và `superpowers/DECISIONS.md`.

## Giai đoạn 1: Next.js standalone runtime

- [x] 1. Dùng `output: "standalone"` trong `vclaw-ui/next.config.ts`.
- [x] 2. Giữ API routes, Server Actions, Prisma SQLite và Gateway proxy trong desktop runtime.
- [x] 3. Build bằng `cd vclaw-ui && pnpm build`.
- [x] 4. Stage `.next/static` và `public/` vào `.next/standalone` trong packaging script.

## Giai đoạn 2: Electron desktop shell

- [x] 5. Dùng launcher trong `vclaw-ui/launcher/` để khởi động Next standalone server trên port `12687`.
- [x] 6. Mở Electron window trỏ vào VClaw UI local.
- [x] 7. Dùng `VCLAW_ELECTRON_USER_DATA` hoặc default userData để giữ cookie/session desktop.
- [x] 8. Có recovery page khi web surface không tải được.

## Giai đoạn 3: OpenClaw và zalouser bundled runtime

- [x] 9. Build/pack local `core/openclaw` thành `openclaw-bundled.tgz`.
- [x] 10. Pack local `core/extensions/zalouser` thành `zalouser-bundled.tgz`.
- [x] 11. Nhúng `vclaw-ui/resources/openclaw.default.json` vào app bundle.
- [ ] 12. Manual verify postinstall cài OpenClaw runtime user-space từ bundled tarballs trên máy sạch.

## Giai đoạn 4: Zalo Personal admin

- [x] 13. UI `/admin/zalouser` đăng nhập qua Gateway WS `web.login.start` / `web.login.wait`.
- [x] 14. Danh sách nhóm lấy qua `directory.groups.list` hoặc fallback CLI.
- [x] 15. Gửi tin qua Gateway WS `send`.
- [x] 16. Sync hội thoại từ Gateway `chat.history` vào `Conversation`/`ConversationMessage`.
- [ ] 17. Manual verify live tin nhận thật từ Zalo được ghi vào Gateway session history và xuất hiện trong VClaw UI.

## Giai đoạn 5: Installer/release

- [x] 18. `scripts/package-vclaw.sh` tạo `VClaw.app` và `VClawInstaller-<version>-<arch>.pkg`.
- [ ] 19. Manual verify cài `.pkg` trên máy sạch.
- [ ] 20. Manual verify app mở được, Gateway chạy được, Zalo login được sau cài đặt.
- [ ] 21. Chuẩn hóa release workflow sang repo public artifact khi người dùng yêu cầu phát hành.

## Verification

Commands chính:

```bash
cd vclaw-ui
pnpm tsc --noEmit --ignoreDeprecations 6.0
pnpm vitest run
```

Packaging:

```bash
bash scripts/package-vclaw.sh
```

Manual live checks nằm trong `superpowers/runbooks/verification-matrix.md`.
