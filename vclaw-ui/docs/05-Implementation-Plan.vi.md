# KẾ HOẠCH TRIỂN KHAI KỸ THUẬT (TECHNICAL IMPLEMENTATION PLAN)
## DỰ ÁN: VClaw - MVP trợ lý vận hành local-first cho hộ kinh doanh nhỏ tại Việt Nam

---

## 1. MỤC TIÊU CỦA KẾ HOẠCH

Tài liệu này mô tả cách triển khai MVP của VClaw phù hợp với BRD và kiến trúc hệ thống đã cập nhật. Mục tiêu là đưa ra một kế hoạch kỹ thuật khả thi theo hướng `growth + operations assistant`, bắt đầu từ một phân khúc người dùng chính, một kênh giao tiếp chính, một lõi vận hành đủ mạnh và một lớp growth đủ nhẹ để tạo giá trị sớm:

1. Tạo VietQR theo ngữ cảnh chat.
2. Xác minh ảnh chuyển khoản ở mức hỗ trợ.
3. Chuẩn hóa địa chỉ và ước tính giao vận.
4. Quản lý lịch hẹn cơ bản và nhắc lịch.
5. Content assistance, lead follow-up và auto consultation có guardrail ở mức near-term.

Kế hoạch này không bao gồm các hạng mục ngoài phạm vi MVP như tự sinh code, tự cập nhật logic nghiệp vụ, tự mở rộng đa ngành đồng thời hoặc tự động thao tác rộng trên hệ điều hành.

---

## 2. NGUYÊN TẮC TRIỂN KHAI

1. **Triển khai một luồng end-to-end trước:** Hoàn thiện một kênh giao tiếp và một bộ workflow vận hành hoàn chỉnh trước khi mở rộng.
2. **Ưu tiên giá trị sát doanh thu:** Các hạng mục giúp chốt thanh toán, xử lý địa chỉ, xác nhận giao dịch, giữ lịch hẹn và nuôi lead được làm trước.
3. **Thiết kế có thể pilot sớm:** Mỗi phase phải tạo ra một kết quả kiểm thử được với người dùng thật hoặc nội bộ.
4. **AI hỗ trợ, không tự quyết:** Mọi kết quả OCR, chuẩn hóa địa chỉ hoặc suy luận từ hội thoại cần có ngưỡng xác nhận phù hợp.
5. **Giữ chi phí tích hợp thấp:** Chỉ tích hợp các nhà cung cấp thật sự cần cho MVP và near-term growth.
6. **Web-first & CRM-lite UI:** Trải nghiệm quản trị chính không phải là bảng điều khiển kỹ thuật (Mission Control) mà là giao diện kinh doanh CRM-lite (Bàn làm việc số); CLI là lớp phụ cho dev/ops.
7. **Growth automation có guardrail:** Content, follow-up, outbound hay auto consultation chỉ đi vào theo mô hình draft, approval queue và policy rõ ràng trước.

### 2.1 Phương thức xây dựng: dùng OpenClaw để phát triển VClaw

VClaw được triển khai theo mô hình `product-fork` trên OpenClaw. Điều đó có nghĩa là đội phát triển không xây một hệ thống mới hoàn toàn, mà tận dụng chính OpenClaw làm nền tảng vận hành và đồng thời dùng OpenClaw agent workflow để tiếp tục phát triển VClaw.

Chiến lược triển khai:

1. Dùng OpenClaw Gateway, Control UI, session runtime, plugin system và config model làm nền vận hành ban đầu.
2. Tạo các agent/workspace chuyên biệt để làm việc trực tiếp trên repo VClaw.
3. Dùng chính các surface của OpenClaw như Control UI, chat channels hoặc CLI để điều phối tác vụ phát triển, kiểm thử và rà soát thay đổi.
4. Theo dõi rõ ranh giới giữa phần `upstream reusable`, phần `VClaw customization`, và phần `VClaw-only business modules`.

Nguyên tắc ra quyết định:

1. Nếu một yêu cầu có thể đạt được bằng plugin, tool, config, system prompt hoặc UI label, ưu tiên làm theo hướng extension.
2. Nếu một yêu cầu đòi hỏi thay đổi hành vi control plane, protocol, routing, onboarding shell hoặc config schema lõi, mới đưa vào nhánh core fork.
3. Mọi thay đổi vào core phải được ghi nhận như một điểm divergence chiến lược với upstream OpenClaw.

### 2.2 Hiện trạng Commerce Admin trong repo (cập nhật theo code `vclaw-ui`)

