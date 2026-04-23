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

## 2. JSON frame client gửi qua WebSocket (vclaw-ui → OpenClaw Gateway)

Mọi RPC (sau khi đã xác thực) đều là một dòng JSON UTF-8 có dạng:

```json
{ "type": "req", "id": "<chuỗi-ngẫu-nhiên>", "method": "<tên-phương-thức>", "params": { } }
```

`id` do client sinh (`Math.random().toString(36)…`); Gateway trả lời bằng `{ "type": "res", "id": "<cùng-id>", "ok": true|false, "payload": … }` hoặc `error` khi thất bại. Ngoài ra Gateway có thể đẩy `{ "type": "event", "event": "…", "payload": … }` (ví dụ `agent`, `chat`, `session.message`).

### 2.1. Handshake: `connect`

Sau khi socket mở, Gateway có thể gửi `event` `connect.challenge`; client tự gọi `sendConnect()` và gửi **một** frame `req` sau đây (`id` luôn có tiền tố `auth-` để client nhận diện handshake, không nằm trong hàng đợi `pending` giống các RPC khác):

```json
{
  "type": "req",
  "id": "auth-<random>",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "openclaw-control-ui",
      "version": "2026.4.15",
      "platform": "web",
      "mode": "webchat"
    },
    "role": "operator",
    "caps": ["tool-events"],
    "scopes": ["operator.read", "operator.write", "operator.admin"],
    "auth": { "token": "<NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN>" }
  }
}
```

- **`scopes`**: cần `operator.admin` để Gateway chấp nhận `channels.logout`, `web.login.start`, `web.login.wait` (theo method-scopes của OpenClaw).
- **`auth.token`**: có thể vắng nếu không cấu hình biến môi trường public token (khi đó hầu hết RPC sẽ lỗi sau handshake).

### 2.2. Chat admin (Ai assistant): `chat.send`

Nguồn: `sendChatMessage()` trong [`lib/gateway-client.ts`](../../lib/gateway-client.ts), gọi từ [`components/admin/ai-chat-assistant.tsx`](../../components/admin/ai-chat-assistant.tsx).

```json
{
  "type": "req",
  "id": "<random>",
  "method": "chat.send",
  "params": {
    "sessionKey": "agent:main:main",
    "message": "<nội-dung-tin-user>",
    "deliver": true,
    "idempotencyKey": "<uuid-hoặc-chuỗi-duy-nhất>"
  }
}
```

`sessionKey` mặc định `agent:main:main`; có thể là khóa session khác nếu hội thoại lưu `openclawSessionKey` trong store cục bộ.

### 2.3. Zalo Personal (zalouser): các `method` trong [`lib/zalouser/zalouser-gateway.ts`](../../lib/zalouser/zalouser-gateway.ts)

Tất cả ví dụ dưới đây dùng cùng khung `{ "type": "req", "id": "<random>", "method": "…", "params": … }`. Kênh Zalo cố định `"zalouser"`.

| `method` | `params` (ví dụ / trường thực tế) | Ghi chú |
|----------|-----------------------------------|---------|
| `channels.status` | `{ "probe": true, "timeoutMs": 20000 }` | Thăm dò trạng thái kênh. |
| `channels.logout` | `{ "channel": "zalouser", "accountId": "<tuỳ-chọn>" }` | `accountId` có thể bỏ. |
| `web.login.start` | `{ "force": true, "timeoutMs": 60000 }` hoặc `{ "force": false, "timeoutMs": 55000 }` | Panel có thể gọi lần hai với `force: false` khi message gợi ý “still preparing…”. `verbose` tùy chọn. |
| `web.login.wait` | `{ "timeoutMs": 55000 }` hoặc `{}` | Chờ quét QR xong; UI poll lặp lại sau mỗi lần timeout nếu chưa `connected`. |
| `sessions.subscribe` | `{}` | Đăng ký thay đổi session (khi tích hợp UI inbox). |
| `sessions.list` | `{ "limit": 100, "search": "zalouser", "includeDerivedTitles": true, "includeLastMessage": true }` | Lọc session liên quan zalouser. |
| `sessions.messages.subscribe` | `{ "key": "<sessionKey>" }` | Push tin theo session. |
| `sessions.messages.unsubscribe` | `{ "key": "<sessionKey>" }` | Hủy đăng ký. |
| `send` | `{ "to": "<threadId>", "message": "<text>", "channel": "zalouser", "accountId": "<tuỳ-chọn>", "sessionKey": "<tuỳ-chọn>", "idempotencyKey": "<random>" }` | Gửi DM/tin qua kênh; `idempotencyKey` bắt buộc phía client (sinh bằng `newIdempotencyKey()`). |
| `directory.self` | `{ "channel": "zalouser" }` | Thông tin tài khoản đã liên kết. |
| `directory.peers.list` | `{ "channel": "zalouser", "query": "<tuỳ-chọn>" }` | Danh sách bạn bè / peer. |
| `directory.groups.list` | `{ "channel": "zalouser", "query": "<tuỳ-chọn>" }` | Danh sách nhóm. |

