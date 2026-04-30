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
Mặc định là `ws://127.0.0.1:18789/ws`; client trình duyệt lấy URL thực tế qua **`getGatewayWebSocketUrl()`** trong [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts) (biến **`NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL`** đổi host/cổng cho Zero Token hoặc gateway không mặc định). Khung tin dùng envelope Gateway (`type: "req"` / `"res"` / `"event"`) với handshake **`connect.challenge` → `connect`** (không phải JSON-RPC HTTP cổ điển).

**Các phương thức chính:**
- `connect`: Handshake khởi tạo với thông tin caps của client và token.
- `chat.send`: Gửi tin nhắn vào một session (VD: `agent:main:main`).
- `config.apply`: Cập nhật động các cấu hình của core.

**Các sự kiện quan trọng:**
- `connect.challenge`: Nhận được ngay khi kết nối, yêu cầu gửi lại `connect`.
- `agent`: Stream trạng thái agent (giai đoạn suy nghĩ, bắt đầu/kết thúc tool).
- `chat`: Stream các delta của tin nhắn và phản hồi cuối cùng.

**Ví dụ rút gọn (`vclaw-ui/lib/gateway/client.ts`):**
```typescript
import { getGatewayWebSocketUrl } from "@/lib/gateway/ws-url";

class GatewayWsManager {
  connect(opts: GatewayWsOptions) {
    const url = getGatewayWebSocketUrl(opts.path || "/ws");
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev) => {
      const frame = JSON.parse(ev.data);
      if (frame.type === "event" && frame.event === "agent") {
        // Xử lý sự kiện suy nghĩ hoặc gọi tool
      }
    };
  }

  async request(method: string, params: unknown) {
    const id = Math.random().toString(36).slice(2);
    this.ws?.send(JSON.stringify({ type: "req", id, method, params }));
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
**Vị trí:** [`vclaw-ui/app/api/gateway/[...path]/route.ts`](../vclaw-ui/app/api/gateway/[...path]/route.ts)  
Xử lý việc chèn token và quản lý CORS.

```typescript
// vclaw-ui/app/api/gateway/[...path]/route.ts
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Chuyển tiếp request tới OpenClaw và thêm header X-Gateway-Token
```

### 3.2. Lớp Client SDK (`vclaw-ui/lib/gateway/client.ts`)
Client hợp nhất cho giao tiếp REST và WebSocket. Export `gatewayClient` và `gatewayWs`.  
Dùng trong các component như [`vclaw-ui/components/admin/admin-chat-assistant.tsx`](../vclaw-ui/components/admin/admin-chat-assistant.tsx). Một số helper WS phía server nằm dưới `vclaw-ui/lib/openclaw/` (vd health).

---

## 4. QUY TRÌNH THỰC THI CHO DEVELOPER (CHECKLIST)

1. **[X] Biến môi trường**: Đã cấu hình `OPENCLAW_GATEWAY_TOKEN` trong `.env.local`.
2. **[X] API Proxy**: Route Handler tại [`vclaw-ui/app/api/gateway/[...path]/route.ts`](../vclaw-ui/app/api/gateway/[...path]/route.ts).
3. **[X] Khởi tạo WebSocket**: Logic `GatewayWsManager` trong [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts).
4. **[X] Lưu trữ DB (một phần → tiếp tục mở rộng)**: Prisma + `business.sqlite` cho CRUD admin; tool MCP agent như `vclaw.order.create` trong [`vclaw-ui/lib/agent/tools.ts`](../vclaw-ui/lib/agent/tools.ts) ghi đơn/khách. Luồng inbox mạng xã hội → CRM tự động hoàn toàn vẫn đang hoàn thiện dần.

---

## 5. LƯU Ý QUAN TRỌNG
- **CORS / origins**: OpenClaw Core nên khai báo origin của VClaw UI trong `gateway.controlUi.allowedOrigins`. Dev local chạy **cổng 12687** (`pnpm dev` trong `vclaw-ui`); thêm `http://localhost:12687` (và các URL locale nếu gateway kiểm tra đủ path).
- **Error Handling**: Luôn bắt lỗi stream bị ngắt giữa chừng trên WebSocket để thực hiện cơ chế Reconnect tự động, đảm bảo Dashboard không bị treo.
- **Security**: Không bao giờ hardcode Token vào mã nguồn Frontend. Luôn đi qua Next.js API Routes để che giấu Token bí mật.

