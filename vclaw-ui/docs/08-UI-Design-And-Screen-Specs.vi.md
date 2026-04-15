# Tài Liệu Đặc Tả Trải Nghiệm & Giao Diện VClaw (UI/UX Specifications)

Tài liệu này định nghĩa cấu trúc giao diện cho **Operations Console (Bàn làm việc số)** của VClaw, dựa trên chiến lược "chuyển đổi từ công cụ Kỹ thuật (Mission Control) sang công cụ Kinh doanh (CRM-lite)".

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

1. **Từ chối ngôn ngữ Dev-Ops:** Không có các khái niệm `Terminal`, `Tail Logs`, `Agent Memory`, `Cron Job` ở giao diện chính. Nếu có lỗi, AI sẽ tóm tắt lỗi bằng ngôn ngữ tự nhiên: *"Không quét được số tiền trên Bill khách hàng Phạm A"*.
2. **Giao diện sáng, hiện đại, thẩm mỹ cao:** SMB cần một không gian làm việc khiến họ cảm thấy nhẹ nhàng. Áp dụng phong cách tối giản (Minimalist), Glassmorphism (lớp kính mờ), góc bo tròn, màu sắc tương phản cao (sạch sẽ, độ tin cậy của ngân hàng).
3. **Quyền lực "Human-in-the-loop":** Các quyết định thay đổi trạng thái kinh doanh (nhận tiền, gửi hàng) AI chỉ đề xuất, con người bấm nút **[Duyệt]**.
4. **Chủ động nhưng có kiểm soát:** UI phải hỗ trợ content, follow-up, auto tư vấn và campaign draft, nhưng luôn cho người dùng nhìn thấy policy, queue duyệt và log hành động.

---

## 2. Hệ Thống Màn Hình Chính (Screen Map)

Kiến trúc ứng dụng Web sẽ được chia thành một Cột Navigation (Sidebar) bên trái và Nội dung bên phải, bao gồm các màn hình:

*   **Setup Wizard (Onboarding)** - Chỉ chạy lần đầu.
*   **Trang Chủ (Overview Dashboard)** - Thống kê nhanh và các việc khẩn cấp.
*   **Hộp Thư Tác Vụ (Task Inbox)** - Nơi AI trình các tác vụ cần người dùng thao tác.
*   **Trò Chuyện (Conversations)** - View gom kênh Zalo, Telegram...
*   **Đơn Hàng & Khách (Commerce)** - Mini CRM để theo dõi tiền và hàng.
*   **Chiến Dịch & Nội Dung (Campaigns / Content)** - Soạn bài, lên lịch, duyệt outbound.
*   **Thiết Lập (Settings)** - Đổi prompt, kết nối VietQR, cấu hình nhà vận chuyển như GHN/GHTK.

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

---

## 4. Phân Tích Tính Năng Của Từng Màn Hình (Screen Features Specification)

### Man hình 1: Tổng Quan (Dashboard)
*   **Top Metric Cards:**
    *   `Doanh thu VietQR hôm nay`: Dữ liệu cộng dồn từ các giao dịch hoặc phiếu đối soát đã được hệ thống xác thực.
    *   `Số lượng khách Chat`: (từ Social Channels).
    *   `Số đơn chưa xử lý`: Gộp từ AI inbox.
    *   `Lead cần follow-up`: Những lead hoặc khách cũ đang đến hạn nhắc lại.
    *   `Nội dung chờ duyệt`: Draft content hoặc campaign đang nằm trong queue duyệt.
*   **Center Panel (Cần xử lý ngay):** 
    *   Hiển thị theo luồng Feed (Time-line). AI sẽ đẩy các thẻ lên.
    *   *Tính năng:* Nút thao tác nhanh `[Duyệt]`, `[Từ chối]`, `[Xem chi tiết]`.

> [!TIP]
> Trong dashboard của VClaw, các cụm như `bill`, `hóa đơn`, `phiếu` nên được hiểu theo nghĩa chứng từ hoặc bản ghi đối soát phục vụ vận hành bán hàng, không phải hóa đơn điện tử/VAT.

