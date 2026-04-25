# OPENCLAW FORK TECHNICAL BLUEPRINT
## DỰ ÁN: Xây VClaw như một product-fork trên nền OpenClaw

---

## 1. MỤC ĐÍCH TÀI LIỆU

Tài liệu này mô tả chi tiết cách VClaw sẽ được xây dựng bằng cách fork OpenClaw và dùng chính năng lực của OpenClaw để tiếp tục phát triển VClaw.

Mục tiêu của blueprint là trả lời rõ các câu hỏi sau:

1. Vì sao chọn OpenClaw làm nền tảng kỹ thuật.
2. Thành phần nào của OpenClaw sẽ được tái sử dụng gần như nguyên trạng.
3. Thành phần nào cần tùy biến để biến OpenClaw thành VClaw.
4. Khi nào nên mở rộng bằng plugin/tool/config, khi nào nên sửa core.
5. Cách tổ chức quy trình phát triển "dùng OpenClaw để code OpenClaw thành VClaw".
6. Dashboard quản trị cho non-technical users sẽ được xây như thế nào.
7. Cách mở rộng từ nền vận hành kỹ thuật sang nền tảng hỗ trợ bán hàng cho SMB.

---

## 2. TÓM TẮT KẾT LUẬN KỸ THUẬT

VClaw nên được xây theo mô hình `product-fork có kiểm soát`:

1. **Không viết lại gateway từ đầu.**
2. **Không tách khỏi kiến trúc session/channel/plugin của OpenClaw ở giai đoạn đầu.**
3. **Tận dụng tối đa OpenClaw làm execution substrate** cho Gateway, Control UI, session routing, plugin runtime, config system và agent prompt runtime.
4. **Tập trung nguồn lực tùy biến ở product layer**: business workflows, onboarding, policy layer, dashboard UX, integrations Việt Nam và growth automation.

Mô hình này giúp VClaw:

1. Ra MVP nhanh hơn.
2. Kế thừa được khả năng multi-channel, agent-native và self-hosted của OpenClaw.
3. Dùng chính OpenClaw như công cụ điều phối tác vụ phát triển.
4. Giảm chi phí xây dựng hạ tầng nền tảng không tạo khác biệt sản phẩm.

Một hệ quả quan trọng của lựa chọn này là:

1. OpenClaw core tiếp tục là lớp hạ tầng an toàn.
2. VClaw phải đầu tư mạnh hơn vào `admin surfaces` và `commerce workflows`.
3. Giá trị sản phẩm với SMB đến từ trải nghiệm quản trị và nghiệp vụ bán hàng, không chỉ từ việc "setup được một gateway".

---

## 3. NHỮNG GÌ OPENCLAW ĐÃ CUNG CẤP SẴN

Từ phân tích tài liệu OpenClaw, các trụ cột kỹ thuật quan trọng đã có sẵn gồm:

### 3.1 Gateway tập trung

OpenClaw vận hành như một `single long-lived Gateway`, đóng vai trò trung tâm cho:

1. Channel connections.
2. Session routing.
3. Control plane qua WebSocket.
4. HTTP surfaces như Control UI và canvas host.

Điều này rất phù hợp với VClaw vì sản phẩm cũng cần một `single source of truth` cho:

1. Tin nhắn từ các kênh chat.
2. Luồng bán hàng và vận hành.
3. Trạng thái tác vụ như tạo QR, kiểm bill, tạo lịch, nhắc lịch.

### 3.2 Control UI sẵn có

OpenClaw đã có `Control UI` chạy trên chính gateway port, có thể:

1. Chat với agent.
2. Xem sessions và history.
3. Sửa config.
4. Quản lý channels, skills, cron jobs, nodes.
5. Tail logs và kiểm tra trạng thái hệ thống.

VClaw không nên tái dùng gốc giao diện này vì nó mang đặc tính kỹ thuật DevOps (Mission Control) quá nặng. Thay vào đó, mô hình của VClaw là:

177. Ẩn Control UI / Terminal kỹ thuật gốc đi đối với người dùng kinh doanh.
78. Xây dựng một **VClaw Business Dashboard** độc lập (Next.js Standalone) chạy trên cổng **12687**.
79. **Giao tiếp liên server**: Dashboard (port 12687) gọi sang OpenClaw Core Engine (port 18789) thông qua giao thức **MCP (Model Context Protocol)**, Native WebSocket và REST Proxy.
80. **Native Shell Orchestration**: Phân phối dưới dạng 1-click installer: Một Native App (Swift) sẽ điều phối vòng đời của cả hai tiến trình (Next.js server và Node.js core) và mở WebView trỏ vào port 12687.

