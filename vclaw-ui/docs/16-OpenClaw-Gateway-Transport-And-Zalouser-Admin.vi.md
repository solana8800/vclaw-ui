---
summary: "WebSocket là control plane chính của OpenClaw; SSE/MCP đúng vai trò; trang admin Zalo (zalouser) dùng Gateway WS."
read_when:
  - Tích hợp Gateway, Zalo cá nhân (zalouser), hoặc chọn transport (WS vs SSE vs MCP)
title: "Gateway — transport và admin Zalouser"
---

# Gateway: transport và admin Zalouser

Tài liệu này bổ sung [mục 7 — Zalouser](13-Technical-Integration-Reference.vi.md#7-cấu-hình-zalo-personal-channel-zalouser) trong *Technical Integration Reference*.

## 1. WebSocket — control plane chính thức

OpenClaw Gateway là một daemon; **CLI, Control UI (dashboard), app và node** đều nói chuyện với Gateway qua **WebSocket** (JSON: `connect` → `req`/`res` + `event`). Đây là giao thức điều khiển và nhận push, không phải tùy chọn thay thế bằng SSE cho toàn bộ RPC.

Tham chiếu lõi (sau khi đồng bộ `core/openclaw`):

- Kiến trúc: `core/openclaw/docs/concepts/architecture.md`
- Giao thức: `core/openclaw/docs/gateway/protocol.md`
- Control UI (browser): `core/openclaw/docs/web/control-ui.md`

Trong VClaw UI, client browser dùng singleton [`lib/gateway-client.ts`](../../lib/gateway-client.ts) (`gatewayWs`) với token `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` và URL tùy chọn `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` (xem [`lib/gateway-ws-url.ts`](../../lib/gateway-ws-url.ts)).

## 2. SSE — luồng HTTP một chiều

SSE trong OpenClaw gắn với **các endpoint HTTP có stream** (ví dụ OpenResponses `stream: true`, lịch sử session), **không** thay thế handshake + method đầy đủ của Gateway. Dùng SSE khi consumer chỉ cần đọc một luồng sự kiện qua HTTP.

## 3. MCP — bridge và tool catalog

- `openclaw mcp serve` chạy MCP stdio; bridge **vẫn kết nối Gateway qua WebSocket** (xem `core/openclaw/docs/cli/mcp.md` khi có trong tree).
- Cấu hình MCP của agent (HTTP `sse` / `streamable-http`) phục vụ **gọi tool từ runtime**, khác với luồng điều khiển real-time của dashboard.

Trang admin **Zalo Personal (zalouser)** trong `vclaw-ui` dùng **WebSocket** (`send`, `directory.*`, `channels.*`, `web.login.*`), không dùng MCP cho các thao tác đó.

## 4. Ánh xạ chức năng admin Zalo → Gateway WS

Các hàm bọc sẵn: [`lib/zalouser/zalouser-gateway.ts`](../../lib/zalouser/zalouser-gateway.ts).

| Nhu cầu | Method WS (ưu tiên) |
|--------|----------------------|
| Trạng thái / định danh | `directory.self` (kênh `zalouser`), có thể kèm `channels.status` |
| Đăng nhập QR | `web.login.start` (payload có thể có `qrDataUrl`); tùy bản gateway có `web.login.wait` |
| Đăng xuất kênh | `channels.logout` |
| Danh sách nhóm | `directory.groups.list` |
| Gửi tin | `send` (có `idempotencyKey`) |
| Nghe tin / session | `sessions.subscribe`, `sessions.messages.subscribe` (khi cần UI real-time) |

## 5. Biến môi trường

| Biến | Vai trò |
|------|---------|
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Token gửi trong `connect` (browser). |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | URL WebSocket đầy đủ nếu khác mặc định. |
| `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_URL` | Proxy server → Gateway (xem doc 13). |
| `OPENCLAW_ZALOUSER_USE_CLI_LOGIN` | Đặt `1` để **fallback** đăng nhập bằng CLI + file PNG (máy chủ spawn `openclaw channels login`). Mặc định dùng WS + `web.login.start`. |
| `OPENCLAW_ZALOUSER_QR_FILE` | Đường dẫn **tuyệt đối** tới `openclaw-zalouser-qr-*.png` — **bắt buộc trên Windows** khi dùng fallback CLI; trên Unix có thể dùng mặc định `/tmp/openclaw/...` (xem [`lib/zalouser/openclaw-zalouser-cli-qr-path.ts`](../../lib/zalouser/openclaw-zalouser-cli-qr-path.ts)). |
| `OPENCLAW_CLI` | Binary `openclaw` khi bật fallback CLI. |
| `OPENCLAW_DISABLE_BROWSER_CHANNEL_LOGIN` | Giữ cho route API legacy (nếu còn dùng ngoài UI). |

## 6. Phiên bản Gateway và `web.login.*`

Payload `web.login.start` (ví dụ `qrDataUrl`, `connected`, `message`) phụ thuộc **plugin zalouser + gateway** trên build OpenClaw bạn chạy. Nếu method không tồn tại hoặc lỗi `UNAVAILABLE`, bật `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` hoặc nâng cấp/đồng bộ `core/openclaw`.

**Lỗi thường gặp:** `web login provider is not available` — Gateway hiện tại **chưa đăng ký** luồng đăng nhập QR qua WebSocket (không có “web login provider” cho `web.login.start`). Đây không phải lỗi VClaw UI.

Tài liệu chính thức plugin Zalo Personal mô tả cài đặt plugin và **đăng nhập bằng CLI trên máy chạy Gateway** (`openclaw channels login --channel zalouser`): [Zalo Personal Plugin (OpenClaw docs)](https://docs.openclaw.ai/plugins/zalouser).

**Cách xử lý nhanh trên VClaw UI:** đặt `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` trên máy chủ Next.js, khởi động lại app; trên Windows thêm `OPENCLAW_ZALOUSER_QR_FILE` (đường dẫn tuyệt đối tới file PNG QR). Trang admin sẽ dùng fallback spawn CLI + hiển thị ảnh từ API `/api/openclaw/zalouser-cli-qr`.

## 7. Liên quan

- [13 — Technical Integration Reference](13-Technical-Integration-Reference.vi.md)
- [15 — Social Integration Solution](15-Social-Integration-Solution.vi.md)