Phần này mô tả **những gì đã nối Prisma + UI thật** trên Admin Console (Next.js, SQLite `business.sqlite`), để đối chiếu với lộ trình 16 tuần ở các mục sau — không thay thế BRD, chỉ ghi nhận tiến độ kỹ thuật.

#### Đã làm được (luồng nội bộ “cửa hàng tối thiểu” + pilot)

1. **Sản phẩm:** CRUD (tạo / sửa / xóa), trạng thái lưu kho (`ACTIVE` / `ARCHIVED`), nhập URL ảnh; AI bóc tách ảnh và marketing vẫn **mock** (chưa gọi OpenClaw production).
2. **Khách hàng:** danh sách, form thêm–sửa, xóa; trường kênh, nhãn (text/JSON tuỳ nhập).
3. **Đơn hàng:** Kanban theo trạng thái (`PENDING`, `PAID`, `PROCESSING`, `DONE`, `FOLLOW_UP`); tạo đơn từ admin (chọn khách, số tiền, trạng thái); đổi trạng thái từng đơn qua form.
4. **Thanh toán:** bảng `Payment` theo đơn — cập nhật trạng thái (`PENDING` / `COMPLETED` / `FAILED`), URL bill (`evidenceImage`); màn **Bill verification** vẫn gắn `Task` loại `PAYMENT_REVIEW` (duyệt → `DONE`).
5. **Dashboard:** hộp thư tác vụ `Task` trạng thái `NEW` — nút duyệt gọi server action (đánh dấu `DONE`); map type DB (`PAYMENT_REVIEW`, …) sang icon inbox.
6. **Onboarding / cửa hàng:** model `ShopSettings` (singleton `default`) — tên shop, kênh ưu tiên, URL ảnh VietQR/QR, thông tin bank dạng text (lưu SQLite).
7. **Lịch hẹn:** CRUD `Booking` theo ngày (query `?date=`), chọn khách, dịch vụ, giờ; đổi trạng thái / xóa.
8. **Giao vận:** chuẩn hóa địa chỉ qua gateway; **báo phí GHN thật** khi có `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_TO_DISTRICT_ID`, `GHN_TO_WARD_CODE` — không đủ env thì báo giá mock; **ghi chú + ước phí** trên `Order`.
9. **Tích hợp (pilot Zalo OA):** **OAuth** `/api/auth/channel/zalo/*` lưu token vào `ChannelConnection` (và hồ sơ OA tuỳ chọn qua `openapi.zalo.me` getprofile); trang Tích hợp hiển thị webhook `POST /api/webhooks/channel/zalo`, hồ sơ đã lưu khi API trả về, và liên kết cổng đối tác theo từng kênh. Kênh khác dùng cờ « đã cấu hình » thủ công cho tới khi có OAuth.
10. **Luồng kênh:** `Conversation` + `ConversationMessage`; webhook Zalo chuẩn hóa `user_send_text` / `user_send_image`; tin đầu thread tạo `Task` `CHANNEL_MESSAGE`.
11. **Inbox:** danh sách thread thật + chi tiết `?thread=`; hàng đợi tác vụ duyệt như cũ.
12. **Tự động hóa (pilot):** `AutomationJob` có `draftContent` + `approvalStatus` (nháp → **Duyệt** trước **Hoàn tất**); chưa gọi API đăng bài ra kênh.
13. **Cầu nối OpenClaw:** `POST /api/vclaw/agent-tools` (Bearer `VCLAW_AGENT_TOOLS_SECRET`) — tool `vclaw.order.create`, `vclaw.payment.create_pending`, `vclaw.conversation.append_outbound_draft`; bảng `AgentToolLog`.
14. **Chat admin AI:** mỗi hội thoại có `openclawSessionKey` (`agent:main:vclaw-ui-*`) lưu trình duyệt để tách session gateway.
15. **Báo cáo:** số liệu thật Prisma + xuất CSV SKU `ACTIVE`.
16. **Dữ liệu mồi:** `npx prisma db seed` — idempotent.

#### Chưa đạt / vẫn ngoài phạm vi pilot này

- VietQR sinh từ chat thật, OCR/vision bill **production** qua OpenClaw (gateway có route nhưng luồng admin vẫn coi là hỗ trợ + mock chỗ cần).
- Đồng bộ đơn/tồn Shopee; đăng bài tự động ra API kênh sau duyệt (đã có duyệt nháp; chưa gọi mạng publish).
- Widget chat góc phải là **webchat operator** tới OpenClaw (khác thread khách Zalo).

