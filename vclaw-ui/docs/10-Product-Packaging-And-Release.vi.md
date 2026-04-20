# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop (máy tính) hoàn chỉnh, giúp người dùng không có kiến thức kỹ thuật có thể sử dụng dễ dàng.

---

## 1. Kiến trúc ứng dụng Desktop (Browser-Native Shell)

VClaw Desktop được đóng gói như một **Trình duyệt Quản trị Nghiệp vụ**, bao gồm các thành phần:

- **Native Shell (Node.js + Playwright)**: Đóng vai trò là "App Shell" quản lý cửa sổ và điều phối vòng đời của các server. Sử dụng `playwright-chromium` để mở cửa sổ trình duyệt trỏ vào `http://localhost:12687`.
- **VClaw Business Dashboard (Next.js Standalone - Port 12687)**: Chạy như một server thực thụ, cho phép dùng Middleware để kiểm soát tương tác với OpenClaw.
- **OpenClaw Core Engine (Node.js - Port 18789)**: Chú trọng vào Agentic runtime và kết nối các kênh chat.

## 2. Quy trình Đóng gói (Packaging)

Dự án hiện tại bao gồm UI viết bằng Next.js (`vclaw-ui`) và Engine viết bằng OpenClaw (`core/openclaw`). Bản build Desktop sẽ bao gồm cả hai thành phần này chạy song song. Ứng dụng sẽ tự động đảm bảo port 12687 và 18789 sẵn sàng khi khởi động.

### Bước 1: Cấu hình Next.js Standalone Mode
Tệp `vclaw-ui/next.config.ts` được cấu hình `output: 'standalone'` để tối ưu hóa việc đóng gói:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
};
```
Khi chạy lệnh `npm run build`, Next.js sẽ tạo ra một thư mục tự vận hành tại `.next/standalone`, bao gồm toàn bộ code server và node_modules cần thiết. Điều này giúp giữ lại Middleware và Server Actions trong ứng dụng desktop.

### Script Đóng gói Tự động (Khuyên dùng)
Một script tự động đã được cung cấp tại thư mục gốc để xử lý toàn bộ quy trình đóng gói cô lập, bao gồm cả việc đổi tên thương hiệu:

```bash
bash scripts/package-vclaw.sh
```

### Bước 2: Build và Đóng gói
Quá trình build sẽ tạo ra thư mục Standalone để Native Shell có thể khởi chạy:

```bash
bash scripts/package-vclaw.sh
```

Script này thực hiện các bước:
1. Build `vclaw-ui` với export tĩnh.
2. Inject kết quả vào `dist/control-ui` của core.
3. Sao chép `openclaw.json` hiện tại làm mẫu cấu hình (`openclaw.json.template`).
4. Đóng gói ứng dụng macOS và tạo file `.dmg`.

Kết quả bản build phát hành sẽ được đặt tại `build/vclaw-desktop/dist/VClaw.app` và file cài `.dmg` tương ứng.

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
