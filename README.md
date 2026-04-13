# VClaw - Business OS Power by OpenClaw

VClaw là hệ điều hành kinh doanh thông minh dành cho SMB, tích hợp sẵn trợ lý AI Agentic dựa trên nền tảng **OpenClaw**.

---

## 🦾 Điều khiển Agent (OpenClaw CLI)

Để điều khiển Agent từ Terminal, bạn sử dụng lệnh `openclaw` (Đã được cài đặt qua OpenClaw CLI).

### 1. Lệnh Bàn giao & Nạp tri thức (Bootstrap)
Sử dụng lệnh này khi bạn muốn Agent đọc lại toàn bộ tài liệu dự án để bắt đầu một Phase mới hoặc khi Agent bị gián đoạn:

```bash
openclaw agent --to @OpenViClawBot --message "VClaw Architect nghe đây. Hãy đọc toàn bộ các file trong vclaw-ui/docs/agentic/ (SOUL, IDENTITY, AGENTS, TOOLS, USER, HEARTBEAT) và KNOWLEDGE_INDEX.md để nắm bắt nhiệm vụ. Sau đó báo cáo lại kế hoạch hành động." --deliver
```

### 2. Các lệnh điều phối Gateway
- **Khởi động Gateway**: `openclaw gateway`
- **Tự động sửa lỗi & Clean port**: `openclaw gateway --force`
- **Kiểm tra Model**: `openclaw models`
- **Đăng nhập Telegram/WhatsApp**: `openclaw channels login`

---

## 🧠 Hệ điều hành Agent (Agent OS Files)

Dự án sử dụng các file cấu hình đặc biệt nằm trong thư mục **vclaw-ui/docs/agentic/** để định hình "linh hồn" của AI:

1. **[SOUL.md](vclaw-ui/docs/agentic/SOUL.md)**: Định nghĩa Sứ mệnh và Giá trị cốt lõi.
2. **[IDENTITY.md](vclaw-ui/docs/agentic/IDENTITY.md)**: Định nghĩa "Danh tính" là Core Architect.
3. **[AGENTS.md](vclaw-ui/docs/agentic/AGENTS.md)**: Quy tắc vận hành (Tiếng Việt, Source of Truth).
4. **[TOOLS.md](vclaw-ui/docs/agentic/TOOLS.md)**: Danh sách công cụ AI có thể sử dụng.
5. **[USER.md](vclaw-ui/docs/agentic/USER.md)**: Thông tin về phong cách làm việc của người dùng.
6. **[HEARTBEAT.md](vclaw-ui/docs/agentic/HEARTBEAT.md)**: Nhật ký ghi nhận tình trạng hệ thống.
7. **[KNOWLEDGE_INDEX.md](vclaw-ui/docs/KNOWLEDGE_INDEX.md)**: Mục lục dẫn tới toàn bộ tri thức.

---

## 📝 Prompt "Thần chú" (Master Bootstrap Prompt)

Đây là Prompt tối ưu để Agent hiểu toàn bộ dự án:

> *"Chào VClaw Assistant. Anh vừa cập nhật hệ thống tri thức trong thư mục docs/agentic/. Hãy đọc kỹ mục lục tri thức KNOWLEDGE_INDEX.md và báo cáo lại kế hoạch chi tiết nhất để hoàn thiện dự án theo Roadmap tại 05-Implementation-Plan.vi.md. Chỉ thực hiện khi anh xác nhận."*

---

## ⚙️ Vận hành & Chạy ngầm (Background)

Để OpenClaw luôn chạy ngầm và tự khởi động cùng máy tính, hãy dùng **PM2**:

```bash
# Chạy ngầm gateway
pm2 start openclaw --name "vclaw-gateway" -- gateway

# Lưu trạng thái để tự khởi động sau khi reboot
pm2 save
pm2 startup
```

---

## 🐳 Sửa lỗi Docker (Sandbox)

Nếu gặp lỗi kết nối Docker (Permission Denied), hãy chạy:
```bash
sudo chmod 666 /var/run/docker.sock
```
Nếu sandbox gặp lỗi thực thi, hãy cài đặt lại:
```bash
openclaw sandbox install
```

---
**Phát triển bởi Đội ngũ VClaw & OpenClaw Agent.**
