# CHIẾN LƯỢC TÍCH HỢP VCLAW UI VÀ OPENCLAW CORE

---

## 1. MỤC ĐÍCH TÀI LIỆU
Tài liệu này phân tích chi tiết về kiến trúc giao tiếp giữa bề mặt quản trị **VClaw Admin (Operations Console - Next.js)** và lõi xử lý **OpenClaw Core**. Đồng thời định hướng chiến lược sử dụng cơ sở dữ liệu (Database) nhằm đảm bảo hệ thống vừa giữ được các lợi thế về chuẩn tác vụ tự động của AI, vừa đáp ứng linh hoạt các nghiệp vụ kinh doanh riêng của VClaw.

---

## 2. PHÂN TÍCH GIAO THỨC GIAO TIẾP (COMMUNICATION PROTOCOLS)

Lõi OpenClaw cung cấp sẵn cơ chế Gateway mạnh mẽ hỗ trợ đa giao thức. VClaw Admin (`vclaw-ui/app/admin`) sẽ tương tác với lõi thông qua sự kết hợp của 3 chuẩn giao tiếp sau, tùy thuộc vào đặc thù nghiệp vụ:

### 2.1. WebSocket / Socket.IO (Real-time Streaming & Events)
Dashboard của OpenClaw (`Control UI`) chạy dựa trên nền tảng WebSocket để stream log và quản lý vòng đời của session.
- **Ứng dụng trong VClaw**: Sử dụng cho các tác vụ cần thời gian thực.
  - **Task Inbox Manager**: Khi có một bill chờ duyệt hoặc tin nhắn Zalo mới được Agent cảnh báo, hệ thống phải đẩy event ngay lập tức về UI để người dùng (chủ shop) thao tác.
  - **Agent Live Monitoring**: Theo dõi trực tiếp Agent đang làm gì (VD: đang chạy Playwright để lấy danh sách đơn từ Shopee).
- **Khuyến nghị**: Sử dụng làm giao thức chính cho vòng lặp tương tác giữa người dùng và Agent (Human-in-the-loop).

### 2.2. REST API (CRUD & Command Execution)
OpenClaw Gateway hỗ trợ các API HTTP (như `/api/sessions`, `/api/config`).
- **Ứng dụng trong VClaw**: Dành cho các hành động đồng bộ và tĩnh.
  - Lấy/cập nhật cấu hình hệ thống, cài đặt Payment, Shipping.
  - Gửi các lệnh (Commands) điều khiển đơn giản.
  - Truy vết Audit Log cơ bản.
- **Khuyến nghị**: Sử dụng để VClaw Admin khởi tạo giao diện và thực hiện các thao tác quản lý dữ liệu tĩnh truyền thống.

### 2.3. MCP (Model Context Protocol) qua HTTP/SSE (Primary Controller)
OpenClaw làm việc theo chuẩn MCP (`src/gateway/mcp-http.protocol.ts`). MCP là giao thức chủ đạo để VClaw UI (Control) điều khiển OpenClaw Core (Engine).
- **Ứng dụng trong VClaw**: 
  - VClaw UI đóng vai trò là một **MCP Client**.
  - Nó gọi các "Tools" của OpenClaw Core (Engine) chạy trên port **18789** để thực hiện các hành động AI.
  - Ví dụ: Click "Duyệt đơn" trên Dashboard (port 12687) sẽ gửi một MCP request sang port 18789 để Agent bắt đầu quá trình đóng gói hoặc gửi tin nhắn xác nhận.
- **Khuyến nghị**: Đây là tiêu chuẩn kỹ thuật bắt buộc để đồng bộ Context giữa giao diện kinh doanh và hành động của Agent.

---

## 3. CHIẾN LƯỢC QUẢN LÝ CƠ SỞ DỮ LIỆU (DATABASE STRATEGY)

