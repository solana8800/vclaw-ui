# TÀI LIỆU KỸ THUẬT: HƯỚNG DẪN KẾT NỐI VCLAW ADMIN VỚI OPENCLAW CORE

---

## 1. TỔNG QUAN HẠ TẦNG KẾT NỐI
Hệ thống VClaw hoạt động theo mô hình Gateway-Client.
- **OpenClaw Core (Gateway)**: Chạy tại cổng mặc định `18789`.
- **VClaw Admin (Next.js)**: Đóng vai trò là Client, tương tác qua HTTP REST, WebSocket và MCP.

---

## 2. CHI TIẾT CÁC ĐIỂM KẾT NỐI (API ENDPOINTS)

### 2.1. REST API (HTTP)
Các endpoint này hỗ trợ các thao tác CRUD và đẩy lệnh một lần.

| Chức năng | Phương thức | Đường dẫn (Full Path) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Chat định dạng OpenAI** | POST | `http://127.0.0.1:18789/v1/chat/completions` | Tương thích hoàn toàn với OpenAI SDK |
| **Gửi yêu cầu tới Agent** | POST | `http://127.0.0.1:18789/hooks/agent` | Dùng để dispatch task (xác minh bill, địa chỉ...) |
| **Tra cứu Session** | GET | `http://127.0.0.1:18789/sessions/{id}/history` | Lấy lịch sử hội thoại chuyên sâu |
| **Triệu hồi Tool trực tiếp**| POST | `http://127.0.0.1:18789/tools/invoke` | Gọi cụ thể 1 Tool (VD: `vietqr.generate`) |
| **Danh sách Models** | GET | `http://127.0.0.1:18789/v1/models` | Kiểm tra các LLM đang khả dụng |
| **Health Check** | GET | `http://127.0.0.1:18789/health` | Kiểm tra trạng thái Gateway |

**Cấu trúc Header bắt buộc:**
```http
Authorization: Bearer <OPENCLAW_GATEWAY_TOKEN>
Content-Type: application/json
```

---

### 2.2. WebSocket (Real-time Events)
Sử dụng chung cổng `18789`. Đây là kênh truyền tin chính cho Dashboard.

**Các Method (Events gửi đi):**
- `logs.subscribe`: Đăng ký nhận stream log hệ thống.
- `chat.completions`: Gửi tin nhắn chat và nhận stream kết quả trả về.
- `config.get` / `config.apply`: Đọc và ghi cấu hình Gateway.

**Các Event (Nhận về từ Gateway):**
- `GATEWAY_EVENTS`: Các sự kiện về trạng thái Agent, Session, hoặc kết quả xử lý task ngầm.

**Sample Code (Frontend):**
```typescript
import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:18789", {
  extraHeaders: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_GATEWAY_TOKEN}`
  }
});

socket.on("connect", () => {
  console.log("Đã kết nối tới OpenClaw Core");
  // Subscribe nhận tin nhắn từ session cụ thể
  socket.emit("sessions.subscribe", { sessionId: "current-session-id" });
});

socket.on("session.message", (data) => {
  console.log("Agent phản hồi:", data.message);
});
```

---

### 2.3. MCP (Model Context Protocol)
MCP hỗ trợ trao đổi Context và Tool theo chuẩn JSON-RPC 2.0 qua HTTP POST.

**Endpoint:** `http://127.0.0.1:18789/tools/invoke` (Đây là lớp bọc MCP của OpenClaw).

**Sample Request (Gọi skill xác minh bill):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "vclaw.bill_verifier",
    "arguments": {
      "image_url": "path/to/bill.jpg",
      "expected_amount": 500000
    }
  },
  "id": 1
}
```

---

## 3. CẤU TRÚC CODE TRONG NEXT.JS ADMIN

Để quản lý kết nối chuyên nghiệp, tránh lộ Token ở Client Side và dễ bảo trì, VClaw Admin cần tổ chức code theo cấu trúc sau:

### 3.1. Layer Middleware (Next.js API Routes)
**Vị trí:** `app/api/vclaw/[...path]/route.ts`
Đây là lớp "cầu nối". UI thay vì gọi thẳng port 18789 (dễ bị lỗi CORS hoặc lộ Token), sẽ gọi qua chính API của Next.js.

```typescript
// sample: app/api/vclaw/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const targetPath = params.path.join('/');
  const coreUrl = `http://127.0.0.1:18789/${targetPath}`;
  
  const body = await req.json();
  
  const response = await fetch(coreUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

### 3.2. Layer Client SDK (vclaw-ui/lib/openclaw)
**Vị trí:** `lib/openclaw/client.ts`
Chứa các hàm helper để UI gọi API một cách type-safe.

```typescript
// lib/openclaw/client.ts
export const openClawClient = {
  dispatchTask: async (agentId: string, message: string) => {
    const res = await fetch('/api/vclaw/hooks/agent', {
      method: 'POST',
      body: JSON.stringify({ agentId, message })
    });
    return res.json();
  },
  // Các hàm khác...
};
```

---

## 4. QUY TRÌNH THỰC THI CHO DEVELOPER (CHECKLIST)

1. **[ ] Cấu hình Biến môi trường**: Thêm `OPENCLAW_GATEWAY_TOKEN` vào file `.env.local` của `vclaw-ui`.
2. **[ ] Setup Proxy API**: Tạo file Route Handler tại `app/api/vclaw/[...path]/route.ts` để bọc các yêu cầu tới Core.
3. **[ ] Initialize WebSocket**: Tạo một Context Provider (VD: `OpenClawProvider`) bao bọc Layout Admin để duy trì kết nối Socket duy nhất.
4. **[ ] Schema Database**: Khi nhận kết quả từ `hooks/agent`, lưu thông tin định danh (runId) vào `business.sqlite` (của Next.js) để tra cứu trạng thái đơn hàng sau này.

---

## 5. LƯU Ý QUAN TRỌNG
- **CORS Handling**: OpenClaw Core cần được cấu hình `gateway.controlUi.allowedOrigins` để cho phép `localhost:3000` (của Next.js) kết nối WebSocket.
- **Error Handling**: Luôn bắt lỗi stream bị ngắt giữa chừng trên WebSocket để thực hiện cơ chế Reconnect tự động, đảm bảo Dashboard không bị treo.
- **Security**: Không bao giờ hardcode Token vào mã nguồn Frontend. Luôn đi qua Next.js API Routes để che giấu Token bí mật.