#### Tham chiếu file (rút gọn)

- Schema & seed: `vclaw-ui/prisma/schema.prisma`, `vclaw-ui/prisma/seed.ts`
- Server / lib: `vclaw-ui/lib/actions/*.ts`, `vclaw-ui/lib/orders.ts`, `vclaw-ui/lib/tasks.ts`, `vclaw-ui/lib/payments.ts`, `vclaw-ui/lib/revalidate-admin.ts`, `vclaw-ui/lib/inbox-task-type.ts`, `vclaw-ui/lib/report-stats.ts`, `vclaw-ui/lib/channel-ingest.ts`, `vclaw-ui/lib/zalo-webhook.ts`, `vclaw-ui/lib/zalo-oa-public-profile.ts`, `vclaw-ui/lib/vclaw-agent-tools.ts`, `vclaw-ui/lib/ghn-quote.ts`, `vclaw-ui/lib/ghtk-quote.ts`, `vclaw-ui/lib/channel-pilot.ts`
- API: `vclaw-ui/app/api/webhooks/channel/zalo/route.ts`, `vclaw-ui/app/api/auth/channel/zalo/*/route.ts`, `vclaw-ui/app/api/vclaw/agent-tools/route.ts`
- UI admin: `vclaw-ui/app/[locale]/admin/**`, `vclaw-ui/components/admin/**`
- i18n: `vclaw-ui/messages/vi/admin.json`, `vclaw-ui/messages/en/admin.json`

Lệnh dev gợi ý: `pnpm dev` trong `vclaw-ui`; sau khi đổi schema: `npx prisma db push`; nạp mồi: `npx prisma db seed` (cấu hình seed trong `package.json` → `prisma.seed`).

---

## 3. PHẠM VI TRIỂN KHAI MVP

### 3.1 Trong phạm vi

1. Local app runtime.
2. Local Web UI cho onboarding, cấu hình và kiểm tra lịch sử tác vụ.
3. Một channel adapter chính.
4. Local database cho cấu hình và dữ liệu vận hành.
5. Bốn module nghiệp vụ FR1-FR4.
6. Logging, error handling cơ bản và audit trail.
7. Một lớp growth nhẹ gồm content draft, follow-up và auto consultation có kiểm soát.

### 3.2 Ngoài phạm vi

1. Đa channel end-to-end trong cùng phase.
2. Các vertical-specific flows như KOL, bất động sản, split bill F&B, debt collection.
3. Upstream auto-sync và auto-generated skills.
4. Workflow tạo vận đơn tự động hoàn chỉnh nếu chưa có nhu cầu pilot rõ ràng.
5. Hệ thống phân quyền phức tạp hoặc multi-tenant enterprise.
6. Full autopilot cho quảng cáo, outbound hoặc đa kênh đồng thời không có policy guardrail.

---

## 4. CÁC WORKSTREAM CHÍNH

### 4.1 Workstream A - Nền tảng ứng dụng local

Phạm vi:

1. Thiết lập runtime local ổn định.
2. Chuẩn hóa cấu hình môi trường.
3. Khởi tạo local database và cơ chế lưu cấu hình.
4. Thiết lập logging và audit history tối thiểu.

Kết quả đầu ra:

1. Ứng dụng có thể khởi chạy ổn định trên môi trường phát triển.
2. Có cơ chế lưu và nạp cấu hình cục bộ.
3. Có trang cấu hình cơ bản cho kết nối channel và thông tin nghiệp vụ thiết yếu.

### 4.2 Workstream B - Channel integration

Phạm vi:

1. Chọn một kênh chat chính cho MVP.
2. Chuẩn hóa event intake và format message nội bộ.
3. Xây dựng lớp adapter tách biệt với nghiệp vụ.

Kết quả đầu ra:

1. Tin nhắn đi và đến được nhận ổn định qua một channel.
2. Có luồng nhận text, ảnh và metadata cơ bản.
3. Có khả năng gửi phản hồi, ảnh QR và thông báo ra cùng kênh hoặc kênh bổ trợ.

### 4.3 Workstream C - Payment workflows

Phạm vi:

1. Tạo QR từ số tiền và nội dung tham chiếu.
2. Tạo luồng bill verification với OCR/vision.
3. Thiết kế mức độ tin cậy và xác nhận người dùng.

Kết quả đầu ra:

1. Người dùng có thể tạo VietQR từ chat hoặc form.
2. Người dùng có thể tải ảnh bill và nhận kết quả kiểm tra hỗ trợ.
3. Mọi kết quả đều được ghi lịch sử để tra soát.

