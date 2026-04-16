# HEARTBEAT.md - Automated Monitoring

## System Health
- Check http://localhost:3000 status.
- Đảm bảo Playwright background processes (nếu có các tiến trình Zalo Web Adapters) không bị treo hoặc rò rỉ bộ nhớ. Báo cáo tình trạng Headless sessions.
- Ensure `ngrok` is still running and provide the URL if it changes.
- Check for any new errors trong các file `vclaw-ui/build.log` hoặc `core/openclaw/dist/`.

## Development Progress
- Xuyên suốt các thư mục `superpowers/plans/` để kiểm tra tiến trình Blueprint. Báo cáo các checklist (`[ ]` và `[x]`) đặc biệt là kế hoạch đóng gói Mac (`2026-04-16-vclaw-packaging-web-adapters.md`).
- Scan for recent file changes in `core/` and `vclaw-ui/`.
- Report new git commits hoặc unstaged changes trước khi tạo một bản đóng gói (Package) mới.