Trang admin Zalo trực tiếp dùng **`web.login.start`**, **`web.login.wait`** (sau khi có QR) và **`gatewayWs.connect`** giống Ai chat; các method `directory.*`, `send`, `sessions.*`, `channels.*` nằm trong lớp bọc để đồng bộ inbox / gửi tin khi bạn bật luồng tương ứng.

## 3. SSE — luồng HTTP một chiều

SSE trong OpenClaw gắn với **các endpoint HTTP có stream** (ví dụ OpenResponses `stream: true`, lịch sử session), **không** thay thế handshake + method đầy đủ của Gateway. Dùng SSE khi consumer chỉ cần đọc một luồng sự kiện qua HTTP.

## 4. MCP — bridge và tool catalog

- `openclaw mcp serve` chạy MCP stdio; bridge **vẫn kết nối Gateway qua WebSocket** (xem `core/openclaw/docs/cli/mcp.md` khi có trong tree).
- Cấu hình MCP của agent (HTTP `sse` / `streamable-http`) phục vụ **gọi tool từ runtime**, khác với luồng điều khiển real-time của dashboard.

Trang admin **Zalo Personal (zalouser)** trong `vclaw-ui` dùng **WebSocket** (`send`, `directory.*`, `channels.*`, `web.login.*`), không dùng MCP cho các thao tác đó.

## 5. Ánh xạ chức năng admin Zalo → Gateway WS

Các hàm bọc sẵn: [`lib/zalouser/zalouser-gateway.ts`](../../lib/zalouser/zalouser-gateway.ts).

| Nhu cầu | Method WS (ưu tiên) |
|--------|----------------------|
| Trạng thái / định danh | `directory.self` (kênh `zalouser`), có thể kèm `channels.status` |
| Đăng nhập QR | `web.login.start` (payload có thể có `qrDataUrl`); tùy bản gateway có `web.login.wait` |
| Đăng xuất kênh | `channels.logout` |
| Danh sách nhóm | `directory.groups.list` |
| Gửi tin | `send` (có `idempotencyKey`) |
| Nghe tin / session | `sessions.subscribe`, `sessions.messages.subscribe` (khi cần UI real-time) |

## 6. Biến môi trường

| Biến | Vai trò |
|------|---------|
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Token gửi trong `connect` (browser). |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | URL WebSocket đầy đủ nếu khác mặc định. |
| `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_URL` | Proxy server → Gateway (xem doc 13). |
| `OPENCLAW_ZALOUSER_USE_CLI_LOGIN` | Đặt `1` để **fallback** đăng nhập bằng CLI + file PNG (máy chủ spawn `openclaw channels login`). Mặc định dùng WS + `web.login.start`. |
| `OPENCLAW_ZALOUSER_QR_FILE` | Đường dẫn **tuyệt đối** tới `openclaw-zalouser-qr-*.png` — **bắt buộc trên Windows** khi dùng fallback CLI; trên Unix có thể dùng mặc định `/tmp/openclaw/...` (xem [`lib/zalouser/openclaw-zalouser-cli-qr-path.ts`](../../lib/zalouser/openclaw-zalouser-cli-qr-path.ts)). |
| `OPENCLAW_CLI` | Binary `openclaw` khi bật fallback CLI. |
| `OPENCLAW_DISABLE_BROWSER_CHANNEL_LOGIN` | Giữ cho route API legacy (nếu còn dùng ngoài UI). |

## 7. Phiên bản Gateway và `web.login.*`

Payload `web.login.start` (ví dụ `qrDataUrl`, `connected`, `message`) phụ thuộc **plugin zalouser + gateway** trên build OpenClaw bạn chạy. Nếu method không tồn tại hoặc lỗi `UNAVAILABLE`, bật `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` hoặc nâng cấp/đồng bộ `core/openclaw`.

**Lỗi thường gặp:** `web login provider is not available` — Gateway hiện tại **chưa đăng ký** luồng đăng nhập QR qua WebSocket (không có “web login provider” cho `web.login.start`). Đây không phải lỗi VClaw UI.

Tài liệu chính thức plugin Zalo Personal mô tả cài đặt plugin và **đăng nhập bằng CLI trên máy chạy Gateway** (`openclaw channels login --channel zalouser`): [Zalo Personal Plugin (OpenClaw docs)](https://docs.openclaw.ai/plugins/zalouser).

**Cách xử lý nhanh trên VClaw UI:** đặt `OPENCLAW_ZALOUSER_USE_CLI_LOGIN=1` trên máy chủ Next.js, khởi động lại app; trên Windows thêm `OPENCLAW_ZALOUSER_QR_FILE` (đường dẫn tuyệt đối tới file PNG QR). Trang admin sẽ dùng fallback spawn CLI + hiển thị ảnh từ API `/api/openclaw/zalouser-cli-qr`.

## 8. Liên quan

- [13 — Technical Integration Reference](13-Technical-Integration-Reference.vi.md)
- [15 — Social Integration Solution](15-Social-Integration-Solution.vi.md)
