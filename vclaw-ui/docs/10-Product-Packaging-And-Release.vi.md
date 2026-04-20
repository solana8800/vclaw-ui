# Chiến lược Đóng gói và Phát hành VClaw Desktop

Tài liệu này mô tả quy trình kỹ thuật để đóng gói VClaw thành một ứng dụng Desktop chuyên nghiệp (PKG) và cách phát hành trực tuyến qua GitHub.

---

## 1. Cơ chế Cài đặt Minh bạch (Installer Logic)

Bộ cài đặt của VClaw (.pkg) được thiết kế để hoạt động ổn định với 2 giai đoạn tự động:
- **Pre-install**: Dọn dẹp bản cũ và dừng các tiến trình đang chạy (cổng 12687).
- **Post-install**: Tự động tải/cài OpenClaw Core và Ollama Engine trực tiếp qua Internet.

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

### Bước 3: Đẩy bản phát hành lên GitHub
Sử dụng lệnh sau để tạo một bản Release mới và tải tệp cài đặt lên:
```bash
# Thay 'v0.1.0' bằng phiên bản hiện tại của bạn
gh release create v0.1.0 vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg --title "VClaw Desktop v0.1.0" --notes "Mô tả các thay đổi tại đây."
```

---

## 3. Quy trình Nâng cấp Phiên bản (Versioning)

Khi bạn muốn phát hành phiên bản mới (ví dụ từ 0.1.0 lên 0.2.0), hãy làm theo 3 bước:

1. **Cập nhật mã nguồn**: Mở tệp `vclaw-ui/package.json` và sửa dòng `"version": "0.1.0"` thành phiên bản mới.
2. **Build lại**: Chạy lại lệnh `bash scripts/package-vclaw.sh`. Script sẽ tự động lấy version mới từ `package.json` để gắn vào tên file `.pkg`.
3. **Phát hành**: Chạy lệnh `gh release create` với version mới tương ứng.

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
