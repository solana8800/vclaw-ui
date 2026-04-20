# TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS DOCUMENT - BRD)
## DỰ ÁN: VClaw - Trợ lý vận hành và bán hàng cho hộ kinh doanh cá nhân tại Việt Nam

---

## 1. TÓM TẮT ĐIỀU HÀNH

VClaw là một **Hệ điều hành kinh doanh (Business OS)** siêu nhẹ, được thiết kế dưới dạng Dashboard quản trị độc lập, chạy trên nền tảng trợ lý AI OpenClaw Core. 

Sản phẩm tập trung vào việc tự động hóa các khâu vận hành tẻ nhạt cho chủ hộ kinh doanh, đồng thời sở hữu cơ sở dữ liệu nghiệp vụ riêng (Prisma + SQLite) để quản lý khách hàng và đơn hàng một cách chuyên nghiệp ngay tại máy tính cục bộ.

Giả thuyết kinh doanh cốt lõi của dự án là: người dùng cá nhân sẽ sẵn sàng cài đặt và duy trì một công cụ AI nếu công cụ đó giúp họ vừa chốt đơn nhanh hơn, vừa duy trì nhịp bán hàng và follow-up tốt hơn, đồng thời giảm thao tác lặp lại và hạn chế thất thoát doanh thu hàng ngày.

Trong giai đoạn MVP, VClaw không theo đuổi tham vọng trở thành nền tảng "đa ngành toàn diện". Thay vào đó, sản phẩm sẽ tập trung vào một nhóm người dùng chính, một số kịch bản giá trị cao và một tập tính năng đủ nhỏ để có thể triển khai, đo lường và lặp lại trong 3-6 tháng.

### 1.1 Chiến lược sản phẩm trên nền OpenClaw

VClaw không được định hướng như một sản phẩm xây mới hoàn toàn từ đầu. Thay vào đó, sản phẩm được phát triển theo mô hình **product fork có kiểm soát** từ OpenClaw, trong đó OpenClaw đóng vai trò là `execution substrate` cho các năng lực nền tảng như gateway, routing, control UI, multi-agent, plugin runtime và cấu hình vận hành.

Các thành phần dự kiến tái sử dụng từ OpenClaw:

1. Gateway chạy lâu dài làm điểm tập trung cho channel connections, session routing và control plane.
2. WebSocket protocol giữa gateway, control UI, CLI và các node.
3. Control UI/dashboard chạy trên cùng cổng gateway để phục vụ chat, cấu hình và trạng thái hệ thống.
4. Mô hình plugin/channel/tool để thêm tích hợp và nghiệp vụ mới mà không cần sửa toàn bộ hệ thống.
5. Hệ thống agent, session, bootstrap context và system prompt assembly.

Các thành phần dự kiến tùy biến thành VClaw:

1. Định vị sản phẩm, onboarding và trải nghiệm phù hợp với hộ kinh doanh nhỏ tại Việt Nam.
2. Bộ workflow nghiệp vụ đặc thù như VietQR, kiểm bill, chuẩn hóa địa chỉ, lịch hẹn và các luồng tăng trưởng kinh doanh như content assistance, lead follow-up, campaign assistance.
3. Lớp policy/confirmation cho các hành động nhạy cảm về thanh toán, vận hành và automation.
4. Hệ thống skill, tool, plugin và dashboard labels phục vụ use case Việt Nam thay vì use case trợ lý cá nhân/coding assistant mặc định.

Nguyên tắc phát triển là:

1. Ưu tiên **kế thừa và cấu hình** trước khi chỉnh sâu core.
2. Ưu tiên **plugin hóa** các năng lực mới nếu không bắt buộc thay đổi protocol, routing hoặc control UI lõi.
3. Chỉ fork sâu vào core OpenClaw khi điều đó tạo ra khác biệt sản phẩm rõ ràng hoặc giúp giảm ma sát cho người dùng mục tiêu của VClaw.

### 1.2 Surface quản trị sản phẩm

VClaw cần được đóng gói theo hướng người dùng không kỹ thuật có thể vận hành qua giao diện web. Do đặc thù đối tượng là SMB Việt Nam, giao diện VClaw **không được phép** mang hình dáng của một "DevOps Mission Control" hay bảng điều khiển kỹ thuật AI (với các thông số CPU, RAM, Terminal). Thay vào đó, nó phải là một **Operations Console (Bàn làm việc số / CRM-lite)** tập trung vào góc nhìn kinh doanh.

Mô hình surface quản trị đề xuất:

