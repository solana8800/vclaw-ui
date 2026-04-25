# Đặc tả Thiết kế: Zalo Personal Admin & Packaging Pipeline

**Status:** Active  
**Owner:** Codex  
**Last reviewed:** 2026-04-25  
**Use for:** Packaging desktop, Zalo Personal admin và Gateway/WebSocket integration.

Ngày gốc: 2026-04-16.  
Cập nhật theo code hiện tại: 2026-04-25.

## 1. Giới thiệu

VClaw cần giao tiếp qua Zalo cá nhân của người dùng và đóng gói thành desktop app dễ cài cho macOS. Kiến trúc hiện tại không còn dùng static export thuần; VClaw UI chạy Next.js standalone để giữ API routes, middleware, Server Actions, Prisma SQLite và Gateway proxy.

## 2. Phạm vi

### 2.1 Zalo Personal Admin

- Sử dụng OpenClaw Gateway WebSocket làm control plane.
- Đăng nhập QR qua `web.login.start` và `web.login.wait` khi Gateway/plugin hỗ trợ.
- Lấy trạng thái qua `directory.self` hoặc fallback `channels.status`.
- Lấy danh sách nhóm qua `directory.groups.list` hoặc fallback CLI.
- Gửi tin qua Gateway method `send`.
- Đồng bộ hội thoại qua `chat.history` theo session `agent:main:zalouser:<threadId>` vào `Conversation`/`ConversationMessage`.

### 2.2 Packaging Pipeline

- Build `vclaw-ui` bằng Next.js standalone.
- Stage `.next/static` và `public/` vào standalone output.
- Bọc UI bằng Electron launcher trong `vclaw-ui/launcher/`.
- Pack local `core/openclaw` thành `openclaw-bundled.tgz`.
- Pack local `core/extensions/zalouser` thành `zalouser-bundled.tgz`.
- Tạo macOS installer `.pkg` bằng `pkgbuild` và `productbuild`.

## 3. Kiến trúc hiện tại

```text
[VClaw.app]
  ├─ Electron shell
  ├─ Next.js standalone server (port 12687)
  ├─ openclaw.default.json
  ├─ openclaw-bundled.tgz
  └─ zalouser-bundled.tgz

[OpenClaw Gateway] 127.0.0.1:18789
  └─ WebSocket RPC: web.login.*, channels.*, directory.*, sessions.*, send, chat.history
```

## 4. Rủi ro và giảm nhẹ

- **Gateway thiếu `web.login.*`:** UI phải báo lỗi rõ và hướng dẫn đồng bộ/chạy Gateway/plugin phù hợp.
- **Zalo cá nhân có rủi ro session:** luôn giữ human-in-the-loop; không che giấu trạng thái đăng nhập/kết nối.
- **Installer lỗi quyền:** postinstall cài runtime trong user-space, không ghi module runtime bằng quyền root nếu không cần.
- **Docs cũ lệch runtime:** mọi tài liệu packaging phải ưu tiên `scripts/package-vclaw.sh`, `superpowers/PROJECT_STATE.md` và `superpowers/DECISIONS.md`.

## 5. Verification

- Type-check: `cd vclaw-ui && pnpm tsc --noEmit --ignoreDeprecations 6.0`.
- Unit tests theo module: `cd vclaw-ui && pnpm vitest run <test-file>`.
- Packaging: `bash scripts/package-vclaw.sh`.
- Live Zalo: đăng nhập QR, load nhóm, gửi tin, nhận tin, kiểm tra SQLite có `ConversationMessage`.
