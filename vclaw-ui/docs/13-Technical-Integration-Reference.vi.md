# TÀI LIỆU KỸ THUẬT: HƯỚNG DẪN KẾT NỐI VCLAW ADMIN VỚI OPENCLAW CORE

---

## 1. TỔNG QUAN HẠ TẦNG KẾT NỐI
Hệ thống VClaw hoạt động theo mô hình Gateway-Client.
- **OpenClaw Core (Gateway)**: Chạy tại cổng mặc định `18789`.
- **VClaw Admin (Next.js)**: Đóng vai trò là Client, tương tác qua HTTP REST, WebSocket và MCP.

---

## 2. CHI TIẾT CÁC ĐIỂM KẾT NỐI (API ENDPOINTS)

### 2.1. REST API (HTTP qua Proxy)
VClaw Admin tương tác với Core thông qua một proxy Next.js tại `/api/gateway/*`.

| Chức năng | Phương thức | Đường dẫn tương đối | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Thực thi Chat** | POST | `/agents/v1/main/chat` | Gửi tin nhắn tới agent chính |
| **Gọi công cụ (MCP)**| POST | `/mcp/v1/tools/call` | Gọi các MCP tool đã tích hợp |
| **Lịch sử Session**| GET | `/sessions/{id}/history` | Lấy nhật ký hội thoại chi tiết |
| **Danh sách Model** | GET | `/v1/models` | Kiểm tra các LLM khả dụng |
| **Health Check** | GET | `/health` | Kiểm tra trạng thái Gateway |

**Headers nội bộ (được xử lý bởi Proxy):**
```http
X-Gateway-Token: <OPENCLAW_GATEWAY_TOKEN>
Content-Type: application/json
```

---

### 2.2. Native WebSocket (Thời gian thực)
Kết nối tới `ws://127.0.0.1:18789/ws`. Sử dụng giao thức dựa trên JSON-RPC 2.0 với cơ chế handshake challenge-response.

**Các phương thức chính:**
- `connect`: Handshake khởi tạo với thông tin caps của client và token.
- `chat.send`: Gửi tin nhắn vào một session (VD: `agent:main:main`).
- `config.apply`: Cập nhật động các cấu hình của core.

**Các sự kiện quan trọng:**
- `connect.challenge`: Nhận được ngay khi kết nối, yêu cầu gửi lại `connect`.
- `agent`: Stream trạng thái agent (giai đoạn suy nghĩ, bắt đầu/kết thúc tool).
- `chat`: Stream các delta của tin nhắn và phản hồi cuối cùng.

**Ví dụ triển khai (`lib/gateway-client.ts`):**
```typescript
class GatewayWsManager {
  connect(opts: GatewayWsOptions) {
    this.ws = new WebSocket("ws://127.0.0.1:18789/ws");
    this.ws.onmessage = (ev) => {
      const frame = JSON.parse(ev.data);
      if (frame.event === "agent") {
        // Xử lý sự kiện suy nghĩ hoặc gọi tool
      }
    };
  }
  
  async request(method: string, params: any) {
    this.ws.send(JSON.stringify({ type: "req", method, params }));
  }
}
```

---

### 2.3. MCP (Model Context Protocol)
MCP hỗ trợ trao đổi Context và Tool theo chuẩn JSON-RPC 2.0 qua HTTP POST.

### 2.3. Gọi công cụ MCP
Các công cụ MCP được gọi thông qua request REST POST tới endpoint MCP.

**Endpoint:** `/api/gateway/mcp/v1/tools/call`

**Cấu trúc Payload:**
```json
{
  "name": "vclaw.bill_verifier",
  "arguments": {
    "image_url": "path/to/bill.jpg"
  }
}
```

---

## 3. CẤU TRÚC CODE TRONG NEXT.JS ADMIN

Để quản lý kết nối chuyên nghiệp, tránh lộ Token ở Client Side và dễ bảo trì, VClaw Admin cần tổ chức code theo cấu trúc sau:

### 3.1. Lớp Proxy (Next.js API Routes)
**Vị trí:** `app/api/gateway/[...path]/route.ts`
Xử lý việc chèn token và quản lý CORS.

