# Cơ chế Khởi chạy VClaw Desktop (Electron & Next.js)

Tài liệu này phân tích chi tiết cách thức VClaw Desktop khởi động, các thành phần tham gia và luồng xử lý kỹ thuật từ lúc người dùng mở ứng dụng cho đến khi màn hình UI xuất hiện.

---

## 1. Kiến trúc Tổng quan (Architecture)

VClaw sử dụng mô hình **Hybrid Desktop App**:
- **Backend/UI Engine**: Next.js được build ở chế độ `standalone`. Đây là lõi xử lý toàn bộ logic nghiệp vụ, API, và giao diện web.
- **Desktop Shell**: Electron đóng vai trò là một "vỏ bọc" mỏng (thin shell). Electron không chứa logic nghiệp vụ mà chỉ chịu trách nhiệm hiển thị cửa sổ trình duyệt và tương tác với các tính năng của hệ điều hành (Menu, Dock, File System).

Sự kết hợp này cho phép tận dụng sức mạnh của Next.js (Middleware, Server Actions, SSR) trong một môi trường Desktop chuyên nghiệp.

---

## 2. Các Thành phần Chính (Key Components)

| Thành phần | Vị trí (trong gói `.app`) | Vai trò |
| :--- | :--- | :--- |
| **Native Entry** | `Contents/MacOS/vclaw` | Điểm khởi đầu. Một script Bash tìm kiếm Node.js trên hệ thống và gọi Launcher. |
| **Logic Launcher** | `Contents/Resources/launcher/main.js` | "Nhạc trưởng" điều phối: Kiểm tra instance, tìm cổng (port), chạy Server Next.js và mở Electron. |
| **Next.js Server** | `Contents/Resources/app/server.js` | Server sản xuất của Next.js (được sinh ra từ lệnh `next build`). |
| **Electron Shell** | `Contents/Resources/launcher/electron-main.cjs` | Cấu hình cửa sổ Electron, Branding (icon, title) và Menu hệ thống. |
| **OpenClaw Gateway** | Tích hợp qua môi trường | Launcher tự động cấu hình các biến môi trường để UI kết nối với OpenClaw Gateway. |

---

## 3. Luồng Khởi chạy Chi tiết (Startup Sequence)

Quy trình khởi động diễn ra qua 5 bước chính:

### Bước 1: Kích hoạt Entry Point
Khi người dùng mở `VClaw.app`, hệ điều hành thực thi file nhị phân `Contents/MacOS/vclaw`. Script này sẽ:
1. Tìm kiếm Node.js (từ PATH hoặc các đường dẫn phổ biến như `/opt/homebrew/bin/node`).
2. Nếu không thấy Node.js, hiển thị cảnh báo yêu cầu cài đặt.
3. Chạy lệnh: `node Contents/Resources/launcher/main.js`.

### Bước 2: Kiểm tra Đơn thực thể (Single Instance)
`main.js` kiểm tra file lock tại `~/.vclaw-next.lock`:
- Nếu ứng dụng đã chạy: Focus vào cửa sổ cũ và thoát tiến trình mới.
- Nếu chưa chạy: Tạo file lock mới chứa `PID` và `Port`.

### Bước 3: Chuẩn bị Môi trường & Khởi động Server Next.js
1. **Tìm cổng trống**: Tìm cổng khả dụng bắt đầu từ `12687`.
2. **Cấu hình OpenClaw**: Đọc cấu hình từ `~/.openclaw/openclaw.json` để lấy Token và URL của Gateway.
3. **Spawn Server**: Khởi động `server.js` của Next.js dưới dạng tiến trình con (child process). Toàn bộ log của Server được gắn prefix `[next]` để dễ theo dõi.
4. **Health Check**: Launcher thực hiện poll (kiểm tra định kỳ) cổng đã chọn cho đến khi Server phản hồi (thường mất < 1 giây).

### Bước 4: Khởi chạy Shell Electron
Sau khi Server Next.js đã sẵn sàng:
1. Launcher khởi động tiến trình Electron, nạp file `electron-main.cjs`.
2. Truyền tham số `VCLAW_URL` (ví dụ: `http://127.0.0.1:12687`) qua biến môi trường.
3. Electron tạo cửa sổ (BrowserWindow), cấu hình Branding (Icon VClaw, Title) và tải URL từ Server nội bộ.

### Bước 5: Duy trì & Đóng ứng dụng (Graceful Shutdown)
- Launcher theo dõi cả hai tiến trình (Next.js và Electron).
- Nếu người dùng đóng cửa sổ Electron hoặc thoát ứng dụng: Launcher nhận tín hiệu, thực hiện gửi `SIGTERM` để tắt sạch Server Next.js và xóa file lock trước khi kết thúc hoàn toàn.

---

## 4. Quản lý Dữ liệu & Phiên làm việc (Data Management)

- **User Data**: Electron được cấu hình lưu dữ liệu (Cookie, LocalStorage, Cache) tại:
  - macOS: `~/Library/Application Support/VClaw/ShellElectron`
  - Windows: `%APPDATA%\VClaw\ShellElectron`
- **Database**: SQLite (`business.sqlite`) được Next.js quản lý tại thư mục dữ liệu ứng dụng của người dùng, không nằm trong gói `.app` để tránh mất dữ liệu khi cập nhật ứng dụng.

---

## 5. Xử lý Lỗi (Error Handling)

- **Recovery Page**: Nếu Server Next.js gặp sự cố hoặc không thể tải trang, Electron sẽ hiển thị một trang cứu hộ (Recovery Page) tích hợp sẵn trong `electron-main.cjs`. Người dùng có thể chọn "Thử lại" hoặc "Về màn hình chính".
- **Port Conflict**: Nếu cổng mặc định bị chiếm, hệ thống tự động tìm một cổng ngẫu nhiên khác, đảm bảo ứng dụng luôn khởi động thành công.

---
*Tài liệu này được cập nhật lần cuối vào tháng 05/2026 bởi Antigravity.*
