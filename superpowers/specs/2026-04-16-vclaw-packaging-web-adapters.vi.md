# Đặc tả Thiết kế: Zalo Web Adapter & Packaging Pipeline
*(VClaw - 2026-04-16)*

## 1. Giới thiệu
VClaw cần có khả năng trực tiếp giao tiếp qua tài khoản ứng dụng chat của người dùng (Zalo Cá nhân). Do Zalo không mở API cho cá nhân nên hệ thống bắt buộc sử dụng cơ chế giả lập trình duyệt (Browser Automation) qua thư viện Playwright. Đồng thời, toàn bộ khối tiện ích này, kết hợp với giao diện UI (Next.js) và bộ óc xử lý (OpenClaw), phải được đóng gói gọn trong một file cài đặt `.dmg`.

## 2. Phạm vi đặc tả (Scope)
1. **Zalo Web Adapter**:
   - Sử dụng Playwright để khởi chạy `chat.zalo.me`.
   - Cơ chế Đăng nhập (Human-in-the-loop): Mở cửa sổ trình duyệt để người dùng quét mã.
   - Cơ chế Session Management: Trích xuất và lưu Cookie, LocalStorage để sử dụng cho lần sau (Headless background).
2. **Packaging Pipeline**:
   - Tự động hóa quá trình xuất tĩnh (Static Export) của VClaw UI (Next.js).
   - Di chuyển giao diện vào thư mục yêu cầu của OpenClaw.
   - Biên dịch và tạo file macOS App (`VClaw.app` và `VClaw.dmg`).

## 3. Kiến trúc Đề xuất

### 3.1 Zalo Web Adapter Component
```text
[ VClaw Plugin (Node) ] <---> [ Playwright ] <---> [ Trình duyệt ẩn/hiển thị ]
       |
     (Lưu trữ State)
       |
[ Local File: zalo_session.json ]
```
- Khi chạy lần đầu, VClaw mở UI `Headed` (có giao diện) tại `chat.zalo.me`. Người dùng dùng điện thoại quét mã QR. 
- Sau khi nhận diện đã đăng nhập thành công (Dựa trên URL hoặc DOM content "Danh bạ"), VClaw lưu trạng thái trình duyệt vào `zalo_session.json` và đóng giao diện Headded.
- Các lần xử lý message tiếp theo đều chạy `Headless` (chạy ngầm).

### 3.2 Packaging Architecture
- **Next.js config**: Thiết lập `output: 'export'` trong `next.config.ts`.
- **Injection Script**: Thực thi sao chép `./vclaw-ui/out/` đè lên `./core/openclaw/dist/control-ui/`.
- **Sparkle Framework**: Khung update tự động của OpenClaw sẽ được cấu hình lại với biến `BUNDLE_ID=com.solana8800.vclaw`.

## 4. Rủi ro & Biện pháp giảm nhẹ
- **Anti-bot của Zalo**: Có nguy cơ tài khoản bị đăng xuất liên tục khi Playwright thao tác. Biện pháp: Lưu kèm LocalStorage + IndexedDB chứ không chỉ Cookie. Setup user-agent thành Chrome mặc định.
- **Dung lượng Desktop App**: App kèm Playwright Browser sẽ khá nặng. Cần cân nhắc việc cấu hình script macOS bỏ bớt các Playwright driver không dùng (như firefox/webkit) hoặc yêu cầu cài tự động khi app khởi chạy lần đầu nếu có thể.
- **Lỗi Packaging**: Script cũ của OpenClaw ghi đè UI nếu chạy không đúng. Biện pháp: Luôn truyền cờ cứng `SKIP_UI_BUILD=1`.
