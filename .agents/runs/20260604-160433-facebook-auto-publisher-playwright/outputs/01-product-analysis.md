# facebook-publish - Product Analysis

Phân tích này bám vào BRD/PRD hiện tại của VClaw và scope thực thi đang có trong repo. Mục tiêu của lần hoàn thiện này là làm cho tab `facebook-publish` hiển thị rõ ràng trong admin UI, cho phép người dùng kết nối tài khoản Facebook, soạn bài và chạy một bài đăng thật lên tường cá nhân làm bằng chứng, đồng thời vẫn giữ guardrail `policy -> approval -> audit` cho outbound.

## BRD Mapping
- Module: `Growth Assist Module`, `Commerce Web Adapters`, và surface admin tại `/[locale]/admin/zalouser` với tab `fb_publisher`.
- Source sections: `docs/00-Business-Requirements.vi.md` mục 5.1.1, 7.2, 7.3, 8.2; `docs/02-Product-Requirements-Document.vi.md` mục 2.3, 3.3, 6.1, 7.1, 10.4, 11; `docs/01-System-Architecture.vi.md` mục 4.6, 5.5, 6.1, 6.4; `docs/15-Social-Integration-Solution.vi.md` mục 3.2, 5, 6.
- Actors: Shop owner / admin; operator kiểm thử; hệ thống background worker chạy Playwright; Facebook là external target.
- Data models: `FacebookAccount`, `FacebookPublishJob`; dữ liệu liên quan gồm `ShopSettings.approvalConfigJson` nếu sau này thêm policy queue; lịch sử publish job là audit trail chính.
- Enums/statuses: `FacebookAccount.status` = `CONNECTED`, `DISCONNECTED`, `EXPIRED`; `FacebookPublishJob.status` = `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`, `PENDING_MODERATOR`; `targetType` = `PAGE`, `GROUP`, `PROFILE`.
- Business rules: outbound content phải có bước xác nhận của người dùng; không bật auto-publish hàng loạt mặc định; job thành công phải lưu bằng chứng ảnh và, nếu lấy được, `postUrl`; job lỗi phải lưu `errorMessage`; xử lý các job tuần tự để tránh spam; chỉ dùng dữ liệu Facebook người dùng chủ động cung cấp.
- Open questions: Tab hiển thị trong UI nên chốt nhãn là `Facebook Publish` hay `Facebook Auto-Publisher`; scope release này có giữ `PAGE/GROUP` hay chỉ ưu tiên `PROFILE` để làm bằng chứng; có cần bổ sung bước duyệt riêng trước khi đẩy job sang worker hay không; bằng chứng thành công lưu dưới dạng local path hay URL public.

## User Stories
- US-FB-001: Là admin, tôi muốn thấy một tab Facebook Publish riêng và rõ ràng trong admin để vào đúng chức năng đăng bài mà không phải đi tìm trong các tab khác.
- US-FB-002: Là admin, tôi muốn liên kết tài khoản Facebook bằng cookie/session để hệ thống biết tài khoản nào có thể đăng bài.
- US-FB-003: Là admin, tôi muốn soạn nội dung, chọn đích đăng là tường cá nhân và nhấn Publish để kiểm tra luồng đăng thật end-to-end.
- US-FB-004: Là admin, tôi muốn xem lịch sử job, trạng thái xử lý và ảnh bằng chứng để xác nhận bài đã được đăng hoặc biết lý do thất bại.
- US-FB-005: Là admin, tôi muốn nhận lỗi tiếng Việt rõ ràng khi cookie sai, nội dung trống, tài khoản không tồn tại hoặc Facebook từ chối đăng để tôi sửa và chạy lại.

## Acceptance Criteria

### AC-001 - Tab Facebook Publish hiển thị rõ trong admin UI
- Given: Người dùng mở trang admin `/[locale]/admin/zalouser`.
- When: Hệ thống render danh sách tab.
- Then: Có một tab riêng cho `facebook-publish` với nhãn đủ rõ để người dùng nhận ra đây là chức năng đăng bài Facebook; tab này truy cập được trực tiếp trên desktop và không bị ẩn sau menu kỹ thuật.
- Test notes: Kiểm tra route, nhãn tab, trạng thái mặc định và khả năng chuyển tab bằng test component hoặc integration UI test.