### 4.4 Workstream D - Shipping workflows

Phạm vi:

1. Chuẩn hóa địa chỉ từ tiếng Việt tự nhiên.
2. Kết nối một nhà cung cấp giao vận để lấy phí ước tính.
3. Trả kết quả về UI hoặc channel.

Kết quả đầu ra:

1. Địa chỉ được chuyển về dạng có cấu trúc tốt hơn.
2. Có thể lấy phí ship ước tính cho trường hợp thành công.
3. Có fallback khi địa chỉ thiếu hoặc API ngoài lỗi.

### 4.5 Workstream E - Booking workflows

Phạm vi:

1. Tạo lịch hẹn cơ bản.
2. Kiểm tra khung giờ trống từ local database.
3. Gửi nhắc lịch theo template.

Kết quả đầu ra:

1. Có thể tạo, sửa trạng thái và xem lịch hẹn cơ bản.
2. Có một cơ chế nhắc lịch tối thiểu.
3. Có log cho từng lần gửi nhắc.

### 4.6 Workstream F - Onboarding và pilot readiness

Phạm vi:

1. Tối giản luồng cài đặt.
2. Chuẩn bị dữ liệu mẫu và checklist pilot.
3. Thiết kế đo usage, retention và lỗi.

Kết quả đầu ra:

1. Có checklist triển khai cho người dùng pilot.
2. Có biểu mẫu hoặc cách thu thập phản hồi sau dùng thử.
3. Có dashboard hoặc báo cáo đủ để đánh giá MVP.

### 4.7 Workstream G - Fork foundation và reusable core alignment

Phạm vi:

1. Xác định rõ phần nào của OpenClaw được giữ nguyên.
2. Xác định phần nào của OpenClaw sẽ được rebrand hoặc productize thành VClaw.
3. Thiết lập quy trình đồng bộ giữa VClaw fork và upstream OpenClaw.

Kết quả đầu ra:

1. Danh sách reusable core components.
2. Danh sách planned divergences ở mức core.
3. Quy tắc plugin-first vs core-fork cho đội phát triển.
4. Tài liệu vận hành cho dev workflow dùng chính OpenClaw để phát triển VClaw.

### 4.8 Workstream H - Admin UX và operations console

Phạm vi:

1. Loại bỏ layout DevOps Mission Control của Control UI nguyên bản. Build mới Operations Console riêng rẽ (VD: Stack Next.js/React).
2. Thiết kế màn hình quản trị theo luồng kinh doanh (Human-in-the-loop task inbox) thay cho concept "Terminal/Logging" kỹ thuật.
3. Chiến lược Desktop-First: Đóng gói project thành ứng dụng Native (.app/.exe) sử dụng Swift host (macOS). Native Shell sẽ điều phối việc chạy Next.js Standalone Server (Port 12687) và OpenClaw Core (Port 12687) dưới dạng Sidecar. Cơ chế này giúp giữ lại Middleware và Server Actions cho các logic nghiệp vụ phức tạp.

Kết quả đầu ra:

1. Localhost admin console có thể dùng cho onboarding và vận hành hằng ngày.
2. Có mô hình truy cập remote an toàn để bật khi cần.
3. Có danh sách admin quick actions phù hợp để triển khai qua Telegram bot menu hoặc Zalo Web App ở phase sau.

### 4.9 Workstream I - Generic SMB commerce use cases

Phạm vi:

1. Xác định nhóm use case thương mại chung cho SMB ngoài phần setup kỹ thuật.
2. Thiết kế dữ liệu và workflow cho lead, đơn hàng, follow-up và catalog nhẹ.
3. Giữ kiến trúc mở để sau này gắn thêm các vertical như ticketing hoặc travel reseller.

Kết quả đầu ra:

1. Danh sách use case thương mại chung ưu tiên.
2. Mô hình dữ liệu tối thiểu cho customer, lead, order-like workflow và catalog/service entry.
3. Lộ trình mở rộng từ generic commerce sang vertical-specific commerce.

### 4.10 Workstream J - Growth assistance và seller automation

Phạm vi:

1. Viết content draft cho bài đăng, caption và thông điệp bán hàng.
2. Tạo campaign draft hoặc lịch follow-up theo tệp khách.
3. Hỗ trợ auto consultation cho các intent lặp lại có cấu trúc rõ.
4. Thiết kế approval queue, rate limit và channel policy cho outbound workflows.

