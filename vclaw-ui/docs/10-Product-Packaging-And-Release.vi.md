# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop (máy tính) hoàn chỉnh, giúp người dùng không có kiến thức kỹ thuật có thể sử dụng dễ dàng.

---

## 1. Kiến trúc ứng dụng Desktop (Browser-Native Shell)

VClaw Desktop được đóng gói như một **Trình duyệt Quản trị Nghiệp vụ**, bao gồm các thành phần:

- **Native Host (Swift/Electron)**: Đóng vai trò là "App Shell" quản lý cửa sổ và các Tab trình duyệt. Native Host chịu trách nhiệm khởi tạo các Tab (Headful) bằng Playwright hoặc Native WebView để người dùng tương tác với Shopee, Zalo, Facebook.
- **VClaw Dashboard Layer (Next.js)**: Tab mặc định khi mở ứng dụng, đóng vai trò là "Operations Console" (đã build tĩnh) để quản trị đơn hàng, cấu hình agent và duyệt tác vụ.
- **Agent Engine (Node.js)**: Chạy dưới dạng daemon, kết nối trực tiếp với các Tab trình duyệt thông qua CDP (Chrome DevTools Protocol) để quan sát và hỗ trợ người dùng ngay trên giao diện web của bên thứ ba.

## 2. Quy trình Đóng gói (Packaging)

Dự án hiện tại bao gồm UI viết bằng Next.js (`vclaw-ui`) và Engine viết bằng Node.js (`core/openclaw`). Để ứng dụng Desktop nhận diện đúng giao diện mới thay vì giao diện gốc của OpenClaw, chúng ta phải build tĩnh VClaw UI và ghi đè vào thư mục UI của OpenClaw trước khi tiến hành đóng gói.

### Bước 1: Cấu hình VClaw UI cho Static Export
Tệp `vclaw-ui/next.config.ts` sử dụng một biến môi trường để bật chế độ static export chỉ khi cần đóng gói sản phẩm:
```typescript
const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_EXPORT === "true" ? "export" : undefined,
};
```
Điều này cho phép quá trình phát triển local (npm run dev) vẫn diễn ra bình thường với các tính năng động, trong khi vẫn hỗ trợ xuất tệp tĩnh cho ứng dụng Desktop.

### Script Đóng gói Tự động (Khuyên dùng)
Một script tự động đã được cung cấp tại thư mục gốc để xử lý toàn bộ quy trình đóng gói cô lập, bao gồm cả việc đổi tên thương hiệu:

```bash
bash scripts/package-vclaw.sh
```

### Các bước Đóng gói Thủ công (Chi tiết)
Nếu bạn muốn thực hiện thủ công, hãy build VClaw UI với cờ export và chép mã nguồn vào thư mục build:

```bash
cd vclaw-ui
pnpm install
NEXT_PUBLIC_EXPORT="true" pnpm build

# Di chuyển các file vào build/vclaw-desktop/ (Cô lập với core)
# (Tham khảo scripts/package-vclaw.sh để biết chi tiết điều phối)
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
