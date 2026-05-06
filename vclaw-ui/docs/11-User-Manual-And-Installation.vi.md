# 🚀 Hướng dẫn Sử dụng và Cài đặt VClaw Business Dashboard
## Để VClaw đồng hành cùng sự tăng trưởng kinh doanh của bạn

Chào mừng bạn đến với **VClaw** - Trợ lý AI chuyên nghiệp dành riêng cho người bán hàng online (Social Commerce). VClaw giúp bạn tự động hóa các tác vụ tẻ nhạt để bạn tập trung vào việc bùng nổ doanh số.

> [!IMPORTANT]
> **Quyền riêng tư là ưu tiên số 1:**
> - VClaw vận hành **hoàn toàn trên máy tính cá nhân (Local)** của bạn. 
> - Mọi dữ liệu khách hàng, đơn hàng và tin nhắn đều được lưu trữ an toàn tại máy của bạn, không bị đẩy lên đám mây của bên thứ ba.

---

## 1. 📥 Cài đặt và Truy cập

VClaw được thiết kế để cài đặt nhanh chóng và sử dụng ngay lập tức:

### Cài đặt Bản Desktop (Dành cho máy Mac)
1. Tải bản cài đặt `VClawInstaller.pkg`.
2. Mở file và làm theo hướng dẫn để cài đặt vào thư mục **Applications** (Ứng dụng).
3. **Khởi chạy ứng dụng:** Mở **VClaw** từ Launchpad. Giao diện quản lý kinh doanh sẽ hiện ra để bạn bắt đầu làm việc.

### Xử lý khi gặp lỗi hiển thị
Nếu màn hình ứng dụng không tải được nội dung (do mất kết nối hoặc khởi động chưa xong):
- Sử dụng nút **Thử lại** hoặc **Về màn hình chính** ngay trên màn hình ứng dụng.
- Hoặc dùng phím tắt **Cmd + Shift + H** để quay về Dashboard chính.
- Để khởi động lại hoàn toàn, hãy Thoát ứng dụng (**Cmd + Q**) và mở lại.

---

## 2. 🧠 Kích hoạt Năng lực AI (VClaw AI Assistant)

Để VClaw có thể tư vấn và hỗ trợ bạn tốt nhất, bạn cần thực hiện bước "Kết nối AI" một lần duy nhất.

### Bước 1: Khởi động công cụ kết nối
1. Đóng ứng dụng VClaw nếu đang mở.
2. Mở **Terminal** (Tìm trong Launchpad) và copy-paste lệnh sau rồi nhấn Enter:
   ```bash
   /Applications/VClaw.app/Contents/Resources/vclaw.sh
   ```
   Nếu runtime OpenClaw chưa được bung trong bước cài đặt, công cụ này sẽ tự cài lại từ gói kèm VClaw trước khi mở trình duyệt.

### Bước 2: Xác thực với Trợ lý AI
Công cụ sẽ mở một cửa sổ trình duyệt an toàn. Bạn chỉ cần đăng nhập vào tài khoản AI của mình (ChatGPT, Gemini hoặc Claude). Sau khi đăng nhập thành công, hãy quay lại Terminal và nhấn **Enter**. 

*VClaw sẽ tự động học cách làm việc cùng tài khoản AI này để hỗ trợ bạn mà không tốn thêm chi phí API.*

---

## 3. 📦 Các Tính năng Chìa khóa cho Kinh doanh

### 3.1 📥 Khách hàng & Hội thoại (CRM-lite)
- **Hợp nhất hội thoại:** Tự động nhận diện và gom tin nhắn từ Zalo, Telegram vào một nơi.
- **Hộp thư tác vụ (Task Inbox):** AI sẽ tự động phân loại các yêu cầu quan trọng (kiểm bill, chốt đơn, nhắc lịch) và hiển thị ngay đầu trang để bạn duyệt nhanh.

### 3.2 🏷️ Quản lý Sản phẩm & Marketing AI
- **Số hóa sản phẩm:** Chỉ cần gửi ảnh sản phẩm, AI sẽ trích xuất Tên, Giá và Mô tả.
- **Trợ lý Marketing:** Tự động soạn bài đăng, caption hấp dẫn cho từng sản phẩm để bạn đăng lên mạng xã hội.

### 3.3 📋 Đơn hàng & Thanh toán tự động
- **Theo dõi Kanban:** Quản lý đơn hàng trực quan qua các trạng thái: **Chờ thanh toán -> Đã thanh toán -> Đang giao -> Hoàn tất**.
- **VietQR định danh:** Tự động tạo mã QR kèm số tiền và nội dung đơn để khách chuyển khoản chính xác 100%.
- **Đối soát tự động:** AI nhận diện ảnh bill và đối soát với đơn hàng để bạn xác nhận "đã nhận tiền" chỉ với 1 cú click.

---

## 4. 🔒 Bảo mật & Dọn dẹp

- **Sao lưu dữ liệu:** Mọi dữ liệu kinh doanh được lưu tại thư mục hệ thống của ứng dụng trên máy bạn. Bạn nên sao lưu định kỳ để đảm bảo an toàn.
- **Gỡ bỏ ứng dụng:** Nếu không còn nhu cầu sử dụng, hãy chạy lệnh sau trong Terminal để xóa sạch dữ liệu hệ thống:
  ```bash
  sudo /Applications/VClaw.app/Contents/Resources/uninstall-vclaw.sh
  ```

---
> [!TIP]
> Bạn chỉ cần kết nối AI một lần. Sau đó, mỗi khi mở VClaw, trợ lý AI sẽ luôn sẵn sàng phục vụ bạn 24/7.
