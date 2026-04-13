# COMMERCE ADMIN AND OMNICHANNEL USE CASES
## DỰ ÁN: VClaw - Lớp quản trị bán hàng cho SMB trên nền OpenClaw

---

## 1. MỤC TIÊU TÀI LIỆU

Tài liệu này tập trung vào câu hỏi mang tính sản phẩm:

1. Người bán hàng không kỹ thuật sẽ quản trị VClaw như thế nào.
2. Những use case kinh doanh cốt lõi nào VClaw cần hỗ trợ ngoài phần setup kỹ thuật.
3. Làm sao để sản phẩm mở rộng từ chat operations sang commerce operations mà không làm phình phạm vi quá sớm.

---

## 2. NGUYÊN TẮC SẢN PHẨM

1. Người bán hàng không nên cần CLI để sử dụng hằng ngày.
2. Trải nghiệm chính phải đi qua web admin dễ hiểu, đặt trọng tâm vào việc bán hàng và vận hành.
3. Chat-native admin chỉ là surface phụ cho tác vụ nhanh.
4. Lõi sản phẩm nên phục vụ `generic SMB commerce` trước khi đi vào vertical riêng.
5. Vertical như ticketing, attraction sales hoặc đại lý B2B chỉ nên mở rộng khi lõi commerce đã vững.

---

## 3. LAYERED ADMIN SURFACES

### 3.1 Localhost Web Admin (Decoupled Operations Console)

Đây là surface quản trị chính cho người dùng cuối. Khác với các giao diện kỹ thuật (Mission Control) của OpenClaw, Dashboard này là một Web App kinh doanh theo mô hình CRM-lite:

Các khu vực nên có:

1. **Onboarding**
   - Chọn kênh chat chính
   - Kết nối tài khoản
   - Thiết lập QR thanh toán
   - Thiết lập giao vận
   - Thiết lập lịch hẹn hoặc giờ phục vụ
2. **Operations Console (Bàn làm việc số)**
   - Hộp thư duyệt tác vụ (Human-in-the-loop task inbox)
   - Quản lý hội thoại khách hàng
   - Xác minh và đối soát Bill chuyển khoản
   - Xem và chốt lịch hẹn
   - Xử lý cảnh báo hoặc lỗi nghiệp vụ
3. **Commerce Console**
   - Khách hàng
   - Lead
   - Đơn hoặc giao dịch
   - Sản phẩm/dịch vụ
   - Follow-up
4. **Integrations**
   - Kênh chat
   - QR/payment
   - Delivery
   - Catalog/service sources
5. **Automation**
   - Template
   - Rule
   - Reminder
   - Follow-up policy

### 3.2 Remote Web Access

Đây là mode bổ sung cho người dùng cần quản trị ngoài máy cài đặt.

Nguyên tắc:

1. Mặc định vẫn là local-only.
2. Remote access chỉ bật khi người dùng có nhu cầu.
3. Ưu tiên tunnel hoặc lớp remote access an toàn hơn là public exposure trực tiếp.
4. Các hành động nhạy cảm cần thêm xác thực và audit.

### 3.3 Chat-native Admin Surfaces

Các surface này dành cho thao tác nhanh:

1. Telegram bot menu
2. Zalo Web App hoặc mini admin surface
3. Menu hành động nhanh trong chat

Các tác vụ phù hợp:

1. Duyệt bill vừa OCR xong
2. Xem trạng thái đơn/tác vụ
3. Bật hoặc tạm dừng một workflow
4. Xem tóm tắt doanh số/ngày
5. Mở sâu vào web admin khi cần chỉnh cấu hình

---

## 4. USE CASE COMMERCE CHUNG CHO SMB

### 4.1 Omnichannel lead intake

Người bán nhận khách từ nhiều nguồn:

1. Zalo
2. Messenger
3. Telegram
4. Form hoặc link ngoài
5. Các trang bán hàng online hoặc landing pages

VClaw cần:

1. Gom lead vào một nơi.
2. Gắn nguồn lead.
3. Gắn trạng thái lead.
4. Gợi ý follow-up.

### 4.2 Assisted selling

VClaw hỗ trợ người bán:

1. Gợi ý trả lời nhanh.
2. Gợi ý nội dung chốt đơn.
3. Tạo QR thanh toán.
4. Kiểm bill.
5. Ghi trạng thái giao dịch.