Kết quả đầu ra:

1. Có lớp `draft before automation` cho content và follow-up.
2. Có ít nhất một workflow lead follow-up hoặc content assistance dùng được trong pilot mở rộng.
3. Có guardrail rõ cho auto consultation và outbound messaging.

### 4.11 Workstream K - Browser Automation & Web Adapters

Phạm vi:

1. Thiết lập cơ chế điều khiển Playwright từ OpenClaw SDK.
2. Xây dựng adapter cho Zalo Web (Personal Account).
3. Triển khai luồng đăng nhập Headful (quét mã) và chạy ngầm Headless.
4. Quản lý Browser Profiles để lưu session an toàn.

Kết quả đầu ra:

1. Có thể mở trình duyệt để người dùng đăng nhập Zalo/Facebook từ UI.
2. Agent có thể đọc tin nhắn và trả lời qua giao diện Web của nền tảng ngầm.
3. Cookies/Session được lưu trữ cục bộ ổn định.

### 4.12 Workstream L - Global VClaw Assistant Support

Phạm vi:

1. Xây dựng Client Component cho khung chat nổi (Trợ lý VClaw).
2. Tích hợp logic streaming (SSE) thông qua gateway-client.
3. Thiết kế giao diện hỗ trợ cả mobile và desktop.
4. Triển khai lệnh điều hướng (Contextual commands).

Kết quả đầu ra:

1. Có Trợ lý VClaw túc trực trên toàn hệ thống Dashboard.
2. AI phản hồi mượt mà và nhận diện ngữ cảnh Dashboard.

---

## 5. LỘ TRÌNH TRIỂN KHAI 16 TUẦN

### Phase 1 - Xác thực bài toán và chốt phạm vi (Tuần 1-2)

Mục tiêu:

1. Chốt một phân khúc pilot và một channel chính.
2. Chuyển BRD thành use case cụ thể.
3. Chốt danh sách tích hợp ngoài thật sự cần cho MVP.

Hạng mục:

1. Xác định persona pilot và các tình huống sử dụng hằng ngày.
2. Chốt workflow `tạo QR`, `kiểm bill`, `địa chỉ/ship`, `lịch hẹn`.
3. Chốt cấu trúc dữ liệu local tối thiểu.
4. Chốt nguyên tắc xác nhận người dùng trong các luồng có rủi ro.
5. Chốt danh sách reusable OpenClaw components và các điểm dự kiến product-fork.
6. Chốt các tác vụ quản trị chính phải xuất hiện trong web admin cho non-technical users.

Tiêu chí hoàn thành:

1. Có danh sách use case ưu tiên và acceptance criteria cho FR1-FR4.
2. Có quyết định rõ về channel chính và các nhà cung cấp tích hợp.
3. Có bản đồ dữ liệu và workflow đủ để bắt đầu xây dựng.
4. Có phân loại rõ `reuse vs customize vs fork-core`.
5. Có danh sách admin workflows và commerce workflows ưu tiên.

### Phase 2 - Xây nền tảng MVP (Tuần 3-6)

Mục tiêu:

1. Hoàn thành runtime local, cấu hình và channel adapter đầu tiên.
2. Có local UI và local database hoạt động.
3. Có audit logging và error handling cơ bản.

Hạng mục:

1. Thiết lập local environment và configuration storage.
2. Xây Local Web UI (Next.js/React) cho onboarding thân thiện và kiểu phần mềm kinh doanh.
3. Tạo `Workflow Orchestrator` và event schema thống nhất.
4. Tích hợp channel chính để nhận text và ảnh.
5. Bổ sung lịch sử tác vụ vào giao diện Operations Admin.
6. Thiết lập nhánh product-fork ban đầu: rebrand cơ bản, agent identity và config defaults cho VClaw.
7. Triển khai màn hình Human-in-the-loop task inbox.

Tiêu chí hoàn thành:

1. Có thể cấu hình và kết nối channel chính từ local UI.
2. Có thể nhận message đầu vào và hiển thị log xử lý.
3. Có skeleton workflow cho các module nghiệp vụ.
4. Có môi trường dev mà OpenClaw đang được dùng để hỗ trợ phát triển chính repo VClaw.
5. Admin console đủ đơn giản để một người dùng pilot có thể tự làm các bước thiết lập cơ bản.

### Phase 3 - Hoàn thiện capability lõi (Tuần 7-10)

Mục tiêu:

1. Triển khai FR1-FR4 đủ dùng cho pilot.
2. Kiểm thử từng luồng với dữ liệu mô phỏng và dữ liệu thử nghiệm.

