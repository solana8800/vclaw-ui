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

### Bước 3: Đẩy bản phát hành sang Kho Công khai (vclaw)
Sử dụng kho riêng biệt để chứa bản build nhằm bảo mật mã nguồn. Để phát hành cả hai nền tảng trên **cùng một tag** (ví dụ: `v0.1.0`), bạn có thể tạo release cho macOS trước, sau đó bổ sung bản Windows sau:

#### 1. Tạo Release ban đầu với bản macOS (`.pkg`)
Lệnh này sẽ khởi tạo Release trên GitHub với tag `v0.1.0` và đính kèm tệp `.pkg`:

```bash
# Tạo release với tag chung v0.1.0 và đính kèm bản macOS
gh release create v0.1.0 \
  vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg \
  --repo solana8800/vclaw \
  --title "VClaw Desktop v0.1.0" \
  --notes "Bản phát hành thử nghiệm v0.1.0 dành cho macOS và Windows." \
  --generate-notes
```

#### 2. Bổ sung bản cài đặt Windows (`.exe`) vào cùng tag đó
Khi bản cài đặt Windows đã sẵn sàng, bạn chỉ cần dùng lệnh `upload` để đính kèm thêm tệp vào Release `v0.1.0` đã tạo ở bước trên (sử dụng `--clobber` để tự động ghi đè nếu tệp đã tồn tại):

```bash
# Upload bản cài đặt Windows lên Release (ghi đè nếu đã tồn tại)
gh release upload v0.1.0 \
  vclaw-ui/dist/VClawInstaller-0.1.0-x64.exe \
  --repo solana8800/vclaw \
  --clobber
```

> [!NOTE]
> Lệnh `gh release upload` cho phép đính kèm thêm tệp cài đặt vào một bản release hiện có mà không làm thay đổi tiêu đề hay nội dung mô tả (notes) đã tạo trước đó.


---

## 3. Quy trình Nâng cấp & Bảo mật (Versioning & Security)

Để bảo vệ mã nguồn kinh doanh, VClaw sử dụng mô hình **Dual-Repo**:
1. **Repo Private (`vclaw-ui`)**: Nơi bạn viết code và lưu trữ dữ liệu gốc. Tuyệt đối không tạo Release tại đây.
2. **Repo Public (`vclaw`)**: "Showroom" trưng bày sản phẩm. Chỉ chứa tệp cài đặt cho khách hàng.

**Các bước nâng cấp:**
1. Cập nhật `version` trong `vclaw-ui/package.json`.
2. Chạy `bash scripts/package-vclaw.sh`.
3. Chạy lệnh `gh release create` (hoặc `gh release upload` cho nền tảng tiếp theo) trỏ vào repo công khai `--repo solana8800/vclaw`.

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