### 3.2.1 Mô hình dashboard đề xuất cho VClaw

Dashboard của VClaw nên theo mô hình `layered admin surfaces`:

1. **Localhost Web Admin**
   - Là surface mặc định.
   - Dùng cho onboarding, cấu hình kênh chat, thanh toán, giao vận, sản phẩm/dịch vụ và theo dõi đơn/tác vụ.
2. **Remote Web Access**
   - Là mode nâng cao.
   - Tận dụng cơ chế remote access an toàn của OpenClaw như Tailnet/Tailscale Serve hoặc tunnel tương đương.
3. **Chat-native Admin Surfaces**
   - Là surface phụ cho tác vụ nhanh.
   - Có thể đi qua Telegram bot menu, Zalo Web App hoặc menu tác vụ nhẹ theo channel.

Nguyên tắc:

1. Dashboard web là nơi người bán hàng làm việc hằng ngày.
2. Remote access là tùy chọn bật thêm, không phải mặc định.
3. CLI giữ nguyên cho dev/ops, không phải entrypoint chính cho người bán hàng.

### 3.3 Config model và wizard

OpenClaw đã có config model rất mạnh với:

1. `gateway.*`
2. `channels.*`
3. `agents.*`
4. `tools.*`
5. `plugins.*`
6. `skills.*`

VClaw nên tận dụng model này thay vì thiết kế config system mới. Tùy biến nên tập trung vào:

1. Tạo defaults phù hợp với SMB.
2. Đổi tên, labels và wizard copy.
3. Thêm plugin schemas cho nghiệp vụ Việt Nam.

### 3.4 Plugin, tool, channel runtime

OpenClaw hỗ trợ plugins TypeScript chạy in-process, có thể đăng ký:

1. Gateway RPC methods.
2. HTTP handlers.
3. Agent tools.
4. CLI commands.
5. Background services.
6. Messaging channels.
7. Skills.

Đây là extension point quan trọng nhất để phát triển VClaw mà chưa cần chỉnh sâu core.

### 3.5 Agent runtime và system prompt assembly

OpenClaw sở hữu system prompt runtime riêng, có thể inject:

1. Tool list.
2. Safety guidance.
3. Skills.
4. Workspace bootstrap files.
5. Runtime metadata.
6. Sandbox state.

VClaw có thể tận dụng cơ chế này để:

1. Chuyển từ "coding assistant" sang "business operations assistant".
2. Inject business policy, persona và instructions cho use case Việt Nam.
3. Tạo agent chuyên cho vận hành, bán hàng, tăng trưởng hoặc R&D.

### 3.6 Năng lực Browser Automation (Playwright) làm UI Feature

OpenClaw lõi đã tích hợp sẵn `playwright-core` và các module hỗ trợ điều khiển trình duyệt. VClaw sẽ nâng tầm năng lực này thành một thành phần giao diện người dùng cốt lõi (không chỉ chạy ngầm):

1. **Vượt qua hạn chế API**: Tích hợp các nền tảng Zalo, Facebook, Shopee, TikTok Shop thông qua các tab trình duyệt thực tế.
2. **Embedded Browser Tabs**: Thay vì mở một cửa sổ chat đơn thuần, VClaw cho phép mở các Tab trình duyệt (Headful) ngay bên trong App Shell. Người dùng có thể vừa quản lý đơn hàng trên Dashboard VClaw, vừa mở tab Shopee để chat với khách hoặc kiểm tra giá đối thủ.
3. **Context-Aware Assistance**: Agent trong VClaw "nhìn" thấy nội dung trong tab trình duyệt tích hợp để hỗ trợ điền thông tin, trích xuất dữ liệu đơn hàng hoặc gợi ý phản hồi ngay trên giao diện của sàn TMĐT.
4. **Browser Profiles**: Lưu trữ an toàn cookie và trạng thái đăng nhập riêng biệt cho từng tài khoản, giúp chủ shop không phải đăng nhập lại nhiều lần.

VClaw sẽ xây dựng lớp **Commerce Web Adapters** để tự động hóa:
- Đồng bộ hội thoại và đơn hàng từ các tab trình duyệt đang mở.
- Tự động hóa các thao tác lặp lại (ví dụ: in hàng loạt phiếu giao từ web sàn).