1. **Local Web Admin (Operations Console) là surface chính:** chạy trên `localhost`, mang giao diện của một ứng dụng bán hàng. Dùng để xem hộp thư cần duyệt (Human-in-the-loop task inbox), thống kê kinh doanh, kết nối kênh chat, cấu hình thanh toán (VietQR), giao vận và sản phẩm.
2. **Remote Web Access là surface mở rộng:** cho phép người dùng quản trị từ xa qua tunnel an toàn khi có nhu cầu.
3. **Chat-native admin surfaces là surface phụ:** hỗ trợ thao tác nhanh qua Telegram bot menu, Zalo Web App hoặc các menu quản trị nhẹ trong chat.

Nguyên tắc sản phẩm:

1. Trải nghiệm người dùng phải xoay quanh Khách hàng, Đơn hàng, Lịch hẹn và Doanh thu, ẩn đi các khái niệm kỹ thuật của OpenClaw (session, prompt, model token).
2. Tối ưu quá trình cài đặt bằng công cụ đóng gói 1-click (one-click installer) dưới dạng ứng dụng Desktop hoặc file cài, thay vì yêu cầu người dùng phải mở Terminal gõ lệnh.
3. CLI Core của OpenClaw được giữ lại nhưng chỉ dành cho developer, operator và hệ thống tự động.
4. Lớp UI phân tách hoàn toàn khỏi Control UI nguyên bản của OpenClaw để tuỳ biến tối đa thành giao diện E-commerce cho SMB.

---

## 2. BÀI TOÁN KINH DOANH

### 2.1 Bối cảnh

Hộ kinh doanh nhỏ và người bán hàng cá nhân tại Việt Nam thường vận hành qua các kênh chat như Zalo, Facebook Messenger và Telegram, đồng thời còn phải tự xoay xở với đăng bài, trả lời khách, theo lead, xác nhận thanh toán và giao hàng. Quy trình này thường bị phân mảnh qua nhiều công cụ: chat, ảnh chụp chuyển khoản, file Excel, ghi chú thủ công, ứng dụng giao vận, trang bán hàng và các nền tảng social/marketplace.

### 2.2 Vấn đề hiện tại

Các nhóm người dùng mục tiêu thường gặp các vấn đề sau:

1. Trả lời khách chậm hoặc không nhất quán khi đang bận vận hành.
2. Mất thời gian tạo lại cùng một loại nội dung như mã QR thanh toán, tin nhắn xác nhận, tin nhắn nhắc lịch.
3. Khó kiểm tra nhanh ảnh chuyển khoản hoặc thông tin đơn hàng do xử lý thủ công.
4. Thông tin địa chỉ giao hàng và lịch hẹn thường không chuẩn hóa, gây sai sót hoặc chậm xử lý.
5. Người dùng không có nền tảng kỹ thuật nên khó chấp nhận các hệ thống yêu cầu cài đặt phức tạp hoặc thao tác dòng lệnh.
6. Việc viết nội dung quảng bá, lên lịch đăng bài, nhắc lại lead hoặc tư vấn khách lặp lại vẫn phụ thuộc nặng vào thao tác tay.

### 2.3 Cơ hội

Nếu VClaw giải quyết tốt các tác vụ "gần tiền", "lặp lại hằng ngày" và một phần tác vụ tăng trưởng bán hàng có cấu trúc, sản phẩm có thể tạo ra giá trị rõ ràng ngay từ tuần đầu sử dụng, từ đó tăng khả năng giữ chân người dùng và mở rộng sang các nghiệp vụ khác theo từng ngành.

---

## 3. MỤC TIÊU SẢN PHẨM

### 3.1 Mục tiêu giai đoạn MVP

1. Giúp hộ kinh doanh nhỏ xử lý nhanh hơn các bước xác nhận thanh toán, chuẩn hóa đơn giao hàng và nhắc lịch cơ bản.
2. Giảm thao tác thủ công trong các nghiệp vụ lặp lại diễn ra trên chat.
3. Chứng minh rằng mô hình local-first có thể mang lại giá trị thực tế cho người dùng không chuyên kỹ thuật.
4. Từng bước mở rộng từ trợ lý vận hành phản ứng sang trợ lý tăng trưởng và vận hành chủ động cho người bán online.

### 3.2 Chỉ số thành công đề xuất