```typescript
// app/api/gateway/[...path]/route.ts
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Chuyển tiếp request tới OpenClaw và thêm header X-Gateway-Token
```

### 3.2. Lớp Client SDK (`lib/gateway-client.ts`)
Client hợp nhất cho giao tiếp REST và WebSocket. Được export dưới dạng `gatewayClient` và `gatewayWs`.
Được sử dụng bởi các UI component như `ai-chat-assistant.tsx`.

---

## 4. QUY TRÌNH THỰC THI CHO DEVELOPER (CHECKLIST)

1. **[X] Biến môi trường**: Đã cấu hình `OPENCLAW_GATEWAY_TOKEN` trong `.env.local`.
2. **[X] API Proxy**: Route Handler hoạt động tại `app/api/gateway/[...path]/route.ts`.
3. **[X] Khởi tạo WebSocket**: Logic `GatewayWsManager` đã hoàn thiện trong `lib/gateway-client.ts`.
4. **[ ] Lưu trữ DB**: Ánh xạ kết quả từ agent vào bản ghi `business.sqlite` để theo dõi đơn hàng.

---

## 5. LƯU Ý QUAN TRỌNG
- **CORS Handling**: OpenClaw Core cần được cấu hình `gateway.controlUi.allowedOrigins` để cho phép `localhost:3000` (của Next.js) kết nối WebSocket.
- **Error Handling**: Luôn bắt lỗi stream bị ngắt giữa chừng trên WebSocket để thực hiện cơ chế Reconnect tự động, đảm bảo Dashboard không bị treo.
- **Security**: Không bao giờ hardcode Token vào mã nguồn Frontend. Luôn đi qua Next.js API Routes để che giấu Token bí mật.

---

## 6. OPENCLAW ZERO TOKEN

Khi tiến trình gateway là [openclaw-zero-token](https://github.com/linuxhsj/openclaw-zero-token) (hoặc bản OpenClaw trên **cổng khác mặc định**):

| Biến | Vai trò |
| :--- | :--- |
| `OPENCLAW_GATEWAY_URL` | Base HTTP cho proxy [`/api/gateway/*`](../../app/api/gateway/[...path]/route.ts) (vd `http://127.0.0.1:3001`). |
| `OPENCLAW_GATEWAY_TOKEN` | `X-Gateway-Token` phía server; trùng `gateway.auth.token` trên fork. |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Cùng giá trị cho WebSocket `connect` trong [`lib/gateway-client.ts`](../../lib/gateway-client.ts). |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | URL WebSocket đầy đủ nếu không dùng `ws://127.0.0.1:18789/ws` (xem [`lib/gateway-ws-url.ts`](../../lib/gateway-ws-url.ts)). |

**Kiểm tra sức khỏe:** `GET /api/openclaw-health` trả `{ ok, status, baseUrl }` cho UI admin.

**Ma trận đầy đủ và ToS:** [14-OpenClaw-Zero-Token-Compatibility](14-OpenClaw-Zero-Token-Compatibility.vi.md). Mẫu cấu hình model fork: [`resources/openclaw.zero-token.sample.json`](../../resources/openclaw.zero-token.sample.json).
---

## 7. CẤU HÌNH ZALO PERSONAL CHANNEL (ZALOUSER)

Để tích hợp Zalo cá nhân, cấu hình trong lõi OpenClaw cần khai báo channel và plugin tương ứng.

**Mẫu cấu hình JSON (`openclaw.default.json`):**
```json
{
  "channels": {
    "zalouser": {
      "enabled": true,
      "config": {
        "userId": "0912345678",
        "mode": "auto"
      }
    }
  },
  "plugins": {
    "zalouser": {
      "enabled": true,
      "config": {
        "autoSync": true
      }
    }
  }
}
```

**Các sự kiện đặc thù:**
- `zalouser.message`: Nhận tin nhắn mới từ khách trên Zalo.
- `zalouser.call_tool`: VClaw UI gọi các skill như `send_message` thông qua MCP.

**Tham khảo thêm**: [15-Social-Integration-Solution](15-Social-Integration-Solution.vi.md).
