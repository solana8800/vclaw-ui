# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop chuyên nghiệp (PKG) và cách phát hành trực tuyến qua GitHub.

---

## 1. Cơ chế Cài đặt Minh bạch (Installer Logic)

Bộ cài đặt của VClaw (.pkg) được thiết kế để hoạt động ổn định với 2 giai đoạn tự động:
- **Pre-install**: Dọn dẹp bản cũ và dừng các tiến trình đang chạy (cổng 12687).
- **Post-install**: Tự động cài đặt OpenClaw vào khu vực **User-space** (`~/.openclaw/runtime`). Quá trình này được thực hiện dưới quyền của User hiện hành (drop privileges) để đảm bảo không xảy ra lỗi phân quyền (EACCES) khi cài đặt các module mở rộng sau này. Đồng thời, tự động cấu hình LaunchAgent để khởi động Gateway ngầm.

> [!TIP]
> **Theo dõi tiến độ**: Nhấn phím tắt **`Cmd + L`** khi đang cài đặt để xem nhật ký tải xuống thời gian thực.

---

## 2. Quy trình Phát hành (Release Workflow)

Để phát hành một bản build mới lên GitHub, hãy tuân thủ các bước sau:

### Bước 1: Đăng nhập GitHub CLI (Lần đầu)
Bạn cần thực hiện lệnh này một lần duy nhất để máy tính có quyền truy cập vào kho lưu trữ:
```bash
gh auth login
```

### Bước 2: Build sản phẩm
Đảm bảo bạn đã có bản build sạch nhất trước khi phát hành:
```bash
bash scripts/package-vclaw.sh
```

### Bước 3: Đẩy bản phát hành sang Kho Công khai (vclaw-app)
Sử dụng kho riêng biệt để chứa bản build nhằm bảo mật mã nguồn:
```bash
# Lệnh tạo release sang repo vclaw-app (Public)
gh release create v0.1.0 vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg --repo solana8800/vclaw --title "VClaw Desktop v0.1.0" --notes "Bản phát hành Beta v0.1.0: VClaw Supper App cho bán hàng online."
```

---

## 3. Quy trình Nâng cấp & Bảo mật (Versioning & Security)

Để bảo vệ mã nguồn kinh doanh, VClaw sử dụng mô hình **Dual-Repo**:
1. **Repo Private (`vclaw`)**: Nơi bạn viết code và lưu trữ dữ liệu gốc. Tuyệt đối không tạo Release tại đây.
2. **Repo Public (`vclaw-app`)**: "Showroom" trưng bày sản phẩm. Chỉ chứa tệp cài đặt cho khách hàng.

**Các bước nâng cấp:**
1. Cập nhật `version` trong `vclaw-ui/package.json`.
2. Chạy `bash scripts/package-vclaw.sh`.
3. Chạy lệnh `gh release create` trỏ vào repo `--repo solana8800/vclaw-app`.

---

## 4. Lộ trình Tương lai (Future Roadmap)

### Cơ chế Tự động Cập nhật (Auto-update)
Bản 0.2.0 dự kiến sẽ có tính năng tự kiểm tra phiên bản:
- Ứng dụng khi mở lên sẽ tải file `version.json` từ GitHub.
- So sánh phiên bản cục bộ với phiên bản trên Server.
- Hiển thị thông báo yêu cầu người dùng nâng cấp nếu có bản mới.

### Hạ tầng Phát hành (Cloud Release)
- **GitHub Releases**: Kho lưu trữ chính thức.
- **Cloudflare R2**: Sử dụng để lưu trữ các tệp lớn và tăng tốc độ tải toàn cầu.