### AC-002 - Kết nối tài khoản Facebook bằng cookie/session
- Given: Người dùng dán cookie Facebook hợp lệ vào form kết nối.
- When: Người dùng xác nhận kết nối.
- Then: Hệ thống lưu một `FacebookAccount` với trạng thái `CONNECTED`, hiển thị tên và avatar nếu lấy được; nếu cookie sai hoặc hết hạn thì trả lỗi tiếng Việt và giữ trạng thái `DISCONNECTED` hoặc `EXPIRED`.
- Test notes: Bao phủ happy path, invalid cookie, thiếu dữ liệu, và Unicode tiếng Việt trong thông báo lỗi.

### AC-003 - Tạo job đăng bài lên tường cá nhân
- Given: Người dùng đã có ít nhất một tài khoản Facebook `CONNECTED`, đã nhập nội dung bài viết và chọn đích `PROFILE`.
- When: Người dùng nhấn Publish.
- Then: Hệ thống tạo `FacebookPublishJob` với trạng thái `QUEUED`, đưa job vào hàng đợi xử lý và bắt đầu chạy Playwright để đăng bài lên tường cá nhân.
- Test notes: Bao phủ request hợp lệ, thiếu `accountId`, thiếu `content`, không có target, và account không tồn tại.

### AC-004 - Ghi nhận kết quả đăng bài và bằng chứng
- Given: Job đang được xử lý bởi background worker.
- When: Playwright đăng thành công hoặc Facebook trả về trạng thái cần duyệt.
- Then: Job được cập nhật thành `SUCCESS` với `evidenceImage` và `postUrl` nếu lấy được, hoặc `PENDING_MODERATOR` nếu bài chờ duyệt; nếu thất bại thì ghi `FAILED` kèm `errorMessage`.
- Test notes: Bao phủ success, pending moderator, failure, và tình huống worker không làm treo toàn bộ hàng đợi.

### AC-005 - Xem lịch sử job và ảnh bằng chứng
- Given: Có ít nhất một job đăng bài đã chạy xong.
- When: Người dùng mở khối lịch sử đăng bài.
- Then: Người dùng xem được thời gian tạo, tài khoản gửi, nội dung, đích đăng, trạng thái và ảnh bằng chứng của job thành công; job lỗi hiển thị thông báo lỗi ngắn gọn.
- Test notes: Bao phủ lịch sử rỗng, job thành công, job thất bại, và thao tác mở/đóng ảnh chứng minh.

### AC-006 - Giữ guardrail cho outbound
- Given: Hệ thống có nhiều job cần xử lý liên tiếp.
- When: Worker chạy hàng đợi.
- Then: Các job được xử lý tuần tự, có khoảng nghỉ giữa các lần chạy để hạn chế hành vi spam, và mọi kết quả đều được ghi audit qua `FacebookPublishJob`.
- Test notes: Bao phủ sequencing, rate-limit delay logic, và không ghi đè trạng thái job khi đang xử lý.

## TDD Handoff
- Suggested API route: `GET/POST /api/automation/facebook-publish` và `GET/POST/DELETE /api/automation/facebook-accounts`.
- Required request fields: `accountId`, `content`, `targets`, `images` cho publish; `cookieText` cho connect account.
- Expected response: JSON tiếng Việt với `success`, `message` hoặc `error`, kèm `jobs` hoặc `account` khi thành công.
- Required negative tests: Nội dung trống, thiếu target, account không tồn tại, cookie sai/hết hạn, target không hợp lệ, Unicode tiếng Việt có dấu, và payload chứa chuỗi giống injection nhưng không phá hỏng xử lý.
- Required security tests: Không log cookie thô, không lộ secret trong response, không cho phép outbound tự chạy hàng loạt không có xác nhận của người dùng, và không để job lỗi làm sập worker hay lặp vô hạn.