1. Ít nhất 70% người dùng thử nghiệm hoàn thành được luồng cài đặt và kết nối kênh giao tiếp đầu tiên.
2. Thời gian tạo và gửi mã thanh toán giảm ít nhất 50% so với cách làm thủ công.
3. Ít nhất 3 tác vụ thực tế mỗi ngày được xử lý qua VClaw trên mỗi tài khoản hoạt động.
4. Tỷ lệ người dùng quay lại sau 14 ngày đạt tối thiểu 30% trong nhóm pilot.
5. Có tín hiệu sử dụng thực tế cho ít nhất một capability chủ động như content draft, follow-up hoặc auto consultation assist.

---

## 4. ĐỐI TƯỢNG NGƯỜI DÙNG MỤC TIÊU

### 4.1 Phân khúc ưu tiên cho MVP

MVP tập trung vào nhóm **hộ kinh doanh nhỏ bán hàng và dịch vụ qua chat**, đặc biệt là các trường hợp:

1. Shop online nhỏ nhận đơn qua Zalo hoặc Messenger.
2. Cửa hàng dịch vụ nhỏ như nail, salon, spa mini nhận lịch qua chat.
3. Cá nhân bán hàng kiêm vận hành, không có lễ tân hoặc nhân viên xử lý đơn riêng.

### 4.2 Chân dung người dùng chính

- Có 1-5 người vận hành.
- Doanh thu phụ thuộc vào tốc độ phản hồi và xử lý đơn.
- Dùng điện thoại và laptop hằng ngày nhưng không muốn học công cụ kỹ thuật.
- Chấp nhận cấp quyền cho ứng dụng nếu đổi lại là tiết kiệm thời gian rõ rệt.

### 4.3 Người dùng chưa ưu tiên

Các nhóm sau được ghi nhận là cơ hội dài hạn nhưng chưa phải trọng tâm MVP:

1. KOL/KOC và creator management.
2. Gia sư, freelancer tri thức và quản lý công nợ chuyên sâu.
3. Bất động sản, đồ cũ, dropship với nhu cầu đặc thù.
4. Doanh nghiệp vừa và lớn có quy trình kế toán, CRM và phân quyền phức tạp.

### 4.4 Use case thương mại ưu tiên cho SMB

Ngoài các tác vụ kỹ thuật như kết nối kênh và cấu hình hệ thống, VClaw cần phục vụ trực tiếp các bài toán kinh doanh thường gặp của người bán hàng nhỏ:

1. Gom hội thoại từ nhiều kênh chat về một nơi để không bỏ sót khách.
2. Hỗ trợ phản hồi khách nhanh bằng mẫu trả lời, gợi ý nội dung hoặc workflow bán hàng.
3. Tạo và gửi thông tin thanh toán, xác minh thanh toán và ghi nhận trạng thái đơn.
4. Chuẩn hóa thông tin khách hàng, địa chỉ, nhu cầu và lịch sử trao đổi.
5. Quản lý lịch hẹn, lịch phục vụ hoặc các tác vụ follow-up sau bán hàng.
6. Từng bước mở rộng sang quản lý catalog, sản phẩm, dịch vụ hoặc kết nối các kênh bán hàng online.
7. Hỗ trợ soạn content bán hàng, chiến dịch nhẹ và lịch follow-up cho các nhóm khách hoặc lead có cấu trúc.

Các kênh bán hàng online này có thể bao gồm website bán hàng, landing page, social commerce và marketplace như Shopee. Trong giai đoạn đầu, VClaw nên ưu tiên góc nhìn `gom nguồn đơn và nguồn khách` về một nơi thay vì cam kết đồng bộ sâu mọi nền tảng ngay từ MVP.

Trong giai đoạn đầu, sản phẩm nên ưu tiên `generic SMB commerce workflows` và `lightweight growth workflows` thay vì khóa chặt vào một vertical duy nhất như vé vui chơi, du lịch hay đại lý B2B. Các vertical như ticketing có thể trở thành gói mở rộng sau khi lõi vận hành và tăng trưởng bán hàng đã ổn định.

---

## 5. PHẠM VI MVP

### 5.1 Trong phạm vi