### Màn hình 2: Hộp Thư Tác Vụ (Human-in-the-loop Inbox)
Đây là "trái tim" của sự khác biệt VClaw. Không bắt chủ shop mở Chat để xem lại mớ bòng bong. AI sẽ tách các tác vụ ra đây.
*   **Loại Tác Vụ 1 - Duyệt Tiền (Verify Bill):** AI bóc tách được Bill chuyển khoản từ Khách gửi trong mxh. AI hiện thông tin "Số tiền 500k, Mã ĐH 1234". Nút: `[Xác nhận Nhận Tiền]` -> AI sẽ tự chat lại với khách "Dạ shop đã nhận được".
*   **Loại Tác Vụ 2 - Duyệt Đơn / Địa Chỉ:** Khách nhắn "Tòa A chung cư X". AI bắt được địa điểm, đưa ra form chuẩn hóa. Nút: `[Lên Đơn & Báo Phí Ship]`.

### Màn hình 3: Khách Hàng & Đơn Hàng (CRM Mini)
*   Hiển thị danh sách khách hàng tự động được gắn Tag (vd: `Khách sỉ`, `Đã Boom hàng` do AI tự tag text).
*   Giao diện kiểu bảng (Bảng Data-table) có thanh tìm kiếm và bộ lọc trạng thái.

### Màn hình 4: Chiến Dịch & Nội Dung (Growth Workspace)
*   **Content Drafts:** AI gợi ý caption, bài đăng, biến thể theo từng kênh.
*   **Campaign Queue:** Người dùng xem các chiến dịch nháp, lịch đăng, nội dung follow-up và quyết định `[Duyệt]`, `[Sửa]`, `[Hoãn]`.
*   **Automation Guardrail:** Hiển thị rõ tần suất, channel policy và trạng thái auto-send hay chỉ draft.
*   **Hiệu quả nhanh:** Snapshot nhẹ như số bài đã duyệt, số follow-up đã gửi, số lead quay lại.

### Màn hình 5: Thiết Lập Cửa Hàng (Settings & Channels)
*   **Kênh Giao Tiếp:** Quét QR để đăng nhập Zalo OA / Telegram Bot.
*   **Dạy AI (AI Persona):** Giao diện text-area thả chữ tự do: "Shop tôi bán giày, luôn vui vẻ báo giá sale 20%...". AI sẽ dịch đoạn chữ này và chèn thành System Prompt dưới Core.
*   **Cấu hình Plugin:** Điền thông tin GHN/GHTK/Ahamove (nếu có), ưu tiên theo mô hình adapter để sau này có thể thêm nhà vận chuyển khác mà không đổi UX chính.
*   **Policy bán hàng và automation:** Thiết lập rule cho auto tư vấn, follow-up, frequency limit, approval requirement theo từng kênh.

---

## 5. Quy Trình Kiến Trúc Lập Trình Frontend Đề Xuất (Tech Stack)

Để thiết kế được các Wireframe như Mockup hiện đại ở bên trên, chúng ta cần:

1. **Framework:** Next.js 14/15 (App Router). Giúp code Frontend tĩnh có thể tự liên kết bằng API routes với local files.
2. **UI Library:** Tailwind CSS + Shadcn UI (Rất tốt cho việc làm các Dashboard component với Glassmorphism hoặc Card layout).
3. **State Management:** Zustand (gọn nhẹ hơn Redux để giữ trạng thái đơn hàng).
4. **Data Sync:** Đọc trực tiếp từ file `workspace.json` và `local.db` do engine OpenClaw core ghi ra.

> [!IMPORTANT]  
> Các tác vụ trên UI không nên chọc thẳng vào Database để sửa trạng thái. UI chỉ nên gửi `Events` xuống OpenClaw Gateway. Ví dụ: Khi người dùng bấm [Duyệt Bill], Web UI gửi sự kiện `USER_APPROVED_BILL_ID_1` bằng Websocket, sau đó Workflow Orchestrator của OpenClaw Core sẽ lo mọi việc (Cập nhật DB, Báo Agent phản hồi khách). Mô hình này giúp chia tách hoàn toàn giữa UI và Tầng xử lý Logic.
