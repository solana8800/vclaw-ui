# VClaw - Business OS Power by OpenClaw

VClaw là hệ điều hành kinh doanh thông minh dành cho SMB, tích hợp trợ lý AI dựa trên nền tảng **OpenClaw**.

---

## 🧠 Tài liệu & Tri thức (Knowledge)

Mọi tri thức về dự án và cấu hình Agent được quản lý tập trung:

- **[KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md)**: Chỉ mục toàn bộ tài liệu nghiệp vụ, kiến trúc và hướng dẫn.
- **Agent OS**: Các file `SOUL.md`, `AGENTS.md`, `IDENTITY.md` nằm tại thư mục gốc để định hình hành vi của Agent.
- **Superpowers (Blueprints)**: Thư mục `superpowers/` chứa các bản thiết kế kỹ thuật (Specs) và kế hoạch thực thi (Plans) để Agent tự động mã hóa tính năng.

---

### 1. Nạp tri thức & Yêu cầu Code (Agentic Coding)
Thay vì tự code tay, hãy giao việc cho Agent thông qua CLI bằng cách tham chiếu trực tiếp đến các bản thiết kế trong `superpowers/plans/`:
```bash
openclaw agent --to @OpenViClawBot --message "Hãy thực thi bước tiếp theo trong kế hoạch superpowers/plans/2026-04-10-vclaw-ui-implementation.md" --deliver
```

### 2. Phát triển Giao diện (Local UI)
Ứng dụng frontend được viết bằng Next.js nằm trong thư mục `vclaw-ui/`.
```bash
cd vclaw-ui
npm install
npm run dev
```

### 3. Lệnh Gateway thường dùng
- `openclaw gateway`: Khởi động API Gateway (để nhận tin nhắn Telegram/Local).
- `openclaw gateway --force`: Tự động sửa lỗi & Clean port.
- `openclaw channels login`: Đăng nhập kênh tương tác.

---

## ⚙️ Vận hành hệ thống nền

### Chạy ngầm OpenClaw với PM2
Để Agent luôn thức và lắng nghe lệnh của bạn:
```bash
pm2 start openclaw --name "vclaw-gateway" -- gateway
pm2 save
```

---
**Đội ngũ VClaw & OpenClaw Agent.**