1. Ứng dụng chạy local trên máy người dùng, ưu tiên trải nghiệm cài đặt phần mềm qua các bản đóng gói 1-click (one-click installer kiểu .exe / .dmg).
2. Web UI hướng nền tảng CRM-lite, thay thế phương thức setup bằng terminal truyền thống.
3. Kết nối tối thiểu một kênh giao tiếp chính trong giai đoạn đầu. Các kênh khác chỉ mở rộng khi luồng chính ổn định.
4. Bộ tính năng tập trung vào thanh toán, giao vận, lịch hẹn, lead follow-up và các workflow chủ động nhẹ như content/campaign assistance có duyệt. Màn hình Inbox cho tác vụ duyệt AI (Human-in-the-loop).
5. Lưu trữ dữ liệu vận hành cơ bản ở local với khả năng sao VClaw không chỉ là giao diện chat, mà là một **Operations Console** (Next.js) cho phép:
- Xem danh sách đơn hàng, khách hàng, lịch hẹn từ database riêng.
- Điều khiển Agent thực hiện các tác vụ qua nút bấm (MCP) hoặc workflow tự động.
- Duyệt các yêu cầu chờ từ Agent (Human-in-the-loop).
riển, VClaw nên được mô tả theo 3 lớp:

1. `Core MVP operations`: QR, bill verification, ship estimate, lịch hẹn, task inbox, local admin.
2. `Near-term growth features`: content assistance, campaign drafting, auto consultation có guardrail, lead follow-up, sales channel awareness.
3. `Future-state expansion`: đồng bộ sâu marketplace, fulfillment sâu, automation outbound quy mô lớn, vertical-specific workflows.

### 5.1.2 Mở rộng định hướng sản phẩm theo 3 lớp

Để tránh mở scope quá mức nhưng vẫn phản ánh đúng hướng phát triển, VClaw nên được mô tả theo 3 lớp:

1. `Core MVP operations`: QR, bill verification, ship estimate, lịch hẹn, task inbox, local admin.
2. `Near-term growth features`: content assistance, campaign drafting, auto consultation có guardrail, lead follow-up, sales channel awareness.
3. `Future-state expansion`: đồng bộ sâu marketplace, fulfillment sâu, automation outbound quy mô lớn, vertical-specific workflows.

### 5.1.1 Diễn giải phần `hóa đơn` trong phạm vi sản phẩm

Trong ngữ cảnh VClaw, `hóa đơn` nên được hiểu theo nghĩa gần với `invoice/order reconciliation` phục vụ vận hành bán hàng:

1. Ghi nhận một giao dịch hoặc đơn hàng đang chờ xử lý.
2. Gắn trạng thái thanh toán, bill/chứng từ chuyển khoản và ghi chú đối soát.
3. Gắn trạng thái giao hàng hoặc trạng thái hoàn tất dịch vụ để người bán theo dõi end-to-end.

Phần này giúp người bán kiểm soát tiền, đơn và bằng chứng thanh toán tốt hơn, nhưng không đồng nghĩa với nghiệp vụ hóa đơn điện tử, hóa đơn VAT hay kế toán tuân thủ pháp lý.

### 5.2 Ngoài phạm vi ở giai đoạn MVP

1. Tự động sinh tính năng mới từ việc quét tin tức, bài viết hoặc xu hướng mạng xã hội.
2. Tự cập nhật mã nguồn nghiệp vụ và tự triển khai tính năng mới không qua kiểm duyệt.
3. Tự động thao tác hệ điều hành ở mức rộng hoặc yêu cầu đặc quyền root/admin cho mọi tác vụ.
4. Bao phủ đồng thời toàn bộ ngành nghề và mọi kênh chat phổ biến.
5. Các bài toán kế toán, hóa đơn VAT, ERP hoặc CRM hoàn chỉnh.
6. Một nền tảng commerce enterprise hoàn chỉnh với OMS/CRM/ERP đầy đủ.
7. Một ads platform đầy đủ hoặc hệ thống full autopilot cho outbound automation không có cơ chế duyệt/policy.

---

## 6. NGUYÊN TẮC SẢN PHẨM

1. **Giá trị trước, AI sau:** Tính năng phải giải quyết được một tác vụ kinh doanh cụ thể trước khi tối ưu bằng AI.
2. **MVP hẹp nhưng dùng được thật:** Chỉ chọn những luồng có thể demo với người dùng pilot trong thời gian ngắn.
3. **Local-first có kiểm soát:** Ưu tiên chạy trên máy người dùng, nhưng mọi hành vi truy cập file, ảnh hoặc tích hợp bên ngoài phải minh bạch và có giới hạn.
4. **Không phụ thuộc vào "AI tự viết code":** Mọi tính năng mới trong giai đoạn đầu phải qua quy trình thiết kế, phát triển và kiểm thử thông thường.
5. **Mở rộng theo vertical sau khi có tín hiệu:** Sau khi chứng minh được một phân khúc thành công, mới nhân rộng sang nhóm ngành khác.
6. **Chủ động nhưng có guardrail:** Có thể hỗ trợ tự động hóa quảng bá, follow-up hoặc tư vấn trong các ngữ cảnh đủ cấu trúc, nhưng phải có giới hạn tần suất, policy channel và cơ chế duyệt phù hợp.