---

## 4. MÔ HÌNH KIẾN TRÚC KHUYẾN NGHỊ CHO VCLAW

### 4.1 Reusable OpenClaw Core (Engine - Port 18789)

Phần đóng vai trò là "Backend thông minh", nên giữ càng nguyên bản càng tốt:

1. Gateway daemon.
2. WebSocket protocol giữa gateway và clients/nodes.
3. **MCP Server**: Điểm cung cấp Tools và Context cho VClaw UI qua REST Proxy.
4. Session management và multi-agent routing.
5. Technical Control UI (giữ nguyên cho kĩ thuật).
6. Plugin/channel/tool runtime.
7. Config loading, validation và persistence.
8. System prompt assembly pipeline.

### 4.2 VClaw Product Layer

Phần tạo khác biệt sản phẩm nên đặt ở đây:

1. Rebranding thành VClaw.
2. Onboarding cho hộ kinh doanh nhỏ.
3. Luồng cấu hình thanh toán, giao vận và lịch hẹn.
4. Business workflows:
   - VietQR generation
   - Bill verification
   - Address normalization
   - Ship estimate
   - Booking/reminder
   - Content assistance
   - Lead follow-up
   - Campaign drafting
   - Auto consultation có guardrail
5. Policy/confirmation layer cho các hành động nhạy cảm.
6. Simplified dashboard dành cho người dùng không kỹ thuật.
7. Commerce admin console cho cấu hình và vận hành bán hàng.

### 4.3 VClaw Growth and Self-Improvement Layer

Lớp mở rộng sau MVP hoặc near-term growth:

1. Market intelligence.
2. Lead discovery.
3. Campaign assistance.
4. Sales automation guardrails.
5. Trend analysis.
6. Skill discovery engine.
7. Sandbox prototyping.
8. Approval-gated release pipeline.

---

## 5. QUYẾT ĐỊNH PLUGIN HAY CORE

### 5.1 Khi nên làm bằng plugin / tool / config

Ưu tiên extension nếu yêu cầu nằm trong các nhóm sau:

1. Thêm tích hợp đối tác mới như QR provider, OCR provider, delivery provider.
2. Thêm business tool mới cho agent.
3. Thêm channel plugin hoặc tùy biến channel behavior đã có sẵn.
4. Thêm command, hook, background service.
5. Thêm business rules, skills hoặc templates.
6. Thêm config schema mới cho module nghiệp vụ.
7. Thêm admin quick actions cho Telegram/Zalo hoặc các chat-native surfaces.
8. Thêm approval queue, rate limit policy hoặc outbound scheduler cho content/follow-up.

### 5.2 Khi nên sửa core OpenClaw

Chỉ sửa core khi yêu cầu nằm trong các nhóm sau:

1. Cần thay đổi behavior của gateway control plane.
2. Cần thêm semantics mới cho WebSocket/API protocol.
3. Cần đổi sâu onboarding shell và lifecycle setup.
4. Cần sửa session/routing model để phù hợp sản phẩm.
5. Cần thay đổi Control UI shell chứ không chỉ thêm panel.
6. Cần thay đổi cách system prompt được assemble ở mức framework, không chỉ nội dung injected.

### 5.3 Quy tắc ra quyết định

Mỗi yêu cầu mới cần được phân loại theo ma trận:

1. `Can configure`
2. `Can extend via plugin`
3. `Needs product-layer code`
4. `Needs core fork`

Chỉ khi rơi vào nhóm `Needs core fork` mới cho phép tăng divergence với upstream.

---

## 6. CÁCH DÙNG OPENCLAW ĐỂ XÂY OPENCLAW THÀNH VCLAW

### 6.1 Dev loop đề xuất

1. Chạy gateway local của chính repo VClaw.
2. Mở Control UI hoặc một kênh chat dev.
3. Bind một agent chuyên phát triển vào workspace repo VClaw.
4. Inject bootstrap files và tài liệu kỹ thuật vào context agent.
5. Giao việc cho agent qua chat, Control UI hoặc CLI.
6. Agent đọc mã nguồn, chỉnh tài liệu, tạo patch, chạy kiểm tra và ghi nhận kết quả.

### 6.1.1 Dùng dashboard để phát triển dashboard

VClaw nên dogfood ngay surface quản trị web của chính nó:

