# Hướng Dẫn Lập Trình Tự Động (Agentic Coding) với OpenClaw

Tài liệu này hướng dẫn bạn cách sử dụng OpenClaw CLI để tự động hóa việc viết mã nguồn cho dự án VClaw.

---

## 1. Kiểm Tra Trạng Thái
Để đảm bảo OpenClaw đã nhận diện đúng dự án VClaw, hãy chạy lệnh sau trong terminal:

```bash
# Sử dụng bản build mới nhất trong project
node core/openclaw/openclaw.mjs agents list
```

Bạn sẽ thấy workspace `~/Documents/projects/vclaw/` đã được kích hoạt.

---

## 2. Cách Ra Lệnh Code (Agentic Commands)

Bạn có hai cách chính để yêu cầu AI lập trình:

### Cách A: Qua Terminal (Dành cho nhà phát triển)
Sử dụng lệnh `agent` để gửi yêu cầu trực tiếp từ dòng lệnh.

**Ví dụ 1: Thêm tính năng mới**
```bash
node core/openclaw/openclaw.mjs agent --message "VClaw ơi, hãy thêm một khối 'Nội dung chờ duyệt' vào Dashboard để người bán thấy các content draft đang nằm trong approval queue."
```

**Ví dụ 2: Sửa lỗi hoặc Refactor**
```bash
node core/openclaw/openclaw.mjs agent --message "Hãy kiểm tra file app/[locale]/admin/page.tsx và đảm bảo tất cả console.log đều được dịch sang tiếng Việt theo quy định của dự án."
```

### Cách B: Qua Telegram (Dành cho vận hành)
Nếu bạn đã bật Gateway, bạn chỉ cần nhắn tin cho Bot Telegram đã cấu hình.
1. Mở Telegram.
2. Tìm Bot VClaw của bạn.
3. Nhắn: `VClaw, hãy tạo một trang mới tại /admin/campaigns hiển thị danh sách campaign draft và follow-up chờ duyệt.`

---

## 3. Quy Tắc Lập Trình (Coding Rules) cho AI
OpenClaw đã được cấu hình để tuân thủ các quy tắc của VClaw:
- **Ngôn ngữ**: Comment và Log phải luôn bằng **tiếng Việt**.
- **Tech Stack**: Next.js 16, Tailwind CSS, Shadcn/UI, Lucide Icons.
- **i18n**: Luôn sử dụng `next-intl` thay vì viết text cứng.

---

## 4. Chế Độ "An Toàn" (Guardrails)
Mọi thay đổi mã nguồn do AI thực hiện sẽ:
1. Được thực hiện trong vùng làm việc an toàn.
2. Gửi một yêu cầu phê duyệt vào **Task Inbox** trên Admin Console (nếu đã cấu hình).
3. Hoặc bạn có thể tự kiểm tra lại bằng lệnh `git diff` trước khi commit.
4. Với các luồng growth như content, follow-up hoặc auto tư vấn, cần ưu tiên cách tiếp cận `draft + approval + policy` thay vì giả định full automation.

---

> [!IMPORTANT]  
> Nếu OpenClaw báo lỗi thiếu API Key, hãy đảm bảo biến môi trường `GOOGLE_API_KEY` đã được thiết lập hoặc đã đăng nhập qua `openclaw configure`.