Hạng mục:

1. Hoàn thiện module tạo VietQR.
2. Hoàn thiện module xác minh bill với kết quả hỗ trợ.
3. Hoàn thiện module chuẩn hóa địa chỉ và lấy phí ship ước tính.
4. Hoàn thiện module lịch hẹn và nhắc lịch cơ bản.
5. Triển khai Zalo Web Adapter (Personal) bằng Playwright: cho phép trực tin nhắn tài khoản cá nhân.
6. Thêm message templates và xác nhận người dùng ở các điểm cần thiết.
7. Gắn các workflow trên vào admin console để người dùng không cần thao tác qua CLI.

Tiêu chí hoàn thành:

1. Cả 4 luồng chạy end-to-end trên môi trường nội bộ.
2. Lỗi phổ biến được hiển thị rõ ràng cho người dùng.
3. Có đủ logging để theo dõi tác vụ thành công/thất bại.
4. Các thao tác vận hành phổ biến thực hiện được qua web admin.

### Phase 4 - Near-term Growth Layer (Tuần 11-14)

Mục tiêu:

1. Bổ sung lớp growth đủ nhẹ nhưng tạo giá trị sớm cho người bán online.
2. Giữ nguyên nguyên tắc human-in-the-loop và policy-first cho mọi luồng outbound.

Hạng mục:

1. Thêm content drafting cho bài đăng, caption hoặc sales script.
2. Thêm lead follow-up draft và lịch nhắc theo trạng thái khách.
3. Thêm auto consultation có guardrail cho các intent lặp lại.
4. Thiết kế approval queue cho content, follow-up và outbound actions.
5. Gắn source/channel awareness vào lead hoặc order-like records khi có dữ liệu.

Tiêu chí hoàn thành:

1. Có ít nhất một growth workflow được dùng thử cùng với lõi vận hành.
2. Không có outbound flow nào chạy mà không có policy hoặc approval rule rõ ràng.
3. Người dùng pilot bắt đầu nhìn VClaw như công cụ vừa hỗ trợ tăng trưởng vừa hỗ trợ vận hành.

### Phase 5 - Pilot và tinh gọn (Tuần 15-16)

Mục tiêu:

1. Đưa sản phẩm cho nhóm pilot nhỏ dùng thật.
2. Đo adoption, thời gian xử lý và lỗi.
3. Tinh gọn luồng trước khi quyết định mở rộng.

Hạng mục:

1. Onboard nhóm pilot đầu tiên.
2. Theo dõi số lượt tạo QR, kiểm bill, tra ship, tạo lịch và dùng growth workflows.
3. Ghi nhận vấn đề về onboarding, tích hợp, outbound policy và chất lượng AI.
4. Ưu tiên sửa lỗi và loại bỏ các bước gây cản trở.
5. Kiểm tra nhu cầu truy cập remote và các admin actions phù hợp cho chat-native surfaces.
6. Phát hành bản Beta Desktop (.dmg) tích hợp Standalone Dashboard và Core Engine.

Tiêu chí hoàn thành:

1. Có dữ liệu sử dụng tối thiểu 2 tuần từ nhóm pilot.
2. Có báo cáo tổng kết những gì hoạt động và những gì chưa đạt.
3. Có quyết định rõ cho bước mở rộng tiếp theo.
4. Có quyết định rõ `localhost only` hay `remote-enabled by default` cho phase kế tiếp.

---

## 6. THỨ TỰ ƯU TIÊN TÍNH NĂNG

### P1 - Phải có cho pilot

1. Local setup và cấu hình cơ bản.
2. Một channel adapter chính.
3. VietQR generation.
4. Bill verification ở mức hỗ trợ.
5. Address normalization và ship fee estimate.
6. Booking và reminder cơ bản.
7. Audit log và error handling tối thiểu.
8. Fork foundation rõ ràng giữa OpenClaw core và VClaw product layer.
9. Admin console usable cho non-technical pilot users.

### P2 - Nên có nếu P1 ổn định sớm

1. Mẫu phản hồi theo ngữ cảnh.
2. Báo cáo tác vụ hằng ngày.
3. Rule nhắc lại nâng cao.
4. Remote web access có kiểm soát.
5. Admin quick actions qua chat-native surfaces.
6. Content drafting và campaign draft ở mức queue duyệt.
7. Lead follow-up có guardrail.
8. Auto consultation cho intent lặp lại có cấu trúc rõ.

### P3 - Để sau MVP

