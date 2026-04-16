# Hướng dẫn Cài đặt và Sử dụng VClaw Desktop (Dành cho Người dùng)

Chào mừng bạn đến với **VClaw** - Trợ lý AI giúp người bán online vừa tăng trưởng doanh thu vừa vận hành hằng ngày. Hướng dẫn này sẽ giúp bạn cài đặt và bắt đầu sử dụng VClaw chỉ trong vài phút.

---

## 1. Cài đặt trên macOS

VClaw được tối ưu hóa cho macOS (Intel và Apple Silicon).

### Bước 1: Tải về và Cài đặt
1. Tải file `VClaw-Installer.dmg` từ trang web chính thức hoặc Github.
2. Mở file `.dmg` vừa tải về.
3. Kéo biểu tượng **VClaw** vào thư mục **Applications** (Ứng dụng).

### Bước 2: Cấp quyền hệ thống
1. Lần đầu mở ứng dụng, nếu macOS hiển thị cảnh báo từ nhà phát triển chưa được xác minh, hãy vào **System Settings > Privacy & Security** và chọn **Open Anyway**.
2. VClaw sẽ yêu cầu các quyền sau:
   - **Notifications**: Để gửi thông báo khi Agent hoàn thành tác vụ.
   - **Accessibility**: (Tùy chọn) Để Agent có thể tương tác với các ứng dụng khác.

---

## 2. Thiết lập lần đầu (Onboarding)

Sau khi khởi chạy, VClaw sẽ hiển thị **Trình hướng dẫn thiết lập**:

### Bước 1: Kết nối AI (Gemini)
VClaw sử dụng bộ não từ Google Gemini.
1. Truy cập [Google AI Studio](https://aistudio.google.com/) để lấy API Key.
2. Dán mã Key vào ô cấu hình trong VClaw.

### Bước 2: Kết nối Kênh liên lạc (Telegram)
Để bạn có thể điều hành tác vụ, follow-up hoặc duyệt nội dung từ xa qua điện thoại:
1. Tạo một Bot Telegram mới qua `@BotFather`.
2. Lấy **Bot Token** và nhập vào VClaw.
3. Nhắn tin bất kỳ cho Bot của bạn để kích hoạt kết nối.

---

## 3. Cách sử dụng cơ bản

### Cách 1: Sử dụng Giao diện Dashboard
- Mở Dashboard bằng cách nhấp vào biểu tượng VClaw trên Thanh Menu (Menu Bar).
- Tại đây bạn có thể xem:
  - **Hộp thư tác vụ (Task Inbox)**: Các việc AI đang làm hoặc chờ bạn duyệt.
  - **Khách hàng & Đơn hàng (Commerce)**: Theo dõi trạng thái khách, đơn và follow-up cơ bản.
  - **Chiến dịch & Nội dung (Campaigns / Content)**: Xem content draft, lịch follow-up và các hành động outbound đang chờ duyệt.
  - **Báo cáo (Reports)**: Theo dõi doanh thu, tiến độ công việc và một số chỉ dấu tăng trưởng cơ bản.

### Cách 2: Ra lệnh qua Telegram (Điều khiển từ xa)
Bạn không cần mở máy tính vẫn có thể làm việc:
- Nhắn cho Bot: *"Hôm nay có bao nhiêu đơn hàng mới?"*
- Nhắn cho Bot: *"Soạn cho tôi một bài đăng khuyến mãi cuối tuần cho shop giày."*
- Nhắn cho Bot: *"Chuẩn bị tin nhắn follow-up cho các khách đã hỏi hôm qua nhưng chưa phản hồi."*
- AI sẽ tự động thực hiện và gửi kết quả về Telegram cho bạn.

---

## 4. Hỗ trợ và Cập nhật

- **Cập nhật tự động**: Khi có phiên bản mới, VClaw sẽ hiển thị thông báo. Hãy chọn **Install Update** để nhận các tính năng AI mới nhất.
- **Trợ giúp**: Nhắn tin `help` trong Bot Telegram hoặc nhấn vào nút **Support** trong ứng dụng.

---

> [!NOTE]  
> VClaw bảo mật mọi dữ liệu của bạn cục bộ. AI chỉ truy cập những thông tin mà bạn cho phép để thực hiện tác vụ được yêu cầu. Với các luồng growth như content, follow-up hoặc auto tư vấn, hệ thống ưu tiên cơ chế `draft + duyệt + policy` thay vì tự động gửi đi không kiểm soát.
