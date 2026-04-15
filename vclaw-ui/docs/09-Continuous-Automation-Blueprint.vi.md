# Bản Thảo Quy Trình Phát Triển Liên Tục và Tự Động VClaw (Blueprint)

Tài liệu này phác thảo chiến lược phát triển **Liên tục, Tự động và AI-native** cho VClaw. Là một "bản fork sản phẩm có kiểm soát" từ OpenClaw, VClaw yêu cầu một quy trình chuyên biệt vừa duy trì sự cập nhật từ lõi (core), vừa tự động hóa sự tiến hóa của lớp nghiệp vụ theo hướng `growth + operations assistant`.

---

## 1. Hạ Tầng Tự Động

### 1.1 Chiến Lược Git Submodule
- **Đồng Bộ Upstream**: Tự động kéo mã nguồn mới nhất hàng tuần từ `openclaw/openclaw` vào `/core/openclaw`.
- **Tách Biệt Plugin**: Logic kinh doanh dành riêng cho Việt Nam (VietQR, giao hàng, content assistance, follow-up, v.v.) được phát triển dưới dạng các plugin OpenClaw độc lập để tránh xung đột mã nguồn khi đồng bộ.
- **VClaw UI**: Được quản lý phiên bản riêng, tiêu thụ API từ core qua các hợp đồng WebSocket/REST tiêu chuẩn.

### 1.2 Tự Động Hóa Môi Trường Phát Triển
- **Script Khởi Tạo (Bootstrap)**: Một script `scripts/bootstrap.mjs` duy nhất sẽ:
  1. Cài đặt toàn bộ dependency cho UI.
  2. Chạy `pnpm install` và `pnpm build` trong thư mục core.
  3. Kiểm tra môi trường Node.js và Go.
- **Khởi Động 1-Click**: Lệnh `npm run dev:full` sẽ chạy song song cả OpenClaw Gateway (lõi) và Next.js Operations Console (giao diện).

---

## 2. Quy Trình Phát Triển Dạng Agentic (Ra Lệnh Code Qua Tin Nhắn)

VClaw được thiết kế để ưu tiên **Agentic-first**. Điều này có nghĩa là bản thân phần mềm sẽ hỗ trợ bạn xây dựng chính nó.

### 2.1 Nhận Diện Không Gian Làm Việc (Workspace Awareness)
OpenClaw được cấu hình với tệp `workspace.json` giúp AI nội bộ hiểu đầy đủ về:
- Thư viện component của `vclaw-ui` (shadcn/ui).
- API plugin của `core/openclaw`.
- Các thư mục `docs/` đóng vai trò là "Nguồn sự thật" (Source of Truth) cho các yêu cầu nghiệp vụ.

### 2.2 Vòng Lặp Code Liên Tục
1. **Lệnh**: Bạn gửi tin nhắn qua Admin Chat của VClaw (ví dụ: *"VClaw ơi, thêm màn hình duyệt content draft cho campaign follow-up"*).
2. **Phân Tích**: Agent phát triển VClaw sẽ phân tích component React và schema JSON tương ứng trong Core.
3. **Thực Thi**: Agent thực hiện chỉnh sửa đa tệp (form giao diện, nội dung đa ngôn ngữ i18n, policy automation và schema backend).
4. **Xác Minh**: Các bộ test tự động (Vitest) sẽ chạy để đảm bảo không có lỗi phát sinh (regressions).

---

## 3. CI/CD và Tự Động Hóa Triển Khai

### 3.1 Đảm Bảo Chất Lượng Tự Động
- **Kiểm Soát Lint**: Các hook pre-commit chạy `oxlint` và `eslint` để duy trì chất lượng mã nguồn mức độ "ngân hàng".
- **Agentic Testing**: Nếu test thất bại, một Agent chuyên biệt sẽ phân tích log và đề xuất bản vá code.

### 3.2 Giao Hàng Liên Tục (Continuous Delivery)
- **Tích Hợp Vercel**: Tự động xem trước (preview) giao diện `vclaw-ui` cho mỗi PR.
- **Đóng Gói Native**: Github Actions tự động build hàng đêm các bản cài đặt `.exe` và `.dmg` (1-click installer).

---

## 4. Lộ Trình Hướng Tới Tự Động Hóa Hoàn Toàn

| Giai Đoạn | Trọng Tâm | Mức Độ Tự Động |
| :--- | :--- | :--- |
| **Nền Tảng** | Submodule & Env | Cấu hình thủ công với script hỗ trợ. |
| **Tích Hợp UI & Workflow** | Từ Mock sang Logic thật | Tự động một phần (AI viết UI/workflow, người kiểm duyệt). |
| **Growth Automation Có Kiểm Soát** | Content, follow-up, auto tư vấn | Bán tự động (AI soạn draft, policy kiểm tra, người duyệt hoặc rule cho phép). |
| **Agentic Hoàn Toàn** | Tự Cải Tiến | Tự động hoàn toàn ở lớp đề xuất (Agent tự phát hiện xu hướng và đề xuất tính năng), không tự ý đẩy thẳng vào production. |

> [!IMPORTANT]  
> Mọi hành động "Tự Cải Tiến", content outbound, follow-up automation hoặc auto tư vấn có rủi ro đều phải thông qua **Hộp thư Duyệt (Task Inbox)** hoặc policy được cấu hình rõ. AI không bao giờ được tự ý đẩy code hay chạy automation nhạy cảm trong production mà không có guardrail phù hợp.
