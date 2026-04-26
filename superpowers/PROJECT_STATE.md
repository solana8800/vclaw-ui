# Project State

Cập nhật gần nhất: 2026-04-26.

## Sản phẩm

VClaw là app vận hành bán hàng local-first cho SMB/hộ kinh doanh Việt Nam. Surface chính là VClaw Business Dashboard trong `vclaw-ui`; OpenClaw là runtime/gateway/agent engine; Zalo Personal dùng extension `zalouser`.

## Runtime hiện tại

- `vclaw-ui` dùng Next.js App Router, React, `next-intl`, Prisma SQLite và Server Actions.
- `vclaw-ui/next.config.ts` dùng `output: "standalone"` để giữ API routes, middleware, Prisma và Gateway proxy.
- Packaging hiện tại tạo macOS `.pkg` qua `scripts/package-vclaw.sh`, không còn là static export thuần.
- Runtime OpenClaw đóng gói mặc định là `core/openclaw-zero-token`; đặt `VCLAW_OPENCLAW_RUNTIME=upstream` để quay về `core/openclaw`.
- Desktop shell dùng Electron launcher trong `vclaw-ui/launcher/`.
- Gateway upstream chạy mặc định ở `127.0.0.1:18789`; Zero Token thường dùng `127.0.0.1:3001`; Electron launcher đọc cổng/token từ `~/.openclaw/openclaw.json`. VClaw UI chạy mặc định ở port `12687`.

## Dữ liệu nghiệp vụ

Schema chính ở `vclaw-ui/prisma/schema.prisma`. Các bảng quan trọng:

- `Customer`
- `Order`
- `Payment`
- `Booking`
- `Task`
- `Product`
- `ShopSettings`
- `IntegrationAccount`
- `IntegrationGroup`
- `Conversation`
- `ConversationMessage`
- `AutomationJob`

## Zalo Personal

- UI chính: `vclaw-ui/components/admin/zalouser-panel.tsx`.
- Server actions: `vclaw-ui/lib/zalouser/zalouser-cli-actions.ts`.
- Gateway browser RPC: `vclaw-ui/lib/zalouser/zalouser-gateway.ts`.
- Server-side Gateway WS helper: `vclaw-ui/lib/openclaw/gateway-ws-rpc-server.ts`.
- Tin gửi đi và history `chat.history` đã có helper sync DB: `vclaw-ui/lib/zalouser/zalouser-conversation-sync.ts`.

## Điểm lệch tài liệu đã biết

- Tài liệu cũ có chỗ nói static export / `vclaw-ui/out`; code thật đang dùng standalone.
- `KNOWLEDGE_INDEX.md` từng nhắc `docs/README.md`, nhưng file đó chưa tồn tại.
- Một số docs cũ nhắc path `lib/gateway-client.ts`; code thật dùng `lib/gateway/client.ts`.

Khi gặp lệch mới, cập nhật `DOC_UPDATE_POLICY.md` và `DECISIONS.md` nếu cần.