---

## 7. YÊU CẦU CHỨC NĂNG

### 7.1 Nhóm chức năng ưu tiên P1

| ID | Tính năng | Mô tả nghiệp vụ | Giá trị mang lại |
|---|---|---|---|
| FR1 | Tạo mã VietQR theo ngữ cảnh chat | Hệ thống nhận biết số tiền và nội dung thanh toán từ hội thoại hoặc form nhập nhanh, sau đó tạo ảnh QR để gửi cho khách. | Rút ngắn thời gian chốt thanh toán và giảm nhập sai thông tin. |
| FR2 | Xác minh ảnh chuyển khoản ở mức hỗ trợ | Hệ thống đọc ảnh biên lai/chụp màn hình và kiểm tra các trường cơ bản như số tiền, thời gian, nội dung tham chiếu. Kết quả trả về dạng gợi ý để người dùng xác nhận. | Giảm thời gian soi bill thủ công và hạn chế nhầm lẫn. |
| FR3 | Chuẩn hóa địa chỉ và ước tính giao vận | Hệ thống chuẩn hóa địa chỉ nhập từ chat, tách các thành phần chính và kết nối với đối tác giao vận để trả về phí ước tính hoặc dữ liệu chuẩn bị đơn. | Giảm lỗi nhập địa chỉ và tăng tốc xử lý đơn hàng. |
| FR4 | Quản lý lịch hẹn cơ bản | Hệ thống cho phép tạo lịch hẹn, kiểm tra khung giờ trống từ dữ liệu cấu hình đơn giản và gửi nhắc lịch theo mẫu. | Hạn chế bỏ sót lịch hẹn và giảm tỷ lệ khách quên lịch. |

### 7.2 Nhóm chức năng ưu tiên P2

| ID | Tính năng | Mô tả nghiệp vụ | Ghi chú |
|---|---|---|---|
| FR5 | Mẫu trả lời và theo dõi trạng thái hội thoại | Gợi ý các câu trả lời mẫu theo tình huống bán hàng hoặc xác nhận thanh toán. | Nên triển khai sau khi ổn định luồng P1. |
| FR6 | Báo cáo tác vụ hằng ngày | Tổng hợp số lượt tạo QR, số lịch hẹn, số đơn xử lý thành công. | Phục vụ đánh giá hiệu quả pilot. |
| FR7 | Nhắc thanh toán hoặc nhắc lịch nâng cao | Cho phép thiết lập quy tắc nhắc lại theo mốc thời gian. | Cần kiểm soát tần suất gửi và trải nghiệm người nhận. |
| FR8 | Hỗ trợ content và campaign draft | Gợi ý caption, bài đăng, biến thể nội dung và lịch đăng cho người bán online. | Giảm chi phí tạo nội dung và tăng khả năng giữ nhịp bán hàng. |
| FR9 | Lead follow-up có kiểm soát | Gợi ý và chuẩn bị tin nhắn follow-up cho lead chưa phản hồi, chưa thanh toán hoặc khách cũ. | Tăng khả năng chuyển đổi và quay lại mà vẫn giữ kiểm soát spam. |
| FR10 | Auto consultation có guardrail | Hệ thống có thể gợi ý hoặc trả lời bán tự động trong các tình huống hỏi đáp lặp lại, có policy và ngưỡng xác nhận phù hợp. | Giảm tải tư vấn lặp lại mà không đánh đổi độ tin cậy. |

### 7.3 Yêu cầu tích hợp

1. Giai đoạn đầu nên chọn **một kênh giao tiếp chủ lực** để triển khai end-to-end trước, thay vì đồng thời Zalo OA, Zalo cá nhân, Facebook Messenger và Telegram.
2. Tích hợp giao vận chỉ nên bắt đầu ở mức chuẩn hóa địa chỉ, lấy phí ước tính và chuẩn bị dữ liệu giao hàng; chưa bắt buộc tạo vận đơn tự động trong MVP.
3. Nếu cần nêu ví dụ đối tác, có thể xem các nhà vận chuyển như `GHTK` hoặc `GHN` là hướng adapter phù hợp, nhưng thiết kế sản phẩm vẫn nên giữ trung lập theo mô hình delivery adapter để dễ thay thế.
4. Tích hợp marketplace như `Shopee` trong giai đoạn đầu nên ưu tiên góc nhìn nhận biết kênh bán, nguồn đơn và hỗ trợ hợp nhất context bán hàng; đồng bộ sâu đơn hàng, tồn kho hoặc fulfillment nên để sau pilot.
5. Với các luồng content, follow-up hoặc auto consultation, hệ thống cần có policy channel, giới hạn tần suất và queue duyệt rõ ràng.
6. Mọi tích hợp thanh toán và giao vận phải có cơ chế xử lý lỗi rõ ràng khi API ngoài chậm, sai hoặc không phản hồi.