1. Multi-channel support đồng thời.
2. Vertical-specific workflows cho từng ngành.
3. Đồng bộ cloud hoặc quản trị nhiều thiết bị.
4. Tạo vận đơn tự động.
5. Các cơ chế gợi ý tính năng từ dữ liệu sử dụng.
6. Phân tích thị trường, tìm lead và hỗ trợ quảng bá tự động.
7. Các lớp tự cải tiến như skill discovery hoặc sandbox prototyping.
8. Vertical-specific commerce như ticketing, attraction sales hoặc đại lý B2B.
9. Outbound automation quy mô lớn hoặc auto-publish đa nền tảng không cần duyệt.

---

## 7. PHỤ THUỘC KỸ THUẬT

1. Một channel tích hợp có thể dùng ổn định cho pilot.
2. Một dịch vụ QR hoặc cơ chế tạo VietQR phù hợp.
3. Một nhà cung cấp OCR/vision đủ tốt với ảnh chuyển khoản thực tế.
4. Một đối tác giao vận có API cho phí ship hoặc dữ liệu địa chỉ.
5. Cơ chế thông báo hoặc gửi nhắc phù hợp với channel đã chọn.
6. Tài liệu OpenClaw đủ rõ để xác định các extension points như gateway, config, control UI, plugins và system prompt.
7. Policy engine hoặc rule layer đủ rõ để kiểm soát outbound, follow-up và auto consultation.

Nếu một phụ thuộc không ổn định, nhóm triển khai cần có phương án fallback ngay từ đầu, ví dụ:

1. Chuyển từ tự động sang bán tự động.
2. Yêu cầu xác nhận tay nhiều hơn.
3. Giảm phạm vi module chịu ảnh hưởng.

### 7.1 Phụ thuộc nền tảng từ OpenClaw

VClaw phụ thuộc mạnh vào một số trụ cột của OpenClaw:

1. Gateway là single source of truth cho sessions, routing và channel connections.
2. Control UI là lớp browser control plane chạy trên cùng cổng với gateway.
3. Plugin runtime là extension point chủ đạo để thêm channel, tool, hook, CLI command và background services.
4. Config model cung cấp điểm cấu hình tập trung cho channel, tools, agents, gateway và plugins.
5. System prompt assembly là cơ chế phù hợp để inject business context, identity và skills mà không phải tự viết lại toàn bộ runtime prompt stack.

---

## 8. KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG

### 8.1 Kiểm thử cần có

1. Unit test cho từng module xử lý dữ liệu.
2. Integration test cho channel adapter và các provider ngoài.
3. End-to-end test tối thiểu cho 4 luồng chính.
4. Manual pilot checklist cho onboarding và các tình huống lỗi phổ biến.

### 8.2 Dữ liệu kiểm thử cần chuẩn bị

1. Tin nhắn mẫu có số tiền và nội dung thanh toán.
2. Ảnh chuyển khoản thành công, sai số tiền, sai nội dung và ảnh chất lượng thấp.
3. Bộ địa chỉ tiếng Việt đa dạng mức độ chuẩn hóa.
4. Bộ lịch hẹn mẫu cho dịch vụ nhỏ.
5. Bộ prompt/content mẫu cho quảng bá, follow-up và auto tư vấn.

### 8.3 Tiêu chí chất lượng trước pilot

1. Luồng cài đặt không yêu cầu thao tác terminal.
2. Mỗi luồng chính đều có kết quả thành công và cách báo lỗi dễ hiểu.
3. Không có hành động nghiệp vụ quan trọng nào diễn ra mà không có log hoặc lịch sử tra cứu.
4. Không có outbound workflow nào chạy mà thiếu policy, approval state hoặc audit trail.

---

## 9. RỦI RO TRIỂN KHAI

| Rủi ro | Ảnh hưởng | Hướng xử lý |
|---|---|---|
| Chọn sai channel đầu tiên | Làm chậm toàn bộ MVP do vướng tích hợp | Đánh giá channel theo tiêu chí ổn định, khả năng pilot và chi phí hỗ trợ |
| OCR không đủ chính xác | Bill verification gây mất niềm tin | Thiết kế theo hướng hỗ trợ xác nhận, không tự chốt |
| Địa chỉ thực tế quá đa dạng | Ship estimate sai hoặc thất bại nhiều | Chuẩn bị bộ dữ liệu địa chỉ thật và thêm bước chỉnh sửa tay |
| Onboarding khó | Người dùng bỏ giữa chừng | Giảm số bước cài đặt, có checklist và màn hình hướng dẫn |
| Phạm vi bị phình | Mất focus, trễ pilot | Khóa chặt P1/P2/P3 ngay từ đầu |
| Divergence với upstream OpenClaw quá lớn | Chi phí bảo trì fork tăng nhanh | Áp dụng nguyên tắc plugin-first, ghi rõ các core divergences và rà soát định kỳ |
| Growth automation gây spam hoặc sai thông điệp | Mất niềm tin, ảnh hưởng thương hiệu người bán | Policy-first, approval queue, rate limit và rollback sang draft mode |

