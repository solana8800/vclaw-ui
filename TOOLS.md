# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here
- Playwright testing guidelines cho Commerce Web Adapters
- Lệnh đóng gói và đường dẫn quan trọng
- Environment-specific flags

## VClaw Specific Notes

### Playwright & Web Adapters
- Testing: Nên luôn có `HEADLESS=false` hoặc sử dụng `npx playwright test --ui` khi phát triển adapter mới (Zalo/Facebook) để xem được giao diện mã QR.
- Tránh việc để treo session Headless của Chromium trên máy người dùng.

### Packaging Scripts
- Thay vì `npm run build` thường, quá trình build UI tĩnh giờ yêu cầu: `cd vclaw-ui && pnpm build` (sau khi set cờ tĩnh).
- Lệnh bypass hệ thống UI Build của core khi gỡ rối Mac packaging:
  `SKIP_UI_BUILD=1 ./core/openclaw/scripts/package-mac-app.sh`

### Hai cây tài liệu (nhớ khi tra cứu)
- **`vclaw-ui/docs/`**: public, đi kèm route `/docs` (định nghĩa slug trong `vclaw-ui/lib/docs.ts`).
- **`docs/`** (thư mục gốc repo): private, không qua Next docs viewer; đọc trực tiếp khi cần blueprint / tích hợp nội bộ.

### SSH / Môi trường nội bộ
- home-server → (Chưa định nghĩa, giữ nguyên local testing cho VClaw MVP)