---

## 8. YÊU CẦU PHI CHỨC NĂNG

### 8.1 Khả dụng và trải nghiệm

1. Luồng cài đặt ban đầu phải đủ đơn giản để người dùng không cần dùng terminal.
2. Giao diện cần ưu tiên thao tác nhanh, ít màn hình, ít khái niệm kỹ thuật.
3. Các thao tác quan trọng cần có log hoặc lịch sử tối thiểu để người dùng kiểm tra lại.
4. Các thao tác quản trị hằng ngày nên có thể hoàn thành qua web admin mà không cần dùng CLI.
5. Các thao tác nhanh, như duyệt yêu cầu, xem trạng thái đơn hoặc bật/tắt workflow, có thể mở rộng sang surface chat-native sau MVP.
6. Các luồng growth như content draft, queue duyệt outbound hoặc follow-up phải dễ hiểu như một công cụ bán hàng, không mang ngôn ngữ của marketing automation phức tạp.

### 8.2 Bảo mật và quyền riêng tư

1. Dữ liệu người dùng và dữ liệu vận hành ưu tiên lưu local trong giai đoạn đầu.
2. Mọi hành vi đọc file, ảnh hoặc truy cập dữ liệu cá nhân phải có sự đồng ý rõ ràng của người dùng.
3. Không tự động chạy tác vụ có thể gây thay đổi dữ liệu hệ thống nếu chưa có xác nhận phù hợp.
4. Mọi luồng outreach, quảng bá hoặc auto tư vấn phải có policy và log để tránh rủi ro spam hoặc sai thông điệp.

### 8.3 Độ tin cậy

1. Hệ thống phải xử lý được lỗi tích hợp bên ngoài mà không làm treo toàn bộ luồng vận hành.
2. Các kết quả AI có rủi ro sai lệch, như OCR biên lai hoặc chuẩn hóa địa chỉ, phải được thiết kế theo hướng "hỗ trợ xác nhận", không tự quyết định hoàn toàn.
3. Các luồng tăng trưởng chủ động phải có khả năng fallback về chế độ draft/duyệt tay nếu policy hoặc confidence không đủ.

---

## 9. GIẢ ĐỊNH VÀ RÀNG BUỘC

### 9.1 Giả định

1. Người dùng sẵn sàng cài ứng dụng desktop/local nếu thấy lợi ích rõ trong tuần đầu.
2. Có thể triển khai pilot với một số nhóm người dùng nhỏ để quan sát hành vi thật.
3. Các API hoặc dịch vụ bên thứ ba cần thiết cho QR, OCR hoặc giao vận có thể tích hợp ở mức thương mại chấp nhận được.

### 9.2 Ràng buộc

1. Nguồn lực phát triển ban đầu có hạn nên không thể đồng thời phủ nhiều ngành và nhiều kênh.
2. Một số nền tảng chat tại Việt Nam có hạn chế tích hợp hoặc phụ thuộc chính sách đối tác.
3. Việc thao tác sâu vào hệ điều hành và file local làm tăng chi phí kiểm thử, hỗ trợ và rủi ro bảo mật.
4. Chất lượng OCR, NLP tiếng Việt và chuẩn hóa địa chỉ cần được kiểm chứng bằng dữ liệu thật trước khi cam kết tự động hóa hoàn toàn.
5. Vì VClaw được xây theo mô hình product fork trên OpenClaw, mọi thay đổi vào core cần cân nhắc chi phí divergence với upstream và chi phí bảo trì dài hạn.

---

## 10. RỦI RO CHÍNH VÀ HƯỚNG GIẢM THIỂU

