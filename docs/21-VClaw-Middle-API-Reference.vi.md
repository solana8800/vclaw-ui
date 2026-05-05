# Tài liệu Kỹ thuật: Các API Middle (API Routes) trong VClaw UI

Tài liệu này mô tả các điểm cuối (endpoints) API được triển khai trong ứng dụng Next.js (`vclaw-ui`). Các API này đóng vai trò là lớp trung gian (BFF - Backend for Frontend) kết nối giao diện người dùng với cơ sở dữ liệu, OpenClaw Gateway và các dịch vụ bên thứ ba.

## Bảng tổng hợp nhanh (API Reference Table)

| API Endpoint | Mô tả | Usecase (Trường hợp sử dụng) | Trạng thái sử dụng | Vị trí sử dụng trong mã nguồn |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/openclaw-health` | Kiểm tra sức khỏe Gateway & Zero Token | Hiển thị trạng thái hệ thống AI trên Dashboard Admin | Đang sử dụng | `components/admin/openclaw-zero-token-status.tsx` |
| `POST /api/vclaw/automation/heartbeat` | Kích hoạt tác vụ marketing/tự động hóa | Chạy cron job gửi tin nhắn định kỳ cho khách hàng | Đang sử dụng (Cron/AI) | `app/api/vclaw/automation/heartbeat/route.ts` (Được gọi từ cron/external) |
| `POST /api/vclaw/agent-tools` | Cổng thực thi công cụ nghiệp vụ cho AI | Agent thực hiện tạo đơn hàng, tra cứu kho qua chat | Đang sử dụng (AI Agent) | `scripts/packaging/openclaw-workspace/TOOLS.md` (Cấu hình cho AI Agent) |
| `POST /api/vclaw/enrich` | Làm giàu ngữ cảnh cho prompt AI | AI hiểu rõ lịch sử/nhu cầu của khách đang chat | Đang sử dụng (Gateway AI) | `components/admin/admin-chat-assistant.tsx` (Internal AI context) |
| `GET /api/vclaw/metadata` | Lấy preview link (OG Metadata) | Hiển thị card thông tin khi dán link vào khung chat | Đang sử dụng | `components/admin/url-preview.tsx` |
| `GET /api/auth/channel/*/start` | Bắt đầu luồng OAuth kết nối kênh | Khi Admin nhấn "Kết nối Zalo/Meta/Shopee" | Đang sử dụng | `app/api/auth/channel/*/start/route.ts` |
| `GET /api/auth/channel/*/callback` | Xử lý kết quả trả về từ OAuth | Lưu token kết nối sau khi cấp quyền thành công | Đang sử dụng | `app/api/auth/channel/*/callback/route.ts` |
| `POST /api/webhooks/channel/zalo` | Nhận sự kiện từ Zalo OA | Tự động tiếp nhận và xử lý tin nhắn khách hàng | Đang sử dụng | `app/api/webhooks/channel/zalo/route.ts` (Webhook từ Zalo) |
| `POST /api/admin/upload` | Tải tập tin/hình ảnh lên máy chủ | Admin tải ảnh sản phẩm hoặc tài liệu lên hệ thống | Đang sử dụng | `components/admin/product-manager.tsx` |
| `GET /api/admin/reports/stats` | Thống kê dữ liệu kinh doanh | Hiển thị biểu đồ doanh thu và tăng trưởng trên Dashboard | Đang sử dụng | `app/[locale]/admin/reports/page.tsx` |
| `ANY /api/gateway/[...path]` | Proxy yêu cầu tới OpenClaw Gateway | Các module Frontend gọi API nhân AI một cách an toàn | Đang sử dụng | `lib/gateway/client.ts`, `app/actions/gateway.ts` |
| `POST /api/mcp` | Proxy giao thức MCP cho AI | AI Agent truy cập các tài nguyên mở rộng qua MCP | Đang sử dụng | `app/api/mcp/route.ts` (MCP Proxy) |

---

## 1. Hệ thống & Sức khỏe (System & Health)

### `GET /api/openclaw-health`
*   **Mục đích:** Kiểm tra trạng thái hoạt động của OpenClaw Gateway và Zero Token runtime.
*   **Chi tiết:**
    *   Kiểm tra kết nối HTTP và WebSocket tới Gateway.
    *   Lấy danh sách các model đang sẵn sàng và trạng thái xác thực của các nhà cung cấp (AI Providers).
    *   Trả về thông tin chi tiết để hiển thị banner trạng thái trên giao diện Admin.
*   **Runtime:** Node.js

### `POST /api/vclaw/automation/heartbeat`
*   **Mục đích:** Kích hoạt các tác vụ tự động hóa định kỳ (ví dụ: gửi tin nhắn marketing, nhắc lịch).
*   **Chi tiết:** Gọi hàm `executeHeartbeat()` trong logic nghiệp vụ.
*   **Xác thực:** (Khuyến nghị bổ sung secret nếu dùng cron job công khai).

---

## 2. AI & Công cụ Agent (AI & Agent Tools)

### `POST /api/vclaw/agent-tools`
*   **Mục đích:** Bridge HTTP cho phép OpenClaw hoặc các công cụ tự động hóa gọi vào logic nghiệp vụ của VClaw.
*   **Xác thực:** Header `Authorization: Bearer $VCLAW_AGENT_TOOLS_SECRET`.
*   **Body:** `{ "tool": "vclaw.order.create", "arguments": { ... } }`.
*   **GET:** Trả về danh sách metadata của các công cụ (tools) và tài nguyên (resources) theo định dạng tương tự MCP.

### `POST /api/vclaw/enrich`
*   **Mục đích:** Làm giàu ngữ cảnh (context enrichment) cho tin nhắn trước khi gửi tới AI.
*   **Chi tiết:**
    *   Nạp lịch sử giao dịch, thông tin khách hàng từ Database dựa trên `externalId`.
    *   Làm sạch tin nhắn (clean body).
    *   Xây dựng Prompt đã được nhúng ngữ cảnh đầy đủ.

### `GET /api/vclaw/metadata`
*   **Mục đích:** Lấy thông tin metadata (tiêu đề, mô tả, ảnh đại diện) của một URL.
*   **Tham số:** `?url=...` (cần được encode).
*   **Bảo mật:** Chặn truy cập vào mạng nội bộ (localhost, 127.0.0.1, 192.168.x.x) để phòng chống SSRF.

---

## 3. Xác thực & Kênh kết nối (Auth & Channels)

### `GET /api/auth/channel/zalo/start`
*   **Mục đích:** Bắt đầu luồng OAuth cho Zalo Official Account (OA).
*   **Chi tiết:** Điều hướng người dùng tới trang xin quyền của Zalo. Lưu `locale` vào cookie để xử lý sau khi callback.

### `GET /api/auth/channel/zalo/callback`
*   **Mục đích:** Tiếp nhận mã code từ Zalo OAuth, đổi lấy `access_token` và `refresh_token`.
*   **Chi tiết:**
    *   Lưu trữ thông tin kết nối vào bảng `ChannelConnection` và `IntegrationAccount`.
    *   Tự động revalidate các trang Admin để cập nhật trạng thái mới.
    *   Điều hướng người dùng về trang cài đặt.

### `POST /api/webhooks/channel/zalo`
*   **Mục đích:** Tiếp nhận sự kiện từ Zalo OA (tin nhắn mới, sự kiện quan tâm, v.v.).
*   **Xác thực:** Kiểm tra chữ ký (signature) sử dụng `ZALO_OA_WEBHOOK_SECRET`.
*   **GET:** Trả về trạng thái ok (thường dùng để verify URL trên Zalo Console).

### Các kênh kết nối khác (Meta, Shopee, ...)
*   Tương tự như Zalo, các luồng OAuth cho **Meta** (`/api/auth/channel/meta/*`) và **Shopee** (`/api/auth/channel/shopee/*`) cũng được triển khai với cấu trúc `start` và `callback` tương ứng để kết nối đa kênh.

---

## 4. Quản trị & Nghiệp vụ (Admin & Operations)

### `POST /api/admin/upload`
*   **Mục đích:** Tải tập tin lên máy chủ.
*   **Chi tiết:** Lưu trữ file vào thư mục `public/uploads` với tên file duy nhất (UUID). Trả về danh sách URL của các file đã upload.

### `GET /api/admin/reports/stats`
*   **Mục đích:** Lấy số liệu thống kê tổng quát về tình hình kinh doanh (đơn hàng, doanh thu, khách hàng).
*   **Chi tiết:** Tổng hợp dữ liệu từ database cho dashboard admin.

---

## 5. Proxy & Gateway

### `ANY /api/gateway/[...path]`
*   **Mục đích:** Proxy tất cả các yêu cầu REST tới OpenClaw Gateway.
*   **Chi tiết:**
    *   Tự động thêm header `X-Gateway-Token`.
    *   Hỗ trợ truyền tiếp (forward) các header và body.
    *   Hỗ trợ Streaming (Server-Sent Events) bằng cách vô hiệu hóa buffering.
*   **Runtime:** Edge (để tối ưu hiệu năng).

### `POST /api/mcp`
*   **Mục đích:** Proxy các yêu cầu theo giao thức Model Context Protocol (MCP) tới Gateway.
*   **Chi tiết:** Hỗ trợ cả phản hồi JSON thông thường và luồng dữ liệu SSE.
