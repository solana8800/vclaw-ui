# OpenClaw Zero Token: tương thích với VClaw

Tài liệu ánh xạ submodule [`core/openclaw-zero-token`](../core/openclaw-zero-token) ([linuxhsj/openclaw-zero-token](https://github.com/linuxhsj/openclaw-zero-token), fork OpenClaw đăng nhập web trình duyệt) với các điểm tích hợp VClaw Admin.

---

## 1. Zero Token bổ sung gì

- **Không cần API key trả phí** cho các nhà cung cấp hỗ trợ: credential lấy từ đăng nhập trình duyệt (Chrome CDP / onboarding), lưu cục bộ `auth.json` (không commit).
- **Provider web**: thêm các adapter `*-web` như DeepSeek, ChatGPT, Claude, Gemini, Qwen, Kimi, Doubao, GLM, Grok; adapter reuse cookie/bearer lấy từ browser login.
- **Chrome CDP + onboarding**: có `start-chrome-debug.sh`, `onboard.sh webauth`, profile browser riêng, capture credential và lưu cục bộ.
- **Gateway OpenClaw-compatible**: vẫn có HTTP/WS gateway, Web UI, API kiểu OpenAI `POST /v1/chat/completions`; thường chạy cổng `3001`.
- **AskOnce / multi-model**: fork có hướng broadcast một câu hỏi tới nhiều model web và so sánh câu trả lời.
- **VClaw** nên dùng Zero Token như runtime/gateway có thể bundle, không nên copy toàn bộ provider web vào Next/Electron UI.

---

## 2. Ma trận tương thích

| Hạng mục | VClaw (OpenClaw upstream) | Fork Zero Token | Việc cần làm |
| :--- | :--- | :--- | :--- |
| **REST proxy** | `OPENCLAW_GATEWAY_URL` (mặc định `http://127.0.0.1:18789`) | Thường cổng khác (vd `http://127.0.0.1:3001`) theo `openclaw.json` / `server.sh` | Đặt `OPENCLAW_GATEWAY_URL` trùng base HTTP của fork. |
| **Header REST** | `X-Gateway-Token: <OPENCLAW_GATEWAY_TOKEN>` qua [`app/api/gateway/[...path]/route.ts`](../app/api/gateway/[...path]/route.ts) | Fork giữ auth gateway kiểu OpenClaw; đồng bộ `gateway.auth.token` với env VClaw | Giữ nguyên tên biến env hiện tại. |
| **Phân loại mode** | UI admin có thể hiển thị `upstream` / `unknown` | Cần gán rõ Zero Token để card readiness đọc đúng | Đặt `OPENCLAW_GATEWAY_VARIANT=zero-token`. |
| **HTTP OpenAI `/v1`** | Chat admin không bắt buộc dùng Bearer tới `/v1/chat/completions` | README dùng `Authorization: Bearer` cho `/v1/chat/completions` | Chat VClaw dùng **WebSocket + JSON-RPC**, không dùng Bearer trực tiếp tới `/v1`. |
| **WebSocket** | Mặc định `ws://127.0.0.1:18789/ws` qua [`lib/gateway-ws-url.ts`](../lib/gateway-ws-url.ts) | Phải khớp host/cổng fork | Đặt **`NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`** (vd `ws://127.0.0.1:3001/ws`) hoặc prefix theo helper. |
| **Handshake WS** | `connect.challenge` → `connect` + `auth.token`, scopes trong [`lib/gateway-client.ts`](../lib/gateway-client.ts) | Fork dựa trên OpenClaw; giao thức cần khớp **cùng thế hệ gateway** với UI | Nếu đổi cổng vẫn lỗi handshake, căn **phiên bản fork** với `core/openclaw` hoặc chỉnh trường protocol trên client. |
| **Model** | Ví dụ OpenRouter/Ollama trong `openclaw.default.json` | Model web: `deepseek-web/deepseek-chat`, `claude-web/...` | Onboard provider web rồi chọn runtime model dạng `*-web/*` trong UI/CLI fork; xem [`resources/openclaw.zero-token.sample.json`](../resources/openclaw.zero-token.sample.json). |

---

## 3. Checklist vận hành (máy dev)

1. Khởi tạo submodule: `git submodule update --init --recursive core/openclaw-zero-token`.
2. Build fork trong `core/openclaw-zero-token` (Node ≥ 22, pnpm, Chrome): `pnpm install` → `pnpm build` → `pnpm ui:build`.
3. Onboard theo README fork: `./start-chrome-debug.sh` → đăng nhập web model → `./onboard.sh webauth` → `./server.sh`.
4. Ghi lại địa chỉ **HTTP**, **WS**, và `gateway.auth.token` trong `core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json`.
5. Trong VClaw `.env.local`:
   - `OPENCLAW_GATEWAY_URL=http://127.0.0.1:<cổng>`
   - `OPENCLAW_GATEWAY_TOKEN=<trùng gateway.auth.token trên fork>`
   - `OPENCLAW_GATEWAY_VARIANT=zero-token`
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<cùng token>` (chat trình duyệt)
   - `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:<cổng>/ws` nếu khác 18789
6. Khởi động lại `pnpm dev`, mở chat admin; có thể gọi GET `/api/openclaw-health` — kỳ vọng `mode: "zero-token"` và `diagnosis: "ok"` khi gateway usable.
7. Mở card **OpenClaw / Zero Token** trong admin để xem:
   - REST URL
   - WS URL
   - token configured/missing
   - diagnosis (`ok`, `unauthorized`, `unreachable`, `http_error`)

## 4. Desktop E2E trong installer

`scripts/package-vclaw.sh` hiện mặc định đóng gói runtime `core/openclaw-zero-token`:

```bash
bash scripts/package-vclaw.sh
```

Nếu cần quay lại OpenClaw custom/upstream hiện tại:

```bash
VCLAW_OPENCLAW_RUNTIME=upstream bash scripts/package-vclaw.sh
```

Luồng desktop sau khi cài:

- Installer copy `openclaw.default.json` theo mode runtime; với Zero Token, nguồn là [`vclaw-ui/resources/openclaw.zero-token.sample.json`](../vclaw-ui/resources/openclaw.zero-token.sample.json).
- `postinstall` tự sinh `gateway.auth.token` nếu config còn placeholder, rồi cài tarball OpenClaw vào `~/.openclaw/runtime`.
- Electron launcher đọc `~/.openclaw/openclaw.json`, tự set `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN`, `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN`, `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`, `OPENCLAW_GATEWAY_VARIANT` cho Next.js standalone.
- App bundle có helper `/Applications/VClaw.app/Contents/Resources/zero-token/start-chrome-debug.sh` và `vclaw-zero-token-onboard.sh` để người dùng hoàn tất Chrome CDP + `webauth` trên config `~/.openclaw/openclaw.json`.
- Người dùng vẫn phải đăng nhập web provider bằng Chrome CDP/onboarding; phần này không thể bundle sẵn vì chứa session cá nhân và chịu ràng buộc ToS.

## 5. Đánh giá kiến trúc VClaw có nên tự làm Zero Token không

VClaw là **Electron desktop app + Next.js business dashboard**; OpenClaw là **agent/gateway runtime**. Vì vậy ranh giới tốt nhất là:

- VClaw sở hữu UX, admin readiness, packaging, config, data nghiệp vụ, DB, Zalo/commerce workflows.
- OpenClaw Zero Token sở hữu provider web, Chrome automation, credential capture, gateway protocol, model catalog, tool-calling compatibility.
- VClaw chỉ nên "thêm phần đó" bằng cách bundle/chọn runtime Zero Token và gọi qua gateway contract; không nên fork provider web vào `vclaw-ui`, vì sẽ kéo browser automation, auth storage, provider drift và ToS risk vào lớp sản phẩm.
- Nếu muốn custom sâu, nơi hợp lý là `core/openclaw-zero-token` hoặc extension/plugin OpenClaw riêng, rồi VClaw tiêu thụ qua HTTP/WS như hiện tại.

---

## 6. Bảo mật và tuân thủ

- **Không** mở gateway Zero Token ra internet công khai nếu chưa có TLS và kiểm soát truy cập.
- Phiên web hết hạn; cần onboard lại khi nhà cung cấp đăng xuất.
- Dùng giao diện web thay API chính thức có thể vi phạm **ToS**; chỉ nên thử nghiệm / nội bộ trừ khi được phép rõ ràng.

---

## 7. Trạng thái xác minh

Ma trận trên là **mức hợp đồng**: VClaw đã cấu hình được cổng và URL WS. **Xác minh runtime** với từng tag `openclaw-zero-token` và mỗi lần nâng fork hoặc `gateway-client` là trách nhiệm vận hành.

Runbook từng bước: [18-VClaw-Zero-Token-Onboarding.vi.md](18-VClaw-Zero-Token-Onboarding.vi.md).