| Rủi ro | Mô tả | Hướng giảm thiểu |
|---|---|---|
| Phạm vi quá rộng | Bao phủ nhiều ngành và nhiều kênh cùng lúc dẫn đến không có luồng nào đủ tốt. | Chọn 1 phân khúc chính và 1 kênh chính cho MVP. |
| Tích hợp nền tảng không ổn định | API hoặc cơ chế kết nối với nền tảng chat/giao vận có thể thay đổi. | Thiết kế lớp tích hợp tách biệt, ưu tiên các tích hợp có tài liệu và đối tác rõ ràng. |
| AI đưa ra kết quả sai | OCR biên lai, chuẩn hóa địa chỉ hoặc gợi ý trả lời có thể sai. | Thiết kế theo cơ chế xác nhận người dùng trước khi chốt. |
| Cài đặt khó dùng | Người dùng không chuyên dễ bỏ cuộc nếu onboarding phức tạp. | Tối giản luồng setup và có checklist cấu hình rõ ràng. |
| Rủi ro bảo mật local | Truy cập dữ liệu local hoặc thao tác file có thể gây lo ngại. | Giới hạn quyền, minh bạch phạm vi truy cập và bổ sung lịch sử thao tác. |
| Growth automation thiếu kiểm soát | Nội dung, follow-up hoặc auto tư vấn có thể gây spam hoặc sai thông điệp. | Bắt buộc policy approval, giới hạn tần suất và queue duyệt theo kênh. |

---

## 11. LỘ TRÌNH ĐỀ XUẤT

| Giai đoạn | Thời gian tham chiếu | Mục tiêu | Kết quả mong đợi |
|---|---|---|---|
| Phase 1: Xác thực bài toán | Tuần 1-2 | Phỏng vấn và chốt phân khúc pilot, kênh giao tiếp chính, luồng nghiệp vụ ưu tiên | Danh sách use case MVP, tiêu chí đo thành công, yêu cầu tích hợp cụ thể |
| Phase 2: Nền tảng MVP | Tuần 3-6 | Hoàn thiện setup local, cấu hình kênh đầu tiên, logging cơ bản và task inbox | Bản chạy thử nội bộ cho một luồng end-to-end |
| Phase 3: Operations MVP | Tuần 7-10 | Triển khai FR1-FR4 với độ ổn định đủ pilot | Pilot với người dùng thật, có dữ liệu sử dụng thực tế |
| Phase 4: Near-term Growth Layer | Tuần 11-14 | Bổ sung FR8-FR10 ở mức draft, follow-up và auto consultation có guardrail | Người dùng bắt đầu dùng VClaw cho cả growth và operations |
| Phase 5: Đo lường và tinh gọn | Tuần 15-16 | Đo adoption, sửa lỗi, loại bỏ tính năng ít dùng | Quyết định mở rộng sang vertical, kênh hoặc automation depth tiếp theo |

---

## 12. ĐỊNH HƯỚNG SAU MVP

Nếu MVP chứng minh được giá trị và tỷ lệ sử dụng ổn định, các hướng mở rộng có thể xem xét ở giai đoạn sau gồm:

1. Mở rộng sang vertical cụ thể như spa/nail, F&B nhỏ, freelancer.
2. Bổ sung báo cáo vận hành và nhắc việc nâng cao.
3. Tăng số lượng kênh giao tiếp được hỗ trợ.
4. Nghiên cứu cơ chế gợi ý tính năng mới từ dữ liệu sử dụng, nhưng không triển khai theo hướng tự viết code và tự nạp tính năng không kiểm duyệt.
5. Mở rộng từ chatbot operations sang commerce console kết nối thêm trang bán hàng online, nguồn lead, catalog/service sources và growth workflows có kiểm soát.

### 12.0 Tín hiệu tham khảo từ các sản phẩm SMB như KiotViet

Việc nghiên cứu các sản phẩm SMB đã vận hành rộng như KiotViet chủ yếu giúp VClaw hiểu rõ hơn người bán hàng đang quen với những khái niệm và workflow nào. Từ góc nhìn đó, VClaw có thể tham khảo:

1. Cách các sản phẩm mature tổ chức các đối tượng như `customers`, `orders`, `invoices`, `inventory`, `sale channels`.
2. Cách dữ liệu thường được nhìn theo `store/branch/channel` trong bối cảnh bán hàng đa nguồn.
3. Cách một công cụ SMB cân bằng giữa độ đơn giản cho người dùng mới và khả năng mở rộng về sau.
4. Những pattern nên tham khảo để thiết kế workflow và surface sản phẩm, chứ không có nghĩa future scope của VClaw mặc định là phải tích hợp với KiotViet.

### 12.1 Nhóm mở rộng tăng trưởng kinh doanh (Business Growth Automation)

