# 🚀 Hướng dẫn Sử dụng và Cài đặt VClaw Business Dashboard

Chào mừng bạn đến với **VClaw** - Trợ lý AI chuyên nghiệp dành riêng cho người bán hàng online (SMB). Hệ thống này sẽ giúp bạn tự động hóa việc quản lý đơn hàng, bóc tách sản phẩm và chăm sóc khách hàng một cách thông minh nhất.

---

## 1. 📥 Cấu trúc và Cài đặt

Bạn có thể sử dụng VClaw linh hoạt theo 2 cách dưới đây:

### Cách 1: Sử dụng trực tiếp qua Web (Nhanh & Tiện)
- **Địa chỉ:** [https://vclaw.space](https://vclaw.space)
- **Ưu điểm:** Không cần cài đặt, dùng được ngay trên mọi trình duyệt.
- Hỗ trợ đầy đủ các tính năng: Dashboard, Quản lý Sản phẩm và Đơn hàng.

### Cách 2: Cài đặt Bản Desktop (Dành cho máy Mac)
1. Tải bản cài đặt `VClawInstaller.pkg`.
2. Mở file và kéo vào thư mục **Applications** (Ứng dụng).
3. **Kích hoạt Bộ não AI:** Đây là bước quan trọng nhất để AI có thể làm việc (xem chi tiết ở Mục 2).

---

## 2. 🧠 Kích hoạt "Bộ não AI" (Ollama Cloud)

Để VClaw có thể "hiểu" và xử lý được các yêu cầu phức tạp của bạn (như đọc ảnh sản phẩm, viết bài quảng cáo), bạn cần kích hoạt bộ não AI thông qua ứng dụng **Ollama**.

### Bước 1: Tải và Mở Ollama
- Tải ứng dụng tại: [ollama.com](https://ollama.com/)
- Sau khi tải về, hãy mở ứng dụng. Bạn sẽ thấy một biểu tượng nhỏ hình con lạc đà ở thanh Menu phía trên cùng của màn hình Mac.

### Bước 2: Đăng nhập (Signin) - Chỉ thực hiện 1 lần duy nhất
Đừng lo lắng, bước này rất đơn giản:
1. Nhấn tổ hợp phím **Command + Space** (Dấu cách) và gõ chữ `Terminal`, sau đó nhấn **Enter**.
2. Một cửa sổ màu đen sẽ hiện ra. Bạn hãy copy dòng chữ dưới đây, dán vào cửa sổ đó và nhấn **Enter**:
   ```bash
   ollama signin
   ```
3. Máy tính sẽ tự động mở trình duyệt web. Bạn chỉ cần chọn **Đăng nhập** (hoặc đăng ký tài khoản mới) và nhấn nút **Authorize** (Cho phép).

![Minh họa đăng nhập Ollama](https://raw.githubusercontent.com/solana8800/vclaw/main/assets/ollama-signin-guide.png)
*(Hình ảnh minh họa: Cửa sổ Terminal và nút bấm Authorize trên web)*

**Chúc mừng!** Bây giờ bộ não AI của bạn đã sẵn sàng phục vụ. Bạn có thể đóng cửa sổ Terminal lại và bắt đầu dùng VClaw.

---

## 3. 📦 Các Tính năng Chính dành cho Người bán

### 3.1 📥 Hộp thư Tác vụ (Inbox)
- AI sẽ tự động đọc tin nhắn từ Zalo, Facebook và đưa về đây.
- Bạn không cần phải duyệt hàng nghìn tin nhắn rời rạc, AI sẽ lọc ra những yêu cầu quan trọng nhất (như đặt hàng, hỏi giá).

### 3.2 🏷️ Tự động hóa Sản phẩm (Product Manager)
- **Bóc tách thần tốc:** Bạn chỉ cần chụp ảnh sản phẩm và tải lên. AI sẽ tự điền Tên, Giá, Mô tả giúp bạn.
- **Viết bài bán hàng:** AI gợi ý nội dung quảng cáo dựa trên chính ảnh bạn vừa chụp.

### 3.3 📋 Bảng điều khiển Đơn hàng (Kanban)
- Quản lý đơn hàng như các thẻ nhớ: **Chờ duyệt -> Đang giao -> Hoàn tất**.
- Kéo thả đơn giản để thay đổi trạng thái, giúp bạn không bao giờ bỏ sót đơn hàng nào của khách.

---

## 4. 🔒 Bảo mật và Riêng tư

VClaw được thiết kế theo tiêu chuẩn **Local-first**. Điều này có nghĩa là:
- Dữ liệu đơn hàng và khách hàng nằm an toàn trên máy tính của bạn.
- AI Cloud chỉ được sử dụng để "suy nghĩ" và xử lý các tác vụ phức tạp, không lưu trữ dữ liệu cá nhân của bạn trên máy chủ bên ngoài.

---
> [!TIP]
> Nếu bạn thấy AI trả lời chậm hoặc cần hỗ trợ cấu hình sâu hơn, hãy liên hệ đội ngũ hỗ trợ qua nút **Support** ngay trong Dashboard!
