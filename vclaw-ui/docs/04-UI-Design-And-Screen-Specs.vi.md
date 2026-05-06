# Tài Liệu Đặc Tả Trải Nghiệm & Giao Diện VClaw (UI/UX Specifications)

Tài liệu này định nghĩa cấu trúc giao diện cho **Operations Console (Bàn làm việc số)** của VClaw, dựa trên chiến lược "chuyển đổi từ công cụ Kỹ thuật (Mission Control) sang công cụ Kinh doanh (CRM-lite)".

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

1. **Từ chối ngôn ngữ Dev-Ops:** Không có các khái niệm `Terminal`, `Tail Logs`, `Agent Memory`, `Cron Job` ở giao diện chính. Nếu có lỗi, AI sẽ tóm tắt lỗi bằng ngôn ngữ tự nhiên: *"Không quét được số tiền trên Bill khách hàng Phạm A"*.
2. **Giao diện sáng, hiện đại, thẩm mỹ cao:** SMB cần một không gian làm việc khiến họ cảm thấy nhẹ nhàng. Áp dụng phong cách tối giản (Minimalist), Glassmorphism (lớp kính mờ), góc bo tròn, màu sắc tương phản cao (sạch sẽ, độ tin cậy của ngân hàng).
3. **Quyền lực "Human-in-the-loop":** Các quyết định thay đổi trạng thái kinh doanh (nhận tiền, gửi hàng) AI chỉ đề xuất, con người bấm nút **[Duyệt]**.
4. **Chủ động nhưng có kiểm soát:** UI phải hỗ trợ content, follow-up, auto tư vấn và campaign draft, nhưng luôn cho người dùng nhìn thấy policy, queue duyệt và log hành động.

---

## 2. Hệ Thống Màn Hình & Cấu Trúc App Shell (Browser Shell Architecture)

VClaw Desktop được thiết kế như một **Trình duyệt Quản trị**, giao diện chia làm 3 khu vực chính:

1. **Thanh Sidebar Trái (Omnichannel Switcher)**: Cho phép chuyển đổi giữa Dashboard VClaw và các Tab trình duyệt đang mở (Shopee, Lazada, FB, Zalo). 
2. **Khu vực Nội dung Chính (Main View)**: 
   - Khi ở Dashboard: Hiển thị các module Next.js (`/admin/*`).
   - Khi ở Platform Tab: Hiển thị giao diện Web thực tế của sàn TMĐT/Mạng xã hội (được bao bọc bởi Playwright/WebView).
3. **Lớp phủ Agent (Agent Overlay)**: Một thanh toolbar hoặc chatbot nhỏ xuất hiện xuyên suốt các ứng dụng, cung cấp các Tool xử lý nhanh (VietQR, Trích xuất địa chỉ) mà không làm gián đoạn luồng làm việc trên tab.

*   **Setup Wizard (Onboarding)** - Chỉ chạy lần đầu.
*   **Trang Chủ (Overview Dashboard)** - "Bàn làm việc số" với đầy đủ chỉ số KPI, biểu đồ doanh thu và hàng đợi tác vụ khẩn cấp.
*   **Khách Hàng & Hội Thoại (Customers)** - Module trung tâm (CRM-lite) kết hợp quản lý thông tin khách hàng, lịch sử hội thoại đa kênh và Hộp thư tác vụ (Task Inbox) để duyệt nhanh đề xuất của AI.
*   **Bán Hàng (Orders)** - Quản lý vòng đời đơn hàng theo dạng Kanban.
*   **Thanh Toán & Giao Vận** - Các module hỗ trợ đối soát dòng tiền và lấy báo giá vận chuyển thời gian thực.
*   **VClaw Token (Zalo Integration)** - Thiết lập kết nối Zalo, cấu hình Bot và các quy trình tự động hóa (Automation).
*   **Thiết Lập (Settings)** - Đổi prompt, kết nối VietQR, cấu hình chung cho workspace.

---

## 3. Mockups & Giao Diện Điển Hình

Dưới đây là các bản nháp (Mockups) mô phỏng định hướng về mặt hình ảnh (Visual flow) để đội ngũ thấy rõ sự khác biệt giữa VClaw và OpenClaw Control UI gốc.

### 3.1. Luồng Cài Đặt Ban Đầu (Onboarding Wizard)