---

## 10. ĐẦU RA KỲ VỌNG SAU MVP

Sau 12 tuần, đội triển khai nên có:

1. Một bản VClaw MVP chạy local, có thể dùng với một kênh chat chính.
2. Bốn capability lõi hoạt động đủ ổn định để pilot.
3. Một lớp growth assistance nhẹ hoạt động đủ tốt để thử nghiệm thật.
4. Dữ liệu sử dụng và phản hồi thật từ nhóm người dùng đầu tiên.
5. Cơ sở để quyết định mở rộng theo vertical, mở thêm channel hoặc tăng mức tự động hóa.

---

## 11. KẾ HOẠCH MỞ RỘNG SAU MVP

### Phase 5 - Business Growth Automation (Tham chiếu: 4-8 tuần sau pilot)

Mục tiêu:

1. Mở rộng VClaw từ trợ lý vận hành sang trợ lý hỗ trợ tăng trưởng doanh thu.
2. Bổ sung các workflow nghiên cứu thị trường, hỗ trợ tìm khách hàng và hỗ trợ quảng bá có kiểm soát.

Hạng mục:

1. Xây `Market Intelligence Module` để tổng hợp tín hiệu thị trường và xu hướng ngành.
2. Xây `Lead Discovery Module` để xác định và xếp hạng khách hàng tiềm năng theo tiêu chí cụ thể.
3. Xây `Campaign Assistant Module` để đề xuất nội dung quảng bá, lịch follow-up và kịch bản bán hàng.
4. Thêm `Sales Automation Guardrail` để kiểm soát tần suất, đối tượng và mức tự động hóa theo từng channel.

Tiêu chí hoàn thành:

1. Người dùng có thể xem insight thị trường hoặc gợi ý lead từ dữ liệu được cho phép.
2. Có thể sinh và duyệt nội dung quảng bá hoặc follow-up theo workflow bán tự động.
3. Không có luồng outreach tự động nào chạy mà không có cấu hình chính sách rõ ràng.

### Phase 6 - Skill Discovery and Self-Improvement R&D (Tham chiếu: sau khi có dữ liệu đủ lớn)

Mục tiêu:

1. Tạo nền tảng để VClaw tự phát hiện cơ hội cải tiến.
2. Đảm bảo mọi năng lực tự cải tiến đều đi qua sandbox và cơ chế phê duyệt.

Hạng mục:

1. Xây `Trend Analysis Engine` từ usage logs, phản hồi người dùng và dữ liệu thị trường.
2. Xây `Skill Discovery Engine` để tạo proposal cho workflow mới, rule mới hoặc module mới.
3. Xây `Sandbox Prototyping Environment` để đánh giá prompt, rule hoặc prototype kỹ thuật.
4. Xây `Approval-Gated Release Pipeline` để quản lý luồng `proposal -> sandbox -> review -> approval -> release`.

Tiêu chí hoàn thành:

1. Hệ thống có thể tự tạo proposal có cấu trúc cho cải tiến mới.
2. Không có mã nguồn hoặc skill mới nào được đưa vào production mà không qua review.
3. Có cơ chế đánh giá và rollback cho mọi thay đổi được phê duyệt.

---

## 12. KẾT LUẬN

Kế hoạch triển khai này được xây dựng để biến VClaw từ một ý tưởng rộng thành một MVP có thể kiểm chứng nhanh. Trọng tâm không phải là tạo ra thật nhiều skill, mà là làm đúng một số workflow có giá trị kinh doanh rõ ràng, vận hành ổn định và đủ tốt để người dùng quay lại sử dụng.

Sau khi MVP chứng minh được giá trị, VClaw có thể mở rộng sang hai hướng lớn: `Business Growth Automation` và `Autonomous Product Evolution`. Cả hai hướng này đều được xem là giai đoạn sau pilot và phải đi kèm cơ chế kiểm soát rủi ro, sandbox và phê duyệt rõ ràng.