1. Dùng Control UI/Web Admin để cấu hình môi trường phát triển.
2. Dùng agent trong chính repo để sửa UI labels, panel logic và workflow nghiệp vụ.
3. Kiểm tra tính dễ dùng của dashboard bằng cách xem liệu một non-technical operator có thể hoàn thành các task chính mà không cần CLI hay không.

### 6.2 Mô hình agent đề xuất

Nên tạo ít nhất ba agent profile:

1. `vclaw-core`
   - Chuyên cho gateway, routing, config, control UI shell, upstream sync.
2. `vclaw-business`
   - Chuyên cho business workflows, prompt, rules, tools, Việt hóa.
3. `vclaw-rnd`
   - Chuyên cho growth automation, market intelligence và self-improvement sandbox.

Điều này tận dụng trực tiếp multi-agent routing của OpenClaw thay vì trộn mọi trách nhiệm vào một agent duy nhất.

### 6.3 Workspace strategy

1. Một workspace chính cho product fork.
2. Có thể dùng session hoặc agent riêng cho từng nhánh việc.
3. Với các thử nghiệm rủi ro cao, dùng sandbox hoặc worktree tách biệt.

### 6.4 Dogfooding strategy

VClaw nên được dùng để phục vụ chính đội phát triển ngay từ sớm:

1. Chat với agent để yêu cầu chỉnh tài liệu.
2. Dùng sessions để theo dõi task.
3. Dùng Control UI để xem logs, config và trạng thái.
4. Dùng plugin/hooks để tự động hóa các tác vụ nội bộ.

Nếu hệ thống không giúp đội dev làm việc nhanh hơn trên repo của chính nó, khả năng cao nó cũng chưa đủ tốt cho người dùng cuối.

---

## 7. TỔ CHỨC MÃ NGUỒN ĐỀ XUẤT

### 7.1 Phần nên giữ gần upstream

1. `src/infra`
2. `src/cli`
3. `src/channels`
4. `src/terminal`
5. Các phần control plane và gateway transport

Nguyên tắc:

1. Hạn chế sửa khi chưa thật sự cần.
2. Nếu sửa, ghi rõ lý do sản phẩm.
3. Ưu tiên giữ tương thích với đường nâng cấp từ upstream.

### 7.2 Phần nên thêm hoặc mở rộng cho VClaw

1. `src/vclaw` hoặc namespace tương đương cho business modules.
2. `extensions/*` cho các plugin nghiệp vụ Việt Nam.
3. `docs/` cho product docs và blueprint kỹ thuật.
4. UI panels hoặc flows mới trong control UI phục vụ onboarding và vận hành.
5. Các module commerce chung cho lead, customer, order-like workflows và follow-up.
6. Các module growth cho content draft, campaign queue, follow-up policy và outbound approvals.

### 7.3 Phần nên tách biệt khỏi core

1. Market intelligence.
2. Lead discovery.
3. Campaign assistant.
4. Skill discovery/sandbox.
5. Các provider đặc thù địa phương.
6. Outbound scheduling và policy engine nếu cần scale tăng trưởng đa kênh.

Những phần này nên tách càng nhiều càng tốt để không làm lõi OpenClaw bị biến thành một sản phẩm ngành dọc.

---

## 8. KẾ HOẠCH FORK THEO GIAI ĐOẠN

### Giai đoạn A - Foundation Fork

Mục tiêu:

1. Fork repo và làm rõ ranh giới reusable/custom.
2. Rebrand cơ bản.
3. Thiết lập agent/workspace để dùng OpenClaw phát triển VClaw.

Đầu ra:

1. Repo VClaw chạy được.
2. Gateway và Control UI hoạt động dưới product identity mới ở mức tối thiểu.
3. Có blueprint và dev rules rõ ràng.

### Giai đoạn B - Business Workflow Enablement

Mục tiêu:

1. Thêm business modules P1.
2. Tích hợp các provider Việt Nam.
3. Đưa policy/confirmation vào mọi luồng nhạy cảm.

Đầu ra:

1. VietQR, bill verification, ship estimate, booking/reminder chạy end-to-end.

### Giai đoạn C - Productization (Sidecar Integration)

Mục tiêu:

1. Build VClaw UI (Next.js) ở chế độ **Standalone Mode**.
2. Cấu hình VClaw UI chạy trên cổng **12687** làm giao diện mặc định.
3. Cấu hình OpenClaw Core chạy trên cổng **18789** hãm bảo mật cục bộ.
4. Đồng bộ Context và điều khiển qua **MCP**.
5. Phát hành **VClaw Native Shell** (Swift) để bundle toàn bộ server và bundle Node.js runtime nếu cần.

