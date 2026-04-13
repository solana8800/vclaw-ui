# VClaw - Business OS Power by OpenClaw

VClaw là hệ điều hành kinh doanh thông minh dành cho SMB, tích hợp trợ lý AI dựa trên nền tảng **OpenClaw**.

---

## 🧠 Tài liệu & Tri thức (Knowledge)

Mọi tri thức về dự án và cấu hình Agent được quản lý tập trung:

- **[KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md)**: Chỉ mục toàn bộ tài liệu nghiệp vụ, kiến trúc và hướng dẫn.
- **Agent OS**: Các file `SOUL.md`, `AGENTS.md`, `IDENTITY.md` nằm tại thư mục gốc để định hình hành vi của Agent.

---

## 🦾 Điều khiển Agent (OpenClaw CLI)

Sử dụng lệnh `openclaw` từ terminal để tương tác và quản lý:

### 1. Nạp tri thức (Bootstrap)
Khi bắt đầu một Phase mới hoặc khi Agent cần cập nhật bối cảnh:
```bash
openclaw agent --to @OpenViClawBot --message "Hãy đọc KNOWLEDGE_INDEX.md và báo cáo kế hoạch hành động tiếp theo." --deliver
```

### 2. Lệnh Gateway thường dùng
- `openclaw gateway`: Khởi động API Gateway.
- `openclaw gateway --force`: Tự động sửa lỗi & Clean port.
- `openclaw models`: Kiểm tra danh sách AI Models khả dụng.
- `openclaw channels login`: Đăng nhập kênh tương tác (Telegram/WhatsApp).

---

## ⚙️ Vận hành & Hệ thống

### Chạy ngầm với PM2
Để hệ thống luôn hoạt động và tự khởi động cùng máy tính:
```bash
pm2 start openclaw --name "vclaw-gateway" -- gateway
pm2 save
```

### Sửa lỗi Docker (Sandbox)
Nếu gặp lỗi thực thi code (Sandbox), hãy kiểm tra quyền truy cập:
```bash
sudo chmod 666 /var/run/docker.sock
openclaw sandbox install
```

---
**Đội ngũ VClaw & OpenClaw Agent.**
