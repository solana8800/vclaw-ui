# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop (máy tính) hoàn chỉnh, giúp người dùng không có kiến thức kỹ thuật có thể sử dụng dễ dàng.

---

## 1. Kiến trúc ứng dụng Desktop

VClaw Desktop được xây dựng dựa trên kiến trúc của OpenClaw, bao gồm 3 lớp chính:
- **Native Host (Swift)**: Phụ trách cửa sổ ứng dụng trên macOS, quản lý vòng đời và menu hệ thống.
- **UI Layer (Next.js)**: Chính là `vclaw-ui`, được đóng gói thành tài nguyên tĩnh bên trong ứng dụng.
- **Agent Engine (Node.js)**: Lõi xử lý agentic nằm trong `core/openclaw`, chạy dưới nền (daemon) để thực thi các tác vụ.

Trong bối cảnh định hướng sản phẩm mới, lớp UI này không chỉ là nơi vận hành đơn hàng và tác vụ nội bộ, mà còn phải sẵn sàng phục vụ các surface như `Campaigns / Content`, `Task Inbox`, `Commerce`, và các policy screen cho growth automation có kiểm soát.

## 2. Quy trình Đóng gói (Packaging)

Dự án hiện tại bao gồm UI viết bằng Next.js (`vclaw-ui`) và Engine viết bằng Node.js (`core/openclaw`). Để ứng dụng Desktop nhận diện đúng giao diện mới thay vì giao diện gốc của OpenClaw, chúng ta phải build tĩnh VClaw UI và ghi đè vào thư mục UI của OpenClaw trước khi tiến hành đóng gói.

### Bước 1: Cấu hình VClaw UI cho Static Export
Bảo đảm rằng file `vclaw-ui/next.config.ts` đã bật cờ `output: 'export'`:
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  // Các cấu hình khác...
};
```

### Bước 2: Build UI và chuyển file
Chạy lệnh build VClaw UI và chép toàn bộ source đã build tĩnh (`out/`) qua thư mục gốc của OpenClaw để chuẩn bị đóng gói:
```bash
# Đi vào thư mục UI và build
cd vclaw-ui
pnpm install
pnpm build

# Xóa UI cũ của OpenClaw và chép UI mới sang
rm -rf ../core/openclaw/dist/control-ui
mkdir -p ../core/openclaw/dist/control-ui
cp -R out/* ../core/openclaw/dist/control-ui/
```

### Bước 3: Chạy script đóng gói Mac
Di chuyển sang thư mục Core để tiếp tục quy trình build app macOS. Lưu ý BẮT BUỘC phải truyền biến môi trường `SKIP_UI_BUILD=1` để OpenClaw không tự động build lại giao diện kỹ thuật cũ đè lên VClaw UI.
```bash
cd ../core/openclaw
pnpm install
pnpm build

# Tạo file VClaw.app
SKIP_UI_BUILD=1 ./scripts/package-mac-app.sh

# Tạo file vài đặt .dmg
SKIP_UI_BUILD=1 ./scripts/create-dmg.sh
```
Kết quả bản build phát hành sẽ được đặt tại `core/openclaw/dist/VClaw.app` và file cài `.dmg` tương ứng.

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
> **Hướng tiếp cận người dùng**: Đối với người dùng phổ thông, họ chỉ cần tải file `.dmg`, kéo vào thư mục `Applications` và mở lên. Toàn bộ hạ tầng Agent và UI sẽ tự khởi động mà không cần dùng đến Terminal, mở ra một `Operations Console` có thể phục vụ cả vận hành lẫn các workflow tăng trưởng như content draft, follow-up và queue duyệt.