Khác với các tool lập trình viên yêu cầu nhập Token và API key từ dòng lệnh, VClaw chào đón người bán hàng bằng một hộp thoại thân thiện, giống cảm giác của các phần mềm bán hàng phổ biến như Shopify hay KiotViet. Ở đây KiotViet chỉ được dùng như một tham chiếu trải nghiệm quen thuộc với SMB, không phải hàm ý tích hợp sản phẩm.

![VClaw Onboarding UI Mockup](./assets/vclaw_onboarding.png)

> [!TIP]
> **Logic luồng cài đặt:** AI Agent chạy ngầm sẽ lấy thông tin Tên shop, Hình ảnh QR và Tên ngân hàng này để tự động chèn vào Prompt cấu hình ngữ cảnh mà người dùng không hề hay biết rằng họ đang "lập trình" cho AI.

### 3.2. Bàn Làm Việc Số (Operations Console Dashboard)

Đây là màn hình người kinh doanh nhìn thấy mỗi sáng mở laptop hoặc truy cập bằng máy tính bảng tại cửa hàng.

![VClaw Main Dashboard Mockup](./assets/vclaw_dashboard_main.png)

> [!NOTE]
> Màn hình chia làm các khu vực kinh doanh rõ ràng: Thống kê doanh thu, lead mới, Box duyệt lệnh (Task Inbox) làm trọng tâm, panel chat hỗ trợ bên phải và các chỉ dấu tăng trưởng như follow-up hoặc content chờ duyệt.

### 3.3. Giao diện Trình duyệt Đa nền tảng (Omnichannel Browser Tabs)

VClaw cho phép người dùng mở các tab trình duyệt ngay trong ứng dụng để thao tác trực tiếp trên giao diện của đối tác.

![VClaw Browser Tabs Mockup](./assets/vclaw_browser_tabs.png)

> [!TIP]
> **Trải nghiệm tích hợp:** Khi người dùng đang ở tab Shopee Seller Center, họ có thể yêu cầu Agent "Kiểm tra toàn bộ đơn hàng chờ duyệt" hoặc "Tự động trích xuất thông tin khách hàng vừa nhắn tin" thông qua Agent Overlay gắn kèm trên trình duyệt.

---

## 4. Phân Tích Tính Năng Của Từng Màn Hình (Screen Features Specification)

Thực tế triển khai của VClaw bao gồm các màn hình vận hành cốt lõi chạy trên Next.js App Router (`/admin/*`) với giao diện hỗ trợ Light/Dark mode, tuân thủ chặt chẽ Usecase MVP:

### 4.1 Màn hình Tổng Quan (Dashboard / Overview)
Đây là "Bàn làm việc số" trung tâm, cung cấp cái nhìn 360 độ về tình hình kinh doanh:
*   **Chỉ số KPI (Quick Stats):** `Thanh toán chờ`, `Đơn hàng mở`, `Lịch hẹn hôm nay`, `Tác vụ chờ duyệt`.
*   **Biểu đồ Tăng trưởng:** Theo dõi doanh thu thực tế (Revenue Chart) và tăng trưởng khách hàng theo thời gian.
*   **Hiệu suất AI:** Thống kê mức độ hiệu quả của các tác vụ tự động hóa do Agent thực hiện.
*   **Task Inbox Widget:** Một phiên bản thu gọn của hàng đợi tác vụ khẩn cấp để người dùng xử lý ngay tại trang chủ.

### 4.2 Màn hình Khách Hàng & Hội Thoại (Customers - `/admin/customers`)
Module quan trọng nhất, nơi hội tụ dữ liệu khách hàng và tương tác thời gian thực.
*   **Task Inbox Manager (Hộp thư tác vụ):** Đưa triết lý *Human-in-the-loop* lên đầu trang. AI trình các đề xuất (Kiểm bill, Xác nhận địa chỉ, Duyệt nhắc lịch) để con người bấm nút duyệt. Thao tác nhanh: `[Duyệt]`, `[Từ chối]`, `[Sửa]`.
*   **Customer Manager & Omnichannel Chat:** Danh sách khách hàng kèm khung chat đa kênh (Zalo, Telegram...). Cho phép tra cứu nhanh lịch sử đơn hàng và thông tin cá nhân ngay trong bối cảnh trò chuyện.
*   **Channel Thread Panel:** Cửa sổ chat chi tiết hiện ra khi chọn một hội thoại, hỗ trợ gửi tin nhắn và xem log tương tác của AI.

