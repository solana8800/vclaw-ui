# Hướng dẫn Cài đặt và Sử dụng VClaw Desktop (Dành cho Người dùng)

Chào mừng bạn đến với **VClaw** - Trợ lý AI giúp người bán online vừa tăng trưởng doanh thu vừa vận hành hằng ngày. Hướng dẫn này sẽ giúp bạn cài đặt và bắt đầu sử dụng VClaw chỉ trong vài phút.

---

## 1. Cài đặt trên macOS

VClaw được tối ưu hóa cho macOS (Intel và Apple Silicon).

### Bước 1: Tải về và Cài đặt
1. Tải file `VClawInstaller.dmg` từ trang web chính thức hoặc Github.
2. Mở file `.dmg` vừa tải về.
3. Kéo biểu tượng **VClaw** vào thư mục **Applications** (Ứng dụng).

> [!IMPORTANT]
> **Tính năng độc lập (Standalone):** Bạn **không cần** cài đặt Node.js, Git, hay bất kỳ công cụ lập trình nào (như `npm i -g openclaw`) để sử dụng VClaw. Mọi thành phần cần thiết đã được đóng gói sẵn bên trong ứng dụng.

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

### Cách 1: Sử dụng Trình duyệt Quản trị VClaw (VClaw Browser)
- Mở ứng dụng VClaw từ thư mục Applications.
- Toàn bộ trải nghiệm sẽ diễn ra trong cửa sổ ứng dụng - đóng vai trò như một **Trình duyệt chuyên dụng**:
  - **Tab Dashboard**: Nơi bạn quản lý Hộp thư tác vụ (Task Inbox), Đơn hàng, Khách hàng và Chiến dịch nội dung.
  - **Tab Nền tảng (Omnichannel Tabs)**: Bạn có thể mở trực tiếp Shopee, Zalo, Facebook ngay trong VClaw. Agent sẽ luôn ở cạnh để hỗ trợ khi bạn đang thao tác trên các tab này.
  - **Agent Overlay**: Một thanh công cụ nhỏ luôn hiện diện trên các tab trình duyệt để giúp bạn quét mã QR, trích xuất địa chỉ hoặc soạn tin nhắn nhanh.

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
