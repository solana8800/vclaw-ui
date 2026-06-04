---
type: user_profile
username: tuantd26
email: tuantd26@vingroup.net
role: Techlead
---

# User Profile: Tuấn (tuantd26)

## 1. Thông tin chung

- **Username**: tuantd26
- **Email**: tuantd26@vingroup.net
- **Vai trò trong dự án**: Techlead
- **Ngôn ngữ giao tiếp với AI**: Tiếng Việt (luôn trả lời bằng tiếng Việt tự nhiên, chuyên nghiệp).

## 2. Trách nhiệm & Quyền hạn (Techlead)

- Chịu trách nhiệm thiết kế kiến trúc tổng thể, review code và đưa ra định hướng kỹ thuật cho các dự án đang dùng `.agents`.
- Quyết định các tiêu chuẩn về TDD, Security, CI/CD DevOps và phê duyệt (gate pass) cho các tính năng quan trọng.
- Khi các AI Agent làm việc với Tuấn, cần báo cáo ở mức độ tổng quan kiến trúc, đánh giá sâu về rủi ro kỹ thuật (technical debts, security, performance) thay vì chỉ đưa ra giải pháp fix code tạm thời.

## 3. Thói quen & Tiêu chuẩn lập trình (Preferences)

- **Kiến trúc**: Tuân thủ tuyệt đối Clean Architecture (chia rõ Domain, Application, Infrastructure, API). Không để business logic lọt ra ngoài Domain/Application.
- **Chất lượng Code**: Code phải tường minh, ưu tiên tính dễ đọc (readability) và dễ bảo trì (maintainability). Biến/hàm/class bắt buộc dùng tiếng Anh chuyên ngành.
- **Kiểm thử (Testing)**: Đề cao phương pháp TDD. Yêu cầu viết API/Integration test contract (xUnit) trước khi implement logic.
- **Security & Performance**: Không chấp nhận hardcode secret, luôn rà soát SQL Injection, lỗ hổng auth và PII data boundary.
- **Giao tiếp AI**: Đi thẳng vào vấn đề, không giải thích dài dòng những khái niệm cơ bản trừ khi được hỏi. Comment trong code và log messages phải bằng tiếng Việt dễ hiểu.

## 4. Custom Skills & Shortcuts (Kỹ năng cá nhân hóa)

Phần này định nghĩa các quy trình (macros) hoặc câu lệnh rút gọn chỉ dành riêng cho tài khoản của Tuấn. Khi Tuấn gõ các từ khóa dưới đây, AI phải tự động hiểu và thực thi chuỗi hành động tương ứng.

### 4.1. Skill: `@review-arch` (Review Kiến Trúc Nhanh)

- **Điều kiện kích hoạt**: Khi Tuấn nói "Hãy `@review-arch` [đường dẫn/thư mục]".
- **Hành động của AI**:
  1. Dùng tool đọc lướt qua các file trong thư mục được yêu cầu.
  2. **Bỏ qua lỗi syntax lặt vặt**, chỉ tập trung tìm lỗi vi phạm Clean Architecture (ví dụ: Layer Domain phụ thuộc Infrastructure, Controller phình to chứa business logic).
  3. Báo cáo thẳng vào các Technical Debts và đề xuất sơ đồ cấu trúc mới.

### 4.2. Skill: `@fast-gate-pass` (Duyệt Release Nhanh)

- **Điều kiện kích hoạt**: Khi Tuấn nói "Đã kiểm tra, cho `@fast-gate-pass` tính năng [Tên tính năng]".
- **Hành động của AI**:
  1. Kiểm tra lướt qua xem các file logic chính đã có file test (xUnit) đi kèm chưa.
  2. Bỏ qua các bước SDLC rườm rà, tự động tổng hợp danh sách file thay đổi.
  3. Sinh ngay lập tức một file `Release Note` nháp và hỏi Tuấn có muốn bổ sung thêm rủi ro nào không.