### 4.3 Màn hình Xác minh Thanh toán (Payments - `/admin/payments`)
Chuyên biệt hóa khâu dòng tiền để giảm sai sót của AI.
*   **Bill Verification Manager:** Hỗ trợ quét OCR cho ảnh giao dịch.
*   **Bảng đối soát (Reconciliation):** So sánh 2 cột trực quan giữa "Số tiền trong đơn (Expected)" và "Số tiền trên Bill (Detected)".
*   **Đề xuất trạng thái:** Tự động hiện màu (Xanh/Cam/Đỏ) tùy mức độ khớp để người dùng quyết định trước khi đẩy lệnh "Xác nhận Nhận Tiền" vào Backend.

### 4.4 Màn hình Quản lý Lịch hẹn (Bookings - `/admin/bookings`)
Dành riêng cho tệp nhà bán hàng dịch vụ (Spa, Salon, Phòng khám...).
*   **Booking Manager:** Giao diện trực quan thống kê danh sách khách đã đặt lịch.
*   **Phát hiện trùng lịch (Conflict Resolution):** Hệ thống tự kiểm tra giờ trống, chặn lỗi đặt trùng slot.
*   **Cấu hình nhắc hẹn:** Một checkbox cho phép AI tự động nhắn tin nhắc lịch cho khách trước `X giờ`.

### 4.5 Màn hình Giao vận & Báo giá (Shipping - `/admin/shipping`)
Kết nối hệ thống chat nội bộ với các đơn vị giao hàng như GHN, GHTK.
*   **Shipping Manager:** Phân tích một câu chat liền mạch của khách (vd: *123 Lê Lợi, Q1, HCM*) và chuẩn hóa thành dữ liệu địa lý cấp 4.
*   **Bảng giá thời gian thực:** Gọi sang Adapter của các đơn vị ship lấy báo giá, hiện chi phí vận chuyển minh bạch để người dùng chốt với khách.

### 4.6 Màn hình Workflow Đơn hàng (Orders - `/admin/orders`)
Giải pháp CRM-lite linh hoạt hơn là một OMS đồ sộ:
*   **Order Kanban:** Giao diện cột kéo-thả với các luồng trạng thái chuẩn hóa: `Wait Pay` -> `Paid` -> `Processing` -> `Done`.
*   **Thống kê:** Thẻ Order nhỏ gọn với `Mã số`, `Tên khách` và `Tổng tiền`, theo sát vòng đời đơn từ bối cảnh chat.

### 4.7 VClaw Token & Tự Động Hóa (Zalo User - `/admin/zalouser`)
Nơi quản lý "linh hồn" kỹ thuật của hệ thống nhưng được trình bày theo ngôn ngữ kinh doanh:
*   **Bot Zalo:** Theo dõi trạng thái kết nối, quét mã QR để đăng nhập và quản lý phiên làm việc của Agent.
*   **Automation (Tự động hóa):** Cấu hình các quy trình như tự động trả lời, follow-up khách hàng cũ, quản lý hàng đợi công việc tự động (Automation Queue) và các chiến dịch marketing.
*   **Settings:** Thiết lập cá nhân hóa Agent, chọn Prompt Persona và cấu hình các Adapter thanh toán/giao vận.

---

## 5. Quy Trình Kiến Trúc Lập Trình Frontend Đề Xuất (Tech Stack)

Để thiết kế được các Wireframe như Mockup hiện đại ở bên trên, chúng ta cần:

1. **Framework:** Next.js 14/15 (App Router). Giúp code Frontend tĩnh có thể tự liên kết bằng API routes với local files.
2. **UI Library:** Tailwind CSS + Shadcn UI (Rất tốt cho việc làm các Dashboard component với Glassmorphism hoặc Card layout).
3. **State Management:** Zustand (gọn nhẹ hơn Redux để giữ trạng thái đơn hàng).
4. **Data Sync:** Đọc trực tiếp từ file `workspace.json` và `local.db` do engine OpenClaw core ghi ra.

> [!IMPORTANT]  
> Các tác vụ trên UI không nên chọc thẳng vào Database để sửa trạng thái. UI chỉ nên gửi `Events` xuống OpenClaw Gateway. Ví dụ: Khi người dùng bấm [Duyệt Bill], Web UI gửi sự kiện `USER_APPROVED_BILL_ID_1` bằng Websocket, sau đó Workflow Orchestrator của OpenClaw Core sẽ lo mọi việc (Cập nhật DB, Báo Agent phản hồi khách). Mô hình này giúp chia tách hoàn toàn giữa UI và Tầng xử lý Logic.
