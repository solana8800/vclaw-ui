# OpenClaw Zero Token: tương thích với VClaw

Tài liệu ánh xạ [openclaw-zero-token](https://github.com/linuxhsj/openclaw-zero-token) (fork OpenClaw, đăng nhập web trình duyệt) với các điểm tích hợp VClaw Admin.

---

## 1. Zero Token bổ sung gì

- **Không cần API key trả phí** cho các nhà cung cấp hỗ trợ: credential lấy từ đăng nhập trình duyệt (Chrome CDP / onboarding), lưu cục bộ `auth.json` (không commit).
- **Cùng kiểu gateway OpenClaw**: mặt phẳng HTTP điều khiển + Web UI; README fork có `server.sh`, ví dụ cổng `3001`, và API kiểu OpenAI `POST /v1/chat/completions` với `Authorization: Bearer` cho **lớp HTTP đó**.
- **VClaw** không nhúng Chrome hay onboarding; chỉ cần **tiến trình gateway đang chạy** truy cập được từ máy chạy Next.js.

---

## 2. Ma trận tương thích

| Hạng mục | VClaw (OpenClaw upstream) | Fork Zero Token | Việc cần làm |
| :--- | :--- | :--- | :--- |
| **REST proxy** | `OPENCLAW_GATEWAY_URL` (mặc định `http://127.0.0.1:18789`) | Thường cổng khác (vd `http://127.0.0.1:3001`) theo `openclaw.json` / `server.sh` | Đặt `OPENCLAW_GATEWAY_URL` trùng base HTTP của fork. |
| **Header REST** | `X-Gateway-Token: <OPENCLAW_GATEWAY_TOKEN>` qua [`app/api/gateway/[...path]/route.ts`](../app/api/gateway/[...path]/route.ts) | Fork giữ auth gateway kiểu OpenClaw; đồng bộ `gateway.auth.token` với env VClaw | Giữ nguyên tên biến env hiện tại. |
| **HTTP OpenAI `/v1`** | Chat admin không bắt buộc dùng Bearer tới `/v1/chat/completions` | README dùng `Authorization: Bearer` cho `/v1/chat/completions` | Chat VClaw dùng **WebSocket + JSON-RPC**, không dùng Bearer trực tiếp tới `/v1`. |
| **WebSocket** | Mặc định `ws://127.0.0.1:18789/ws` qua [`lib/gateway-ws-url.ts`](../lib/gateway-ws-url.ts) | Phải khớp host/cổng fork | Đặt **`NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`** (vd `ws://127.0.0.1:3001/ws`) hoặc prefix theo helper. |
| **Handshake WS** | `connect.challenge` → `connect` + `auth.token`, scopes trong [`lib/gateway-client.ts`](../lib/gateway-client.ts) | Fork dựa trên OpenClaw; giao thức cần khớp **cùng thế hệ gateway** với UI | Nếu đổi cổng vẫn lỗi handshake, căn **phiên bản fork** với `core/openclaw` hoặc chỉnh trường protocol trên client. |
| **Model** | Ví dụ OpenRouter/Ollama trong `openclaw.default.json` | Model web: `deepseek-web/deepseek-chat`, `claude-web/...` | Cấu hình `agents.defaults.model` trên fork theo id `*-web/*`; xem [`resources/openclaw.zero-token.sample.json`](../resources/openclaw.zero-token.sample.json). |

---

## 3. Checklist vận hành (máy dev)

1. Clone và build fork (Node ≥ 22, pnpm, Chrome): theo README (`start-chrome-debug.sh` → `onboard.sh webauth` → `server.sh`).
2. Ghi lại địa chỉ **HTTP** và **WS** khi gateway chạy.
3. Trong VClaw `.env.local`:
   - `OPENCLAW_GATEWAY_URL=http://127.0.0.1:<cổng>`
   - `OPENCLAW_GATEWAY_TOKEN=<trùng gateway.auth.token trên fork>`
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<cùng token>` (chat trình duyệt)
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:<cổng>/ws` nếu khác 18789
4. Khởi động lại `pnpm dev`, mở chat admin; có thể gọi GET `/api/openclaw-health` — kỳ vọng `{ "ok": true }` khi gateway sống.

---

## 4. Bảo mật và tuân thủ

- **Không** mở gateway Zero Token ra internet công khai nếu chưa có TLS và kiểm soát truy cập.
- Phiên web hết hạn; cần onboard lại khi nhà cung cấp đăng xuất.
- Dùng giao diện web thay API chính thức có thể vi phạm **ToS**; chỉ nên thử nghiệm / nội bộ trừ khi được phép rõ ràng.

---

## 5. Trạng thái xác minh

Ma trận trên là **mức hợp đồng**: VClaw đã cấu hình được cổng và URL WS. **Xác minh runtime** với từng tag `openclaw-zero-token` và mỗi lần nâng fork hoặc `gateway-client` là trách nhiệm vận hành.
