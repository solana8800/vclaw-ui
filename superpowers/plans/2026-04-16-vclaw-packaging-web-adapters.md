# Kế hoạch thực thi: Hoàn thiện sản phẩm & Đóng gói Desktop (.dmg)
*(VClaw - 2026-04-16)*

**Mục tiêu:**
Thực thi toàn bộ các tác vụ cấu hình hệ thống từ source code hiện tại cho đến khi đóng gói thành công file cài đặt ứng dụng macOS (`.dmg`) cho người dùng cuối. 
Đây là KẾ HOẠCH CHÍNH (Master Plan) để OpenClaw Agent theo dõi và hoàn thiện sản phẩm.

**Reference Spec:** `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`
`vclaw-ui/docs/10-Product-Packaging-And-Release.vi.md`
**Status:** In Progress.

---

## Danh sách Task (Checklist)

### Giai đoạn 1: Chuẩn bị Môi trường UI (Next.js Static Export)
- [x] 1. Kiểm tra và thiết lập thuộc tính `output: 'export'` trong file `vclaw-ui/next.config.ts`. (Sử dụng `NEXT_PUBLIC_EXPORT="true"` trong script build).
- [ ] 2. (Tùy chọn) Xây dựng một nút Tích hợp Zalo trên Control UI (`/admin/integrations`) hỗ trợ gọi API kích hoạt Playwright Headful mode (quet mã QR).
- [x] 3. Thực thi build tĩnh UI: `cd vclaw-ui && pnpm install && pnpm build`.
- [x] 4. Đảm bảo thư mục `vclaw-ui/out` tồn tại và chứa toàn bộ resource tĩnh.

### Giai đoạn 2: Tích hợp Frontend vào OpenClaw Core
- [x] 5. Điều hướng về root (hoặc `core/openclaw`). Xóa thư mục UI cũ: `rm -rf ./core/openclaw/dist/control-ui`.
- [x] 6. Copy giao diện tĩnh mới build sang core: `mkdir -p ./core/openclaw/dist/control-ui && cp -R ./vclaw-ui/out/* ./core/openclaw/dist/control-ui/`.

### Giai đoạn 3: Phát triển & Kiểm thử Zalo Web Automation (Playwright)
- [ ] 7. Xây dựng module/hook `vclaw-zalo-adapter` tích hợp Playwright để khởi chạy `chat.zalo.me`.
- [ ] 8. Bổ sung cơ chế lưu/đọc `zalo_session.json` (Save/Load state browser) cho phép hoạt động Headless trong tương lai.
- [ ] 9. Xác thực thành công luồng đăng nhập (hiển thị UI cho user quét QR code) và chuyển luồng (headless mode).

### Giai đoạn 4: Đóng gói (Packaging & Release macOS)
- [x] 10. Chỉnh sửa Branding trong core (Tên, Identifiers, Icon) hướng đến `VClaw`. -> (Đã tự động hóa trong script patch).
- [x] 11. Thực thi quy trình đóng gói cô lập: `bash scripts/package-vclaw.sh`. (Bao gồm cả việc nhúng cấu hình `openclaw.json` mặc định).
- [x] 12. Kiểm tra kết quả đóng gói: Đã tích hợp asset injection vào Resources ứng dụng để đảm bảo UI Next.js hiển thị thay cho UI gốc.

## Hướng dẫn cho Agent
Khi được yêu cầu tiếp tục, hãy sử dụng script `scripts/package-vclaw.sh` để thực hiện đóng gói. Script này sẽ tự động tạo thư mục `build/vclaw-desktop`, copy core, patch và build app mà không làm ảnh hưởng đến mã nguồn gốc trong `core/openclaw`.

