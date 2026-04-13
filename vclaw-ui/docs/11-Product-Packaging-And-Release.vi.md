# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop (máy tính) hoàn chỉnh, giúp người dùng không có kiến thức kỹ thuật có thể sử dụng dễ dàng.

---

## 1. Kiến trúc ứng dụng Desktop

VClaw Desktop được xây dựng dựa trên kiến trúc của OpenClaw, bao gồm 3 lớp chính:
- **Native Host (Swift)**: Phụ trách cửa sổ ứng dụng trên macOS, quản lý vòng đời và menu hệ thống.
- **UI Layer (Next.js)**: Chính là `vclaw-ui`, được đóng gói thành tài nguyên tĩnh bên trong ứng dụng.
- **Agent Engine (Node.js)**: Lõi xử lý agentic nằm trong `core/openclaw`, chạy dưới nền (daemon) để thực thi các tác vụ.

## 2. Quy trình Đóng gói (Packaging)

Để tạo ra bản phát hành `.app` hoặc `.dmg`, chúng ta sử dụng hệ thống script hiện có trong `core/openclaw/scripts`:

### Bước 1: Build UI & JS
Chạy lệnh build toàn bộ project để chuẩn bị các asset:
```bash
# Tại thư mục gốc vclaw
cd vclaw-ui && pnpm build && npm run export
cd ../core/openclaw && pnpm build
```

### Bước 2: Chạy script đóng gói Mac
Sử dụng script `package-mac-app.sh` đã được hiệu chỉnh cho VClaw:
```bash
./core/openclaw/scripts/package-mac-app.sh
```
Kết quả sẽ nằm tại: `dist/VClaw.app`

### Bước 3: Tạo File cài đặt (.dmg)
Sử dụng script `create-dmg.sh` để tạo bộ cài thuận tiện cho người dùng:
```bash
./core/openclaw/scripts/create-dmg.sh
```

---

## 3. Tùy biến Branding (VClaw)

Để chuyển đổi hoàn toàn từ OpenClaw sang VClaw, các vị trí sau cần được cập nhật:

| Vị trí | Tệp tin cần sửa | Mô tả |
| :--- | :--- | :--- |
| **Product Name** | `apps/macos/Sources/OpenClaw/Resources/Info.plist` | Đổi tên hiển thị ứng dụng. |
| **Bundle ID** | `core/openclaw/scripts/package-mac-app.sh` | Chỉnh thành `com.solana8800.vclaw`. |
| **Icon** | `apps/macos/Sources/OpenClaw/Resources/OpenClaw.icns` | Thay thế bằng logo VClaw mới. |

---

## 4. Cơ chế Cập nhật (Auto-Update)

VClaw sử dụng framework **Sparkle** để tự động kiểm tra và tải về bản cập nhật. 
- **Feed URL**: Được cấu hình trong `Info.plist` trỏ về server cập nhật của VClaw.
- **Release Channel**: Hỗ trợ các kênh `stable` và `beta`.

---

> [!TIP]
> **Hướng tiếp cận người dùng**: Đối với người dùng phổ thông, họ chỉ cần tải file `.dmg`, kéo vào thư mục `Applications` và mở lên. Toàn bộ hạ tầng Agent và UI sẽ tự khởi động mà không cần dùng đến Terminal.
