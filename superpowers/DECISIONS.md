# Decision Log

## 2026-04-25 — Next standalone là runtime chính

VClaw UI dùng `output: "standalone"` thay vì static export vì admin cần API routes, Server Actions, Prisma SQLite, middleware/i18n và Gateway proxy. Các plan/docs nói `vclaw-ui/out` hoặc static export phải được coi là stale trừ khi task cụ thể yêu cầu tạo bản static riêng.

## 2026-04-25 — Gateway WebSocket là control plane chính

Luồng Zalo Personal admin dùng OpenClaw Gateway WS cho `web.login.*`, `channels.*`, `sessions.*`, `send` và `chat.history`. MCP chỉ dùng cho tool catalog/runtime, không thay thế Gateway WS cho control plane real-time.

## 2026-04-25 — Product layer trước core

Khi có thể, triển khai nghiệp vụ VClaw ở `vclaw-ui` hoặc `core/extensions/zalouser`. Chỉ chỉnh `core/openclaw` khi extension point hiện có không đáp ứng được yêu cầu sản phẩm.

## 2026-04-25 — Tài liệu được sửa khi sai với code thật

Codex được sửa docs/spec nếu có bằng chứng từ code, tests, package scripts hoặc tài liệu mới hơn. Thay đổi ảnh hưởng kiến trúc phải ghi vào file này.