### 3.1 Thực trạng DB của OpenClaw
OpenClaw hiện đang sở hữu hệ thống Database nội tại (có thể là SQLite hoặc LevelDB engine) chuyên dành cho:
- **Agent State & Memory**: Ghi nhớ hội thoại, session data, context awareness.
- **System Config & Logs**: Lưu trữ các cấu hình Gateway, API key tĩnh, nhật ký chạy Tools.

### 3.2 VClaw có nên thêm Database riêng cho nghiệp vụ không?
**Câu trả lời là CÓ.** VClaw Admin bắt buộc phải được trang bị một hệ thống **Embedded Database riêng biệt** (như SQLite hoặc HQL/H2 nếu viết bằng Java, nhưng với VClaw UI là ứng dụng Next.js thì **SQLite + Prisma / Drizzle ORM** là lựa chọn số 1).

### 3.3 Lý luận cho việc tách rời Database (Separation of Databases)
Việc sử dụng chung DB lõi của OpenClaw cho các nghiệp vụ bán hàng là một **rủi ro kiến trúc nghiêm trọng**, lý do:

1. **Phân tách mối quan tâm (Separation of Concerns):**
   - *OpenClaw Core DB*: Chuyên phục vụ AI, Agent runtime, lịch sử hội thoại thuần túy.
   - *VClaw Business DB (Prisma + SQLite)*: Dùng quản lý Thực thể kinh doanh (Entities) có cấu trúc chặt chẽ như `Order`, `Customer`, `Booking`.

2. **Dễ dàng cập nhật lõi (Upgradability & Product-Fork Safety):**
   - OpenClaw là dự án upstream có tốc độ thay đổi nhanh. Việc tách rời SQLite (đặt trong thư mục của VClaw UI và quản lý bởi Prisma) giúp bảo vệ tài sản dữ liệu kinh doanh khi nạp (pull/rebase) code mới từ OpenClaw Core.

3. **Phù hợp kiến trúc MVP "Local-first":**
   - Gói cài đặt 1-click sẽ khởi chạy song song hai server:
     - **VClaw UI Server**: Cổng **8800** (Next.js Standalone Server cung cấp đầy đủ Middleware/API Routes).
     - **OpenClaw Core Engine**: Cổng **12687** (Node.js daemon điều phối Agent và AI).
   - Dữ liệu `business.sqlite` nằm tĩnh tại máy của chủ shop, an toàn và dễ sao lưu.

### 3.4 Sơ đồ Tương tác Dữ liệu VClaw UI (Next.js App)
```mermaid
graph TD
    Client["Trình duyệt (Người bán hàng)"] --> UI["VClaw UI (Port 12687)"]
    
    subgraph VClaw Logic
        UI --> BizAPI["Next.js Server Actions / API Routes"]
        BizAPI <--> ORM["Prisma / SQLite"]
        ORM <--> BizDB[("VClaw Business DB")]
    end

    subgraph OpenClaw Engine
        UI <-->|"WebSocket / MCP"| Gateway["OpenClaw Gateway (Port 18789)"]
        BizAPI <-->|"MCP / REST API"| Gateway
    end
    
    subgraph OpenClaw Core
        Gateway <--> Agent["OpenClaw Agent Runtime"]
        Agent <--> CoreDB[("OpenClaw Core DB")]
    end
```

## 4. KẾT LUẬN VÀ LỘ TRÌNH TRIỂN KHAI CHO ADMIN CONSOLE
1. **Triển khai Database**: Khởi tạo ngay một `business.sqlite` thông qua Prisma bên trong `/vclaw-ui`. Bắt đầu định nghĩa Schema cho `TaskInbox`, `Orders` và `Customers`.
2. **Setup Kênh Realtime**: Cấu hình Socket.IO client kết nối tới cổng **18789** của OpenClaw ngay khi ứng dụng mount.
3. **Điều khiển qua MCP**: Ưu tiên sử dụng MCP để VClaw UI gọi các kỹ năng phân tích hoặc hành động tự động từ OpenClaw Core Engine.