Sau khi hoàn thành lớp MVP lõi, VClaw có thể mở rộng theo hướng trợ lý tăng trưởng doanh thu ngay ở near-term roadmap. Nhóm tính năng này nhằm giúp người dùng không chỉ xử lý đơn tốt hơn mà còn chủ động tìm cơ hội kinh doanh mới và duy trì nhịp bán hàng đều hơn.

Các hướng chức năng có thể nghiên cứu:

1. **Phân tích tín hiệu thị trường:** Tổng hợp xu hướng giá, nhu cầu, mùa vụ, từ khóa hoặc chủ đề đang tăng quan tâm trong từng nhóm ngành mục tiêu.
2. **Tìm kiếm khách hàng tiềm năng:** Hỗ trợ xác định tệp khách hàng, gợi ý lead theo khu vực, nhu cầu hoặc hành vi phù hợp với sản phẩm/dịch vụ của người dùng.
3. **Hỗ trợ quảng bá và nội dung bán hàng:** Đề xuất nội dung bài đăng, tin nhắn tiếp cận, ưu đãi hoặc lịch đăng bài theo tệp khách hàng.
4. **Tự động hóa bán hàng có kiểm soát:** Hỗ trợ follow-up lead, nhắc phản hồi, gửi nội dung bán hàng hoặc kịch bản chốt đơn ở các tình huống có cấu trúc rõ ràng.
5. **Auto consultation có guardrail:** Hỗ trợ phản hồi tự động hoặc bán tự động ở các intent lặp lại, có cơ chế duyệt và policy channel.

Nguyên tắc áp dụng:

1. Đây là lớp mở rộng `near-term to post-MVP`, nhưng vẫn phải được triển khai theo thứ tự tăng dần độ tự động hóa.
2. Hệ thống ưu tiên `support` hoặc `semi-automated selling` trước khi tiến tới bán hàng tự động hoàn toàn.
3. Các luồng tiếp cận khách hàng, quảng bá hoặc chốt đơn phải có cơ chế giới hạn tần suất, kiểm soát nội dung và tuân thủ chính sách của từng nền tảng.

### 12.2 Nhóm tự cải tiến sản phẩm (Autonomous Product Evolution)

VClaw có thể nghiên cứu một lớp năng lực mới giúp hệ thống ngày càng hữu ích hơn theo thời gian, nhưng phải theo hướng có kiểm soát, có thử nghiệm và có phê duyệt.

Các hướng chức năng có thể nghiên cứu:

1. **Phân tích xu hướng và khoảng trống tính năng:** Hệ thống tổng hợp dữ liệu sử dụng, lỗi lặp lại, yêu cầu mới và biến động thị trường để đề xuất cải tiến.
2. **Skill discovery engine:** Tự phát hiện các tác vụ lặp lại hoặc nhu cầu mới để đề xuất skill/module mới.
3. **Tạo prototype hoặc draft workflow:** Hệ thống có thể sinh đề xuất logic, prompt, rule hoặc prototype kỹ thuật trong môi trường sandbox.
4. **Tự tối ưu "thông minh hơn":** Đề xuất cải thiện prompt, routing, template hoặc workflow dựa trên dữ liệu vận hành thực tế.

Guardrail bắt buộc cho nhóm này:

1. Không tự merge mã nguồn vào production.
2. Không tự sửa trực tiếp lõi hệ thống hoặc tích hợp đang chạy thật.
3. Mọi đề xuất mới phải đi qua các bước `proposal -> sandbox test -> review -> approve -> release`.
4. Các thay đổi tự đề xuất phải có cơ chế đo tác động và rollback rõ ràng.

---

## 13. KẾT LUẬN

VClaw có tiềm năng nếu được định vị như một trợ lý tăng trưởng và vận hành local-first giúp hộ kinh doanh nhỏ vừa xử lý nhanh các tác vụ sát doanh thu, vừa chủ động hơn trong việc kéo khách, nuôi lead và tư vấn bán hàng có kiểm soát. Để khả thi, dự án vẫn cần tránh mở rộng quá sớm và tập trung chứng minh giá trị ở một phân khúc, một kênh giao tiếp và một bộ tính năng đủ nhỏ nhưng dùng được thật.

Phiên bản BRD này vì vậy ưu tiên tính khả thi triển khai, khả năng đo lường và nền tảng để phát triển tiếp. Các định hướng như growth assistance, follow-up automation và auto consultation có guardrail được đưa lên gần hơn trong roadmap, nhưng vẫn phải được triển khai theo mức độ kiểm soát phù hợp thay vì hứa hẹn full autopilot.