### 4.3 Order-like workflow

Ngay cả khi chưa có OMS hoàn chỉnh, VClaw vẫn nên có workflow đơn giản:

1. Khách quan tâm
2. Đã tư vấn
3. Đã gửi giá/QR
4. Chờ thanh toán
5. Đã thanh toán
6. Đang xử lý
7. Hoàn tất
8. Cần follow-up

Workflow này dùng được cho:

1. Bán sản phẩm
2. Đặt lịch dịch vụ
3. Giữ chỗ
4. Bán gói dịch vụ
5. Sau này mở rộng sang bán vé

### 4.4 Catalog hoặc service listing nhẹ

Ở giai đoạn đầu, VClaw chỉ cần hỗ trợ mức cơ bản:

1. Danh sách sản phẩm
2. Danh sách dịch vụ
3. Giá
4. Mô tả ngắn
5. Tình trạng còn bán

Mục tiêu không phải xây sàn thương mại điện tử, mà là giúp agent có đủ ngữ cảnh để bán hàng và tư vấn.

### 4.5 Follow-up và retention

VClaw nên giúp người bán không quên khách:

1. Nhắc khách chưa phản hồi
2. Nhắc khách chưa thanh toán
3. Nhắc khách đến lịch hẹn
4. Chăm sóc sau bán hàng
5. Gợi ý khách quay lại

---

## 5. DATA OBJECTS TỐI THIỂU

Các đối tượng dữ liệu tối thiểu nên có trong lớp commerce:

### 5.1 Customer

1. Tên
2. Kênh đến
3. Thông tin liên hệ
4. Nhãn/tag
5. Lịch sử tương tác

### 5.2 Lead

1. Nguồn lead
2. Nhu cầu
3. Trạng thái
4. Người phụ trách hoặc agent xử lý
5. Mốc follow-up tiếp theo

### 5.3 Order-like entity

1. Mã giao dịch
2. Khách hàng
3. Giá trị
4. Trạng thái
5. Bằng chứng thanh toán
6. Ghi chú vận hành

### 5.4 Catalog or service item

1. Tên
2. Loại
3. Giá
4. Trạng thái
5. Metadata cơ bản

---

## 6. LỘ TRÌNH MỞ RỘNG THEO VERTICAL

### 6.1 Generic SMB trước

Phải hoàn thiện trước:

1. Lead intake
2. Follow-up
3. Payment assist
4. Booking/service workflow
5. Basic commerce admin

### 6.2 Ticketing và đại lý bán hàng sau

Khi generic commerce đã ổn định, mới mở rộng sang:

1. Vé vui chơi B2C
2. Vé du lịch
3. Attraction reseller
4. Đại lý B2B phân phối nhiều nền tảng

Khi đó, sản phẩm mới cần thêm:

1. Inventory hoặc quota sync
2. Chính sách giá đại lý
3. Booking reference / ticket code
4. Reconciliation với đối tác
5. Multi-supplier mapping

---

## 7. QUYẾT ĐỊNH UX QUAN TRỌNG

1. Dashboard phải nói bằng ngôn ngữ nghiệp vụ như `Khách hàng`, `Đơn`, `Thanh toán`, `Lịch hẹn`, `Kênh bán`.
2. Không đẩy các khái niệm như `session`, `agent`, `routing`, `tool policy` ra mặt tiền cho user SMB.
3. Mọi cấu hình kênh và workflow chính phải qua wizard hoặc form.
4. Các xác nhận nhạy cảm phải hiển thị rõ "đề xuất từ AI" và "quyết định của người dùng".

---

## 8. KẾT LUẬN

VClaw không nên chỉ được nhìn như một hệ thống kỹ thuật hay một giao diện DevOps "Mission Control" thuần túy fork từ OpenClaw. Để sống sót và tạo rễ tại thị trường SMB, nó phải trở thành:

1. Một `web-based operations console (CRM-lite)` cực kỳ dễ cài đặt bằng 1-click installer.
2. Một `commerce operations assistant` hỗ trợ gom lead, kiểm soát bill, theo dõi đơn và follow-up theo cơ chế trợ lý tự động báo cáo qua hộp thư cần duyệt.
3. Một nền tảng có thể mở rộng dần sang các vertical như ticketing hoặc đại lý bán hàng đa nền tảng sau khi lõi generic commerce đã được chứng minh.
