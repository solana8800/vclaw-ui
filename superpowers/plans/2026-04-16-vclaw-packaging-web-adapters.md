# Kế hoạch thực thi: Zalo Web Adapter & Packaging
*(VClaw - 2026-04-16)*

**Mục tiêu:**
Biến tài liệu kỹ thuật thành một sản phẩm thực tế có khả năng đọc/gửi tin nhắn qua Zalo và xuất bản ứng dụng ra file `.dmg`.

**Reference Spec:** `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`
**Status:** Mới khởi tạo.

---

## Danh sách Task (Checklist)

### Giai đoạn 1: Zalo Web Automation
- [ ] 1. Khởi tạo plugin `vclaw-zalo-adapter` bên trong `/core/openclaw/src/plugins` hoặc khu vực module dự kiến.
- [ ] 2. Viết hàm khởi tạo Playwright với tùy chọn `headless: false`.
- [ ] 3. Viết script lưu trữ và nạp trạng thái (Save/Load Context) vào `zalo_session.json`.
- [ ] 4. Mở endpoint `/chat.zalo.me` và đợi phần tử DOM hiển thị đăng nhập thành công (Ví dụ: class danh sách đoạn chat).
- [ ] 5. Kiểm thử hàm gửi tin nhắn độc lập bằng Playwright script test nội bộ.

### Giai đoạn 2: Tích hợp Frontend Next.js
- [ ] 6. Tại `vclaw-ui`, cập nhật `next.config.ts` để thêm thuộc tính `output: 'export'`.
- [ ] 7. Xây dựng một nút API từ Control UI yêu cầu hệ thống bật Playwright Headful để người dùng bắt đầu quét mã (Trên Dashboard hoặc `/admin/integrations`).

### Giai đoạn 3: Packaging & Release Pipeline
- [ ] 8. Xóa thư mục UI cũ: `rm -rf ./core/openclaw/dist/control-ui`.
- [ ] 9. Build UI Next.js: `cd vclaw-ui && pnpm install && pnpm build` (Chắc chắn thư mục `out` được sinh ra tự động, vì ta không dùng `npm run export` nữa).
- [ ] 10. Chép UI mới: `mkdir -p ./core/openclaw/dist/control-ui && cp -R ./vclaw-ui/out/* ./core/openclaw/dist/control-ui/`.
- [ ] 11. Chuẩn bị Core: `cd core/openclaw && pnpm install && pnpm build`.
- [ ] 12. Packaging: Thực thi lệnh `SKIP_UI_BUILD=1 ./scripts/package-mac-app.sh`.
- [ ] 13. DMG Generation: Thực thi lệnh `SKIP_UI_BUILD=1 ./scripts/create-dmg.sh`.
- [ ] 14. Mở file `.dmg` và kiểm tra giao diện Next.js có hiển thị trong App độc lập hay không.

## Hướng dẫn cho Agent
Khi được yêu cầu tiếp tục, hãy điền `[x]` vào các task đã làm xong và thực hiện task kế tiếp theo thứ tự. Nếu gặp rủi ro ngoài đặc tả, hãy tạo thông báo hoặc đưa ra Terminal Output cho Kokoro trước khi quyết định can thiệp sâu.
