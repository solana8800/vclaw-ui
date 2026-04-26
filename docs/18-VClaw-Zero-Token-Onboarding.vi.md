# VClaw + OpenClaw Zero Token: runbook khởi động nhanh

Tài liệu này gom các bước tối thiểu để chạy **VClaw UI** với **openclaw-zero-token** theo góc nhìn vận hành. Mục tiêu là xác nhận nhanh 4 lớp:

1. Gateway Zero Token đang chạy
2. VClaw gọi được REST `/health`
3. Trình duyệt VClaw authenticate được WebSocket
4. Mô hình web thực sự sẵn sàng trả lời

---

## 1. Điều kiện đầu vào

- Máy đã cài Node / pnpm theo yêu cầu của `openclaw-zero-token`
- Chrome hoặc Chromium chạy được ở chế độ debug CDP
- Đã clone repo `vclaw` kèm submodule:

```bash
git submodule update --init --recursive core/openclaw-zero-token
```

---

## 2. Khởi động Zero Token

Trong repo `vclaw`, chạy trong submodule `core/openclaw-zero-token`:

```bash
cd core/openclaw-zero-token
```

1. Cài và build fork nếu lần đầu chạy:

```bash
pnpm install
pnpm build
pnpm ui:build
```

2. Chạy trình duyệt debug theo helper của fork:

```bash
./start-chrome-debug.sh
```

Script này mở Chrome debug ở `http://127.0.0.1:9222` với profile riêng, rồi mở các trang web model để bạn đăng nhập.

3. Chạy onboarding web:

```bash
./onboard.sh webauth
```

4. Đăng nhập nhà cung cấp web mà bạn muốn dùng.
5. Khởi động gateway:

```bash
./server.sh
```

Kỳ vọng:

- gateway lắng nghe ở một cổng riêng, ví dụ `3001`
- file state thật nằm ở `core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json`
- `gateway.auth.token` trong state file đã có giá trị thật
- provider web đã được wizard ghi vào `models.providers`
- runtime model đang dùng là model dạng `*-web/*`, ví dụ `/model deepseek-web/deepseek-chat` trong UI/CLI của fork
- `models.providers` có ít nhất một provider web, ví dụ `deepseek-web`, `chatgpt-web`, hoặc `claude-web` từ mẫu [`vclaw-ui/resources/openclaw.zero-token.sample.json`](../vclaw-ui/resources/openclaw.zero-token.sample.json)

---

## 3. Cấu hình VClaw

Trong `vclaw-ui/.env.local`:

```bash
OPENCLAW_GATEWAY_URL=http://127.0.0.1:3001
OPENCLAW_GATEWAY_TOKEN=<gateway.auth.token trong core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json>
OPENCLAW_GATEWAY_VARIANT=zero-token
NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<cùng gateway.auth.token>
NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:3001/ws
# Tuỳ chọn nếu muốn pin device identity server-side:
VCLAW_GATEWAY_DEVICE_IDENTITY_PATH=~/.vclaw/gateway-device-identity.json
```

Ý nghĩa:

- `OPENCLAW_GATEWAY_URL`: base URL cho REST proxy server-side
- `OPENCLAW_GATEWAY_TOKEN`: token bí mật cho route server-side
- `OPENCLAW_GATEWAY_VARIANT=zero-token`: giúp UI/admin phân loại gateway đúng mode
- `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN`: token cho WebSocket client
- `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`: bắt buộc khi gateway không chạy cổng mặc định `18789`
- `VCLAW_GATEWAY_DEVICE_IDENTITY_PATH`: nơi VClaw lưu device identity để ký nonce WS server-side; browser admin dùng device identity riêng trong `localStorage`

---

## 4. Khởi động VClaw và xác minh

Trong repo `vclaw`:

```bash
cd vclaw-ui
pnpm dev
```

### 4.1. Kiểm tra route health

Mở:

```text
http://localhost:12687/api/openclaw-health
```

Kỳ vọng payload có dạng:

```json
{
  "ok": true,
  "status": 200,
  "baseUrl": "http://127.0.0.1:3001",
  "wsUrl": "ws://127.0.0.1:3001/ws",
  "authConfigured": true,
  "mode": "zero-token",
  "diagnosis": "ok"
}
```

Khi gateway expose đủ metadata WebSocket, payload còn có `readiness`:

- `hasZeroTokenModels`: catalog có provider `*-web`
- `hasUsableZeroTokenAuth`: provider web đã đăng nhập hoặc auth còn dùng được
- `hasZeroTokenRuntimeModel`: session/default model hiện tại đang là `*-web/*`

### 4.2. Kiểm tra card trạng thái trong admin

Mở bất kỳ trang admin nào. Card **OpenClaw / Zero Token** phải hiển thị:

- mode: `Zero Token`
- REST URL đúng
- WS URL đúng
- token: `Đã cấu hình`
- Catalog/Auth/Runtime web đều đạt khi Zero Token usable
- diagnosis:
  - `Sẵn sàng` nếu gateway usable
  - `Sai token / bị từ chối` nếu token sai
  - `Không kết nối được` nếu gateway chưa chạy / sai URL

### 4.3. Kiểm tra AI chat admin

Mở nút chat admin:

- nếu banner cảnh báo `Gateway từ chối token`, sửa token env
- nếu banner cảnh báo `Không gọi được gateway`, sửa `OPENCLAW_GATEWAY_URL` / `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`
- nếu gateway sống nhưng chat model fail, kiểm tra lại:
  - session web đã login chưa
  - session có hết hạn không
  - model mặc định có đang là `*-web/*` không

---

## 5. Lỗi phổ biến

### 5.1. `/api/openclaw-health` trả `unauthorized`

Nguyên nhân thường gặp:

- `OPENCLAW_GATEWAY_TOKEN` không khớp `gateway.auth.token`
- gateway yêu cầu auth nhưng env chưa reload

### 5.2. `/api/openclaw-health` trả `unreachable`

Nguyên nhân thường gặp:

- `server.sh` chưa chạy
- sai cổng trong `OPENCLAW_GATEWAY_URL`
- máy chạy VClaw không truy cập được host của gateway

### 5.3. Card hiển thị `mode: Chưa rõ`

Nguyên nhân:

- chưa đặt `OPENCLAW_GATEWAY_VARIANT=zero-token`

VClaw vẫn có thể nói chuyện với gateway, nhưng admin sẽ không phân loại đúng mode.

### 5.4. Health xanh nhưng chat vẫn lỗi

Đây thường là lỗi ở **lớp provider web**, không phải lớp gateway:

- session trình duyệt hết hạn
- chưa chạy lại `webauth`
- model web chưa được chọn làm mặc định

---

## 6. Bảo mật

- Không commit token gateway thật
- Không commit `auth.json`, cookies, profile browser
- Không mở Zero Token gateway ra public internet nếu chưa có lớp bảo vệ phù hợp

---

## 7. Liên kết liên quan

- [13-Technical-Integration-Reference.vi.md](13-Technical-Integration-Reference.vi.md)
- [14-OpenClaw-Zero-Token-Compatibility.vi.md](14-OpenClaw-Zero-Token-Compatibility.vi.md)
- [`vclaw-ui/resources/openclaw.zero-token.sample.json`](../vclaw-ui/resources/openclaw.zero-token.sample.json)