### Giai đoạn D - Growth Automation

Mục tiêu:

1. Thêm market intelligence, lead discovery, campaign assistance.
2. Tạo sales automation có guardrail.
3. Đưa content drafting, approval queue và follow-up orchestration vào product layer trước khi tăng độ tự động hóa.

### Giai đoạn D.1 - Generic SMB Commerce

Trước khi đi sâu vào vertical cụ thể như ticketing, VClaw nên bổ sung một lớp commerce chung cho SMB:

1. Lead intake và lead follow-up.
2. Customer history và tagging.
3. Catalog/service listing ở mức cơ bản.
4. Order-like workflow hoặc booking-like workflow thống nhất.
5. Các kết nối với nguồn bán hàng online ở mức cấu hình từng bước.
6. Content assistance và campaign assistance ở mức draft + approval.
7. Auto consultation có guardrail cho các intent đủ cấu trúc.

### Giai đoạn E - Self-Improvement Sandbox

Mục tiêu:

1. Tạo trend analysis và skill discovery proposals.
2. Thử nghiệm workflow tự cải tiến trong môi trường sandbox.
3. Giữ cơ chế approval-gated release.

---

## 9. RỦI RO KỸ THUẬT CHÍNH

### 9.1 Divergence quá sâu với upstream

Rủi ro:

1. Khó cập nhật bug fixes từ OpenClaw.
2. Tăng chi phí bảo trì.
3. Mất khả năng reuse cộng đồng/plugin ecosystem.

Giảm thiểu:

1. Plugin-first.
2. Ghi sổ divergence bắt buộc.
3. Review định kỳ các thay đổi core.

### 9.2 Product UX chưa đủ đơn giản

Rủi ro:

OpenClaw gốc hướng tới power users và developers, trong khi VClaw nhắm tới người dùng SMB ít kỹ thuật.

Giảm thiểu:

1. Tối giản dashboard.
2. Đổi ngôn ngữ hiển thị sang tác vụ kinh doanh.
3. Đóng gói onboarding theo use case thay vì theo khái niệm kỹ thuật.

### 9.3 Plugin sprawl

Rủi ro:

Nếu mọi thứ đều đẩy vào plugin mà không có kiến trúc rõ, VClaw sẽ phân mảnh.

Giảm thiểu:

1. Định nghĩa chuẩn module.
2. Phân lớp rõ P1 business modules, growth modules, R&D modules.
3. Quy định naming, ownership và config schema.

### 9.4 Tự cải tiến không kiểm soát

Rủi ro:

Các năng lực kiểu skill discovery hoặc auto-improvement dễ trượt sang vùng rủi ro nếu chạm production trực tiếp.

Giảm thiểu:

1. Không tự merge.
2. Không tự sửa runtime đang chạy.
3. Tất cả proposal phải qua sandbox và phê duyệt.

---

## 10. DANH SÁCH QUYẾT ĐỊNH NÊN CHỐT SỚM

1. Channel chính của MVP là gì.
2. Có giữ tương thích config với OpenClaw bao lâu.
3. Control UI sẽ rebrand một phần hay tách hẳn product shell.
4. Business modules nào là plugin, module nội bộ hay core change.
5. Có duy trì upstream sync định kỳ hay chấp nhận hard divergence ở một số vùng.
6. Agent structure cho team dev sẽ theo domain hay theo technical layer.
7. Remote access có bật mặc định hay chỉ bật theo nhu cầu.
8. Chat-native admin surfaces nào sẽ được ưu tiên trước: Telegram, Zalo hay cả hai.
9. Lớp commerce chung sẽ dùng data model riêng hay gắn trực tiếp vào session/activity model hiện có.

---

## 11. KẾT LUẬN

Phương án kỹ thuật phù hợp nhất hiện tại là:

1. **Dùng OpenClaw làm hạ tầng thực thi.**
2. **Dùng product-fork để đóng gói lại thành VClaw.**
3. **Dùng chính OpenClaw để phát triển VClaw mỗi ngày.**

Đây là lựa chọn cân bằng nhất giữa tốc độ ra sản phẩm, khả năng tận dụng nền tảng đã có và mức độ kiểm soát cần thiết để tạo ra một sản phẩm dọc cho thị trường Việt Nam.
