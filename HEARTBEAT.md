# HEARTBEAT.md - Giám sát tự động dự án VClaw

## 🩺 Tình trạng Hệ thống
- Kiểm tra trạng thái **VClaw UI** (mặc định cổng 12687) và **OpenClaw Core** (cổng 18789).
- Giám sát kết nối tới các model mới cấu hình: **Anthropic Azure** (Sonnet/Opus) và **Ollama Cloud** (Kimi/DeepSeek/Qwen).
- Kiểm tra log lỗi trong `vclaw-ui/.next/` hoặc `core/openclaw/logs/` để phát hiện sự cố kịp thời.
- Theo dõi tình trạng bộ nhớ của các tiến trình trình duyệt headless nếu có sử dụng plugin `browser`.

## 🛰️ Tiến độ Phát triển & Kế hoạch (Superpowers)
- Quét các file trong `superpowers/plans/` để cập nhật tiến độ checklist (`- [ ]` vs `- [x]`).
- Tập trung vào bản kế hoạch đóng gói ứng dụng desktop (**Browser-Native**) và tích hợp đa luồng.
- Báo cáo các thay đổi (`git status`) chưa được commit, đặc biệt là trong các tài liệu nghiệp vụ tại `vclaw-ui/docs`.

## 📜 Quy tắc Duy trì (Maintenance)
- Đảm bảo tất cả các log, thông báo và comment mới ĐỀU PHẢI dùng **tiếng Việt** tự nhiên.
- Kiểm tra tính nhất quán giữa `KNOWLEDGE_INDEX.md` và các file tài liệu thực tế trong `/docs`.
- Nếu có yêu cầu mới từ người dùng qua Telegram/CLI, hãy ưu tiên xử lý và cập nhật vào `memory/` hàng ngày.

## 💡 Lưu ý cho AI
- Nếu không có gì bất thường và mọi thứ đang theo đúng kế hoạch, chỉ cần trả lời: `HEARTBEAT_OK`.
- Không lặp lại các tác vụ cũ đã hoàn thành trong lịch sử chat.
