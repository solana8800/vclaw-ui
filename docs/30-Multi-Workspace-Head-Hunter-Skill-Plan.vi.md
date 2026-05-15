# KẾ HOẠCH TRIỂN KHAI: MULTI-WORKSPACE & HEAD HUNTER SKILL (LINKEDIN)

## 1. TỔNG QUAN (OVERVIEW)

Mục tiêu là mở rộng VClaw từ một ứng dụng quản lý bán hàng đơn lẻ thành một nền tảng hỗ trợ đa doanh nghiệp (Multi-workspace) và đa nghiệp vụ (Multi-industry). Mỗi ngành nghề sẽ được định nghĩa là một "Skill" tập hợp các công cụ (Tools) và kịch bản AI (Prompts) chuyên biệt.

Trọng tâm của kế hoạch này là xây dựng Skill **Head Hunter** để tự động hóa các quy trình tuyển dụng trên LinkedIn.

---

## 2. GIAI ĐOẠN 1: HẠ TẦNG MULTI-WORKSPACE

Mục tiêu: Cho phép một bản cài đặt VClaw quản lý nhiều thực thể kinh doanh độc lập.

### 2.1 Thay đổi Database (Prisma Schema)
- **Model `Workspace`**:
  ```prisma
  model Workspace {
    id          String   @id @default(cuid())
    name        String
    industry    String   // "RETAIL", "HEAD_HUNTER", "SPA", etc.
    activeSkills String[] // Danh sách các skill được kích hoạt
    settings    String?  // JSON cấu hình riêng cho workspace
    createdAt   DateTime @default(now())
    customers   Customer[]
    orders      Order[]
    products    Product[]
    // ... các liên kết khác
  }
  ```
- **Liên kết**: Thêm `workspaceId` vào tất cả các model nghiệp vụ (`Customer`, `Order`, `Product`, `Conversation`, `Booking`).
- **Migration**: Thực hiện migrate dữ liệu hiện tại (ID `default`) vào workspace đầu tiên.

### 2.2 Thay đổi giao diện (Admin UI)
- **Workspace Switcher**: Thêm dropdown trên Sidebar/Header để chuyển đổi giữa các Workspace.
- **Context Provider**: Cập nhật `WorkspaceContext` để quản lý `currentWorkspaceId` trong toàn bộ ứng dụng.
- **Server Actions**: Cập nhật tất cả các hàm CRUD để luôn nhận và lọc theo `workspaceId`.

---

## 3. GIAI ĐOẠN 2: SKILL ENGINE (DYNAMICS INDUSTRY MODULES)

Mục tiêu: Thay đổi hành vi của Agent dựa trên cấu hình ngành nghề của Workspace.

### 3.1 Skill Definition System
- Mỗi Skill sẽ bao gồm:
    - **System Prompt Fragment**: Chỉ dẫn về vai trò (Role-play) và quy tắc nghiệp vụ.
    - **Tool Manifest**: Danh sách các công cụ mà Agent được phép sử dụng.
    - **UI Widgets**: Các thành phần giao diện đặc thù (ví dụ: bảng quản lý ứng viên cho Head Hunter).

### 3.2 Dynamic Agent Orchestration
- Khi khởi tạo session với OpenClaw, hệ thống sẽ lắp ghép (Assembly) Prompt dựa trên các Skill đang hoạt động của Workspace.
- Cơ chế nạp Plugin động: Chỉ nạp các Tool cần thiết để tối ưu hóa context window của LLM.

---

## 4. GIAI ĐOẠN 3: TRIỂN KHAI SKILL "HEAD HUNTER" (LINKEDIN)

Mục tiêu: Xây dựng Agent có khả năng thay thế con người thực hiện các tác vụ lặp lại trên LinkedIn.

### 4.1 LinkedIn Browser Automation (Playwright Tools)
Phát triển bộ tool trong `core/openclaw-zero-token/skills/head-hunter`:
- **`linkedin_search_candidates`**: Tự động search theo từ khóa, vị trí, kỹ năng.
- **`linkedin_outreach`**: Gửi tin nhắn Connect/InMail cá nhân hóa.
- **`linkedin_profile_analyzer`**: Truy cập profile, bóc tách kinh nghiệm, kỹ năng và học vấn.
- **`linkedin_message_sync`**: Đồng bộ tin nhắn từ LinkedIn về VClaw (tương tự Zalouser).

### 4.2 Candidate Management Workflow
- **Data Model**: Thêm model `Candidate` (hoặc mở rộng `Customer` với metadata tuyển dụng).
- **Pipeline View**: Giao diện dạng Kanban để quản lý ứng viên:
    - *Potential* (Tiềm năng)
    - *Reached Out* (Đã liên hệ)
    - *Interested* (Quan tâm)
    - *Screening* (Đang phỏng vấn sơ bộ)
    - *CV Received* (Đã nhận CV)
- **Automatic CV Extraction**: Agent tự động lưu CV (text hoặc file) vào hệ thống sau khi ứng viên gửi qua chat.

### 4.3 Scheduling & Follow-up
- **Screen Call Scheduling**: Tích hợp với module `Booking`. Agent tự động gửi link đặt lịch hoặc đề xuất giờ họp dựa trên Calendar của Recruiter.
- **Auto Follow-up**: Tự động nhắc nhở nếu ứng viên chưa phản hồi sau N ngày (có sự phê duyệt của Recruiter).

---

## 5. THÔNG SỐ KỸ THUẬT & AN TOÀN (TECHNICAL SPECS & SAFETY)

### 5.1 LinkedIn Anti-Detection
- **Human-like Interaction**: Sử dụng Playwright với các kỹ thuật mô phỏng hành vi người dùng (di chuyển chuột, delay ngẫu nhiên).
- **Session Persistence**: Lưu trữ Cookie/Profile trình duyệt tại local máy người dùng để tránh bị checkpoint do đăng nhập lạ.
- **Rate Limiting**: Giới hạn số lượng tin nhắn/lượt tìm kiếm mỗi ngày để bảo vệ tài khoản LinkedIn.

### 5.2 Human-in-the-loop (HITL)
- Mọi tin nhắn Outreach đầu tiên phải được Recruiter duyệt trong **Task Inbox** trước khi gửi.
- Agent chỉ được tự động trả lời (Auto-consultation) cho các câu hỏi phổ thông về vị trí tuyển dụng.

---

## 6. LỘ TRÌNH (ROADMAP)

1.  **Tuần 1**: Hoàn thiện Multi-workspace DB & UI Switcher.
2.  **Tuần 2**: Xây dựng LinkedIn Playwright Adapter (Login, Search, Basic Messaging).
3.  **Tuần 3**: Phát triển Candidate Pipeline UI và nạp Head Hunter Prompt.
4.  **Tuần 4**: Thử nghiệm (Pilot) với 1 tài khoản LinkedIn thật và tinh chỉnh độ chính xác của Agent.

---

> **Ghi chú**: Kế hoạch này ưu tiên tính local-first để bảo mật tài khoản LinkedIn của người dùng, không lưu trữ cookie trên server tập trung.
