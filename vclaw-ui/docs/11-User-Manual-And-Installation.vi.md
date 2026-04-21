# 🚀 Hướng dẫn Sử dụng và Cài đặt VClaw Business Dashboard

Chào mừng bạn đến với **VClaw** - Trợ lý AI chuyên nghiệp dành riêng cho người bán hàng online (SMB). 

> [!IMPORTANT]
> **Lưu ý Quan trọng:**
> - Trang web [https://vclaw.space](https://vclaw.space) chỉ là trang thông tin giới thiệu sản phẩm.
> - Hệ thống VClaw vận hành **hoàn toàn trên máy tính cá nhân (Local)** của bạn để đảm bảo tốc độ và bảo mật dữ liệu tuyệt đối.

---

## 1. 📥 Cài đặt và Truy cập

VClaw được thiết kế để cài đặt trực tiếp trên máy tính của bạn:

### Cài đặt Bản Desktop (Dành cho máy Mac)
1. Tải bản cài đặt `VClawInstaller.pkg`.
2. Mở file và làm theo hướng dẫn để cài đặt vào thư mục **Applications** (Ứng dụng).
3. **Khởi chạy ứng dụng:** Mở **VClaw** từ Launchpad hoặc thư mục Applications. Giao diện quản trị sẽ tự động hiện ra để bạn bắt đầu làm việc ngay lập tức.

### Cửa sổ desktop bị kẹt ở màn hình lỗi

Bản cài `.pkg` trên Mac mở VClaw trong **Electron** (không phải trình duyệt đầy đủ), nên không có thanh địa chỉ. Nếu chỉ thấy thông báo kiểu “không tải được màn hình” / lỗi server:

- Dùng các nút **Thử lại / Về màn hình chính / Thoát** trên màn hình phục hồi của VClaw (khi tải màn hình thất bại hoặc renderer crash).
- Hoặc dùng menu: **Điều hướng** → **Tải lại**, **Về màn hình chính** (phím tắt **Cmd+Shift+H**), **Quay lại** / **Tiến**.
- Thoát hẳn ứng dụng: **VClaw** → **Thoát VClaw** (hoặc **Cmd+Q**).

---

## 2. 🧠 Kích hoạt "Bộ não AI" (Ollama Cloud)

VClaw sử dụng ứng dụng **Ollama** để cung cấp năng lượng cho các tính năng AI (như đọc ảnh sản phẩm, phân tích đơn hàng).

### Bước 1: Mở ứng dụng Ollama
- Đảm bảo bạn đã cài đặt Ollama (tải tại [ollama.com](https://ollama.com/)).
- Khi Ollama chạy, bạn sẽ thấy biểu tượng hình con lạc đà trên thanh Menu phía trên cùng màn hình.

### Bước 2: Đăng nhập (Signin)
Đây là bước bắt buộc để kết nối máy tính của bạn với dịch vụ AI Cloud mạnh mẽ:
1. Nhấn **Command + Space** và gõ `Terminal`, sau đó nhấn **Enter**.
2. Copy và dán dòng lệnh sau vào cửa sổ hiện ra, rồi nhấn **Enter**:
   ```bash
   ollama signin
   ```
3. Một trang web sẽ tự động mở ra. Bạn hãy chọn **Đăng nhập** và nhấn nút **Authorize** để xác nhận.

![Hướng dẫn đăng nhập Ollama](/assets/ollama-guidance.png)
*(Hình ảnh: Cách gõ lệnh và xác nhận trên trình duyệt)*

---

## 3. 📦 Các Tính năng Chính cho Người bán

### 3.1 📥 Hộp thư Tác vụ (AI Inbox)
- AI sẽ tự động đọc tin nhắn từ khách hàng và phân loại các yêu cầu quan trọng vào Dashboard để bạn xử lý.

### 3.2 🏷️ Tự động hóa Sản phẩm (Product Manager)
- **Bóc tách từ ảnh:** Tải ảnh sản phẩm lên, AI sẽ tự động trích xuất Tên, Giá và Mô tả.
- **Tạo nội dung quảng cáo:** AI viết sẵn bài đăng Facebook/Zalo dựa trên thông tin sản phẩm.

### 3.3 📋 Quản lý Đơn hàng (Order Kanban)
- Quản lý trạng thái đơn hàng: **Chờ thanh toán -> Đã thanh toán -> Đang giao -> Hoàn tất**.
- Giao diện kéo thả dễ dùng như các thẻ nhớ (Sticky notes).

---

## 4. 🔒 Bảo mật & Dữ liệu

Vì hệ thống chạy tại **Local-first**:
- Dữ liệu khách hàng và đơn hàng nằm nguyên trên máy tính của bạn, không gửi đi đâu khác.
- AI Cloud chỉ hỗ trợ việc "suy nghĩ" và xử lý tác vụ, không lưu trữ thông tin cá nhân của bạn trên máy chủ.

---
> [!TIP]
> Bạn chỉ cần thực hiện bước **Đăng nhập Ollama** một lần duy nhất. Sau đó, mỗi khi mở máy, VClaw sẽ luôn sẵn sàng hỗ trợ bạn.