---

## 6. OPENCLAW ZERO TOKEN

Khi tiến trình gateway là submodule [`core/openclaw-zero-token`](../core/openclaw-zero-token) (hoặc bản OpenClaw trên **cổng khác mặc định**):

| Biến | Vai trò |
| :--- | :--- |
| `OPENCLAW_GATEWAY_URL` | Base HTTP cho proxy [`/api/gateway/*`](../vclaw-ui/app/api/gateway/[...path]/route.ts) (vd `http://127.0.0.1:3001`). |
| `OPENCLAW_GATEWAY_TOKEN` | `X-Gateway-Token` phía server; trùng `gateway.auth.token` trong `core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json`. |
| `OPENCLAW_GATEWAY_VARIANT` | Gợi ý mode cho admin/UI (`zero-token` hoặc `upstream`); dùng cho card readiness và chẩn đoán. |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN` | Cùng giá trị cho WebSocket `connect` trong [`vclaw-ui/lib/gateway/client.ts`](../vclaw-ui/lib/gateway/client.ts). |
| `NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL` | URL WebSocket đầy đủ nếu không dùng `ws://127.0.0.1:18789/ws` (xem [`vclaw-ui/lib/gateway/ws-url.ts`](../vclaw-ui/lib/gateway/ws-url.ts)). |
| `VCLAW_GATEWAY_DEVICE_IDENTITY_PATH` | Tuỳ chọn: đường dẫn lưu device identity Ed25519 cho server-side health WS; mặc định `~/.vclaw/gateway-device-identity.json`. |

**Kiểm tra sức khỏe:** `GET /api/openclaw-health` trả payload chi tiết hơn cho UI admin, gồm `ok`, `status`, `baseUrl`, `wsUrl`, `authConfigured`, `mode`, `diagnosis`.

**Ma trận đầy đủ và ToS:** [14-OpenClaw-Zero-Token-Compatibility](14-OpenClaw-Zero-Token-Compatibility.vi.md). Runbook vận hành: [18-VClaw-Zero-Token-Onboarding](18-VClaw-Zero-Token-Onboarding.vi.md). Preset đóng gói / tham chiếu fork: [`vclaw-ui/resources/openclaw.zero-token.default.json`](../vclaw-ui/resources/openclaw.zero-token.default.json).
---

## 7. CẤU HÌNH ZALO PERSONAL CHANNEL (ZALOUSER)

Để tích hợp Zalo cá nhân, cấu hình trong lõi OpenClaw cần khai báo channel, plugin và thông tin cài đặt tương ứng.

**Mẫu cấu hình chuẩn (`openclaw.default.json`):**
```json
{
  "plugins": {
    "allow": [
      "...",
      "zalouser"
    ],
    "entries": {
      "zalouser": {
        "enabled": true
      }
    },
    "installs": {
      "zalouser": {
        "source": "clawhub",
        "spec": "clawhub:@openclaw/zalouser@2026.3.22",
        "version": "2026.3.22"
      }
    }
  },
  "channels": {
    "zalouser": {
      "enabled": true
    }
  }
}
```

**Các sự kiện đặc thù:**
- `zalouser.message`: Nhận tin nhắn mới từ khách trên Zalo.
- Agent / plugin có thể gọi tool `zalouser.*` trong vòng lặp OpenClaw (không nhất thiết qua MCP trực tiếp từ trang admin).

**Trang admin Zalo (zalouser)** trong `vclaw-ui` ưu tiên **WebSocket Gateway** (`directory.*`, `send`, `web.login.start`, …). Chi tiết transport (WS / SSE / MCP), biến môi trường và fallback CLI: [16-OpenClaw-Gateway-Transport-And-Zalouser-Admin](16-OpenClaw-Gateway-Transport-And-Zalouser-Admin.vi.md).

**Tham khảo thêm**: [15-Social-Integration-Solution](15-Social-Integration-Solution.vi.md).
