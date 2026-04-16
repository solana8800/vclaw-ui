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
- [ ] 1. Kiểm tra và thiết lập thuộc tính `output: 'export'` trong file `vclaw-ui/next.config.ts`.
- [ ] 2. (Tùy chọn) Xây dựng một nút Tích hợp Zalo trên Control UI (`/admin/integrations`) hỗ trợ gọi API kích hoạt Playwright Headful mode (quet mã QR).
- [ ] 3. Thực thi build tĩnh UI: `cd vclaw-ui && pnpm install && pnpm build`.
- [ ] 4. Đảm bảo thư mục `vclaw-ui/out` tồn tại và chứa toàn bộ resource tĩnh.

### Giai đoạn 2: Tích hợp Frontend vào OpenClaw Core
- [ ] 5. Điều hướng về root (hoặc `core/openclaw`). Xóa thư mục UI cũ: `rm -rf ./core/openclaw/dist/control-ui`.
- [ ] 6. Copy giao diện tĩnh mới build sang core: `mkdir -p ./core/openclaw/dist/control-ui && cp -R ./vclaw-ui/out/* ./core/openclaw/dist/control-ui/`.

### Giai đoạn 3: Phát triển & Kiểm thử Zalo Web Automation (Playwright)
- [ ] 7. Xây dựng module/hook `vclaw-zalo-adapter` tích hợp Playwright để khởi chạy `chat.zalo.me`.
- [ ] 8. Bổ sung cơ chế lưu/đọc `zalo_session.json` (Save/Load state browser) cho phép hoạt động Headless trong tương lai.
- [ ] 9. Xác thực thành công luồng đăng nhập (hiển thị UI cho user quét QR code) và chuyển luồng (headless mode).

### Giai đoạn 4: Đóng gói (Packaging & Release macOS)
- [ ] 10. Chỉnh sửa Branding trong core (Tên, Identifiers, Icon) hướng đến `VClaw` (như `Info.plist`, Bundle ID `com.solana8800.vclaw`).
- [ ] 11. Cài đặt dependencies cho core: `cd core/openclaw && pnpm install`.
- [ ] 12. Build Core: `pnpm build` (Đảm bảo bỏ qua các lỗi UI cũ).
- [ ] 13. Khởi chạy Script Packaging tạo `.app`: Di chuyển vào `core/openclaw` và chạy `SKIP_UI_BUILD=1 ./scripts/package-mac-app.sh`.
- [ ] 14. Khởi chạy Script tạo `.dmg`: Chạy lệnh `SKIP_UI_BUILD=1 ./scripts/create-dmg.sh`.
- [ ] 15. Kiểm tra kết quả đóng gói: Mở file `.dmg` tại `./core/openclaw/dist/` và test quá trình mount/install ảo. Cài xong, UI hiện Next.js thay vì UI cũ.

## Hướng dẫn cho Agent
Khi được yêu cầu tiếp tục, hãy điền `[x]` vào các task đã làm xong và thực hiện task kế tiếp theo thứ tự. Bất kỳ khó khăn liên quan đến compile hoặc directory, hãy tự động sửa lỗi và báo cáo lại qua File Changed hoặc Terminal. Đừng quên gửi kết quả lệnh cho Human duyệt.
