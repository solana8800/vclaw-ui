# Hướng dẫn Sử dụng và Cài đặt VClaw Business Dashboard

Chào mừng bạn đến với **VClaw** - Giải pháp Operations Console tích hợp AI, giúp người bán hàng (SMB) quản lý kinh doanh, tự động hóa quy trình và tăng trưởng bền vững.

---

## 1. Phương thức Truy cập

Bạn có thể sử dụng VClaw theo hai cách chính:

### Cách 1: Sử dụng trực tiếp qua Web (Cloud)
- Truy cập địa chỉ: [https://vclaw.space](https://vclaw.space)
- Hỗ trợ đầy đủ các tính năng Dashboard, Quản lý Sản phẩm và Đơn hàng.
- Không cần cài đặt bất kỳ phần mềm nào trên máy tính.

### Cách 2: Cài đặt Standalone App (Dành cho macOS)
1. Tải bản cài đặt `VClawInstaller.pkg` từ Github hoặc trang phân phối.
2. Mở file và làm theo hướng dẫn để cài đặt vào thư mục **Applications**.
3. Khởi chạy ứng dụng: VClaw sẽ tự động khởi động **Business Dashboard** (cổng 12687) và **AI Engine** (cổng 18789) chạy ngầm.

---

## 2. Các Module Chính

### 2.1 Inbox & Task Center
- Nơi tập trung toàn bộ các yêu cầu từ khách hàng (Zalo, Messenger, Telegram).
- AI Agent sẽ tự động phân loại và đưa vào Hộp thư tác vụ (Task Inbox) để bạn xử lý nhanh nhất.

### 2.2 Quản lý Sản phẩm (AI-Powered Product Manager)
- **Tự động bóc tách**: Chỉ cần tải lên ảnh sản phẩm, AI sẽ tự động phân tích và trích xuất Tên, Giá, Mô tả và Danh mục.
- **Hỗ trợ Marketing**: AI gợi ý nội dung quảng cáo ngắn gọn nhưng hấp dẫn dựa trên thông tin sản phẩm.
- **Tiêu chuẩn hóa**: Lưu trữ danh mục sản phẩm tập trung để phục vụ các chiến dịch bán hàng tự động.

### 2.3 Quản lý Đơn hàng (Order Kanban)
- Quản lý quy trình bán hàng qua các trạng thái: **Chờ thanh toán -> Đã thanh toán -> Đang xử lý -> Hoàn tất**.
- Giao diện dạng thẻ (Kanban) kéo thả trực quan giúp bạn không bỏ lỡ bất kỳ đơn hàng nào.

### 2.4 Trợ lý AI (AiChatAssistant)
- Một biểu tượng chat luôn hiện diện ở góc màn hình.
- Bạn có thể hỏi AI về bất cứ vấn đề gì: Tra cứu đơn hàng, soạn tin nhắn trả lời khách hàng, hoặc nhờ AI tư vấn chiến dịch.

---

## 3. Trải nghiệm Zero-Onboarding

VClaw được thiết kế để bạn có thể bắt đầu ngay lập tức:
- **Cấu hình AI mặc định**: Hệ thống đã được tích hợp sẵn các mô hình AI mạnh mẽ (DeepSeek, Kimi). Bạn không cần phải biết API Key là gì để bắt đầu.
- **Sẵn sàng kết nối**: Khi chạy bản cài đặt, ứng dụng tự động thiết lập các cổng kết nối cục bộ (Port 18789) để UI và AI Engine giao tiếp trơn tru.

---

## 4. Dành cho Nhà phát triển (Advanced Users)

Nếu bạn muốn tùy chỉnh sâu hoặc chạy VClaw trong môi trường phát triển:
1. Đảm bảo đã cài đặt `Node.js` (v24+) và `pnpm`.
2. Chạy lệnh tại thư mục `vclaw-ui`:
   ```bash
   pnpm install
   pnpm dev
   ```
3. Truy cập [http://localhost:12687](http://localhost:12687).
4. Cấu hình biến môi trường trong file `.env` nếu bạn muốn sử dụng API Key riêng của mình.

---

## 5. Bảo mật & Dữ liệu

VClaw cam kết bảo mật dữ liệu kinh doanh của bạn. Toàn bộ logic xử lý đơn hàng và khách hàng được lưu trữ trong cơ sở dữ liệu cục bộ (`business.sqlite`). AI chỉ truy cập những dữ liệu cần thiết khi được yêu cầu để hỗ trợ bạn ra quyết định.

---
> [!TIP]
> Hãy tận dụng tính năng **Bóc tách Sản phẩm từ ảnh** để tiết kiệm 80% thời gian nhập liệu danh mục hàng hóa!
