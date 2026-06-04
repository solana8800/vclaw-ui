**RÀNG BUỘC HỆ THỐNG BẮT BUỘC (ZERO EXCEPTION):** Dự án này áp dụng quy trình chuẩn Agentic Development Lifecycle (ADLC) được định nghĩa trong [ADLC.md](./ADLC.md). Trước khi thực hiện bất kỳ hành động nào (phân tích, thiết kế, viết code, test), AI Agent BẮT BUỘC phải đọc, tuân thủ tuyệt đối quy trình trong [ADLC.md](./ADLC.md) (quy định này có trọng số ưu tiên cao nhất, đè lên mọi chỉ thị khác) và load đúng project context của dự án tại [.agents/project-contexts/vclaw-ui.context.md](./.agents/project-contexts/vclaw-ui.context.md).

## 1. Quy Trình Agentic Development Lifecycle (ADLC) Trong Dự Án

Mọi nhiệm vụ thay đổi behavior logic, API hoặc UI đều phải tuân thủ chuỗi SDLC Agent-driven:
1. **Product Agent (`$product_agent`)**: Phân tích yêu cầu từ các file tài liệu nghiệp vụ (BRD/PRD), xác định module, data model, business rules và viết Acceptance Criteria (AC) dưới dạng Given-When-Then.
2. **Designer Agent (`$designer_agent`)**: (Nếu có UI) Thiết kế flow màn hình, states (loading, empty, error) và component contract dựa trên AC.
3. **QC Agent (`$qc_agent`)**: Chuyển đổi AC thành test case, viết các integration/contract tests trước khi viết code (Test-First).
4. **Engineering Agent (`$engineering_agent`)**: Tiến hành implement code dựa trên test contract và thiết kế, tuân thủ Clean Architecture.
5. **Security Agent (`$security_agent`)**: Review bảo mật, rà soát AuthN/AuthZ, PII, SQL Injection và dữ liệu nhạy cảm.
6. **DevOps Agent (`$devops_agent`)**: Chạy pipeline restore, build, test, lint và audit để kiểm chứng.
7. **Release Agent (`$release_agent`)**: Tổng hợp thay đổi, kết quả kiểm thử, migration và rủi ro còn lại để sẵn sàng release.

*Mỗi step khi hoàn thành phải xuất ra artifact tương ứng trong thư mục `.agents/runs/<run-id>/outputs/` theo đúng cấu hình của [workflow-control.json](./.agents/orchestration/workflow-control.json).*

---

## 2. Project Structure & Architecture

### 2.1 Repo Layout (3 Layers)
* `core/openclaw-zero-token/` (submodule) — OpenClaw runtime, gateway, và các channel adapter.
* `vclaw-ui/` — Workspace chính Next.js App Router (chứa landing page, docs viewer, và admin shell).
* `scripts/` — Các script đóng gói và đồng bộ hóa workspace.
* `superpowers/` — Khung thực thi bổ trợ: specifications (`specs/`), plans (`plans/`), tasks, và runbooks.

**Quy tắc:** Khi làm việc trong `vclaw-ui/`, `scripts/`, hoặc `superpowers/`, các tài liệu hướng dẫn root này ([AGENTS.md](./AGENTS.md), [ADLC.md](./ADLC.md), [README.md](./README.md)) sẽ làm chuẩn tối cao — không để các file rule cục bộ của submodule `core/` ghi đè.

### 2.2 vclaw-ui Module Organization
* `vclaw-ui/app/` — App Router routes (bao gồm cả i18n routes nằm dưới `[locale]/`).
* `vclaw-ui/components/` — Các React UI component tái sử dụng được (admin shell, docs rendering, v.v.).
* `vclaw-ui/lib/` — Logic dùng chung trên server và client (AI enrichment, db clients, helper utils).
* `vclaw-ui/messages/` — File từ điển đa ngôn ngữ (`vi/`, `en/`).
* `vclaw-ui/prisma/` — Schema database (`schema.prisma`), file migration và seed data (`seed.ts`).
* `vclaw-ui/docs/` — Tài liệu public hiển thị tại route `/docs`.
* `docs/` (Thư mục gốc) — Tài liệu private về thiết kế hệ thống, tích hợp API, bản thiết kế nội bộ (không public ra `/docs`).

### 2.3 Nguyên tắc kiến trúc cốt lõi

#### Event-Driven UI Principle
Các UI component không được phép trực tiếp thay đổi state nghiệp vụ (như tạo/sửa order, payment, customer) thẳng vào DB. Thay vào đó, UI phải phát ra event gửi đến OpenClaw Gateway (hoặc API route chỉ định), nơi giữ quyền quyết định thực thi, thay đổi trạng thái, ghi log và audit. Việc ghi DB trực tiếp từ UI chỉ chấp nhận được đối với các cấu hình (settings/configurations) đơn giản.

#### Zalo Inbound Message Flow (End-to-End)
```text
Zalo webhook → /api/webhooks/channel/zalo
  → lib/zalouser/zalo-webhook.ts     (Xác thực signature, parse event)
  → lib/channel/ingest.ts            (Deduplication, gộp message trong 12s, ghi DB)
  → zalouser-conversation-sync.ts    (Gán nhãn ý định qua intent-classifier)

  [On-Demand / Pull-based]
  OpenClaw Gateway → POST /api/vclaw/enrich
  → lib/ai/enrichment.ts             (Thu thập context, chạy tools nếu có intent mua hàng)
  → buildEnrichedPrompt()            (Trả về prompt đã làm giàu cho gateway gọi LLM)
```

---

## 3. Build, Test, and Development Commands

Tất cả các lệnh phải được chạy từ thư mục `vclaw-ui/` trừ khi có chỉ định khác:

* `pnpm dev`: Chạy Next.js dev server ở port `12687` (đồng thời sync listener của gateway).
* `pnpm build`: Build phiên bản production dạng Next.js standalone.
* `pnpm start`: Chạy server production Next.js ở port `12687`.
* `pnpm lint`: Quét lỗi linter bằng cấu hình custom của dự án.
* `pnpm test`: Chạy bộ test Vitest trong môi trường `jsdom`.
* `pnpm test:bot-eval`: Chạy các file test riêng cho AI enrichment engine (`lib/ai/enrichment.test.ts`).
* `pnpm prisma db seed`: Reset và seed database SQLite local (dùng file seed của Prisma).
* `SKIP_BUILD=1 bash scripts/package-vclaw.sh`: Đóng gói app macOS standalone từ root folder (yêu cầu đã build UI trước đó).

---

## 4. Coding Style & Conventions

* **Tech Stack:** TypeScript, React 19, Next.js App Router, Tailwind CSS v4, và Radix UI / shadcn style primitives.
* **Thụt lề (Indentation):** Sử dụng thụt lề 2 space.
* **Exports:** Ưu tiên named exports cho các utility dùng chung.
* **Imports:** Dùng đường dẫn alias `@/` trỏ về thư mục root của `vclaw-ui`.
* **Đặt tên (Naming):** Tên file component viết theo dạng kebab-case (ví dụ: `components/app/firebase-analytics.tsx`) or theo convention thư mục hiện có.
* **Localization (Đa ngôn ngữ):** Tất cả các chuỗi hiển thị cho người dùng phải qua `next-intl`. Khi thay đổi text, bắt buộc cập nhật đồng thời cả hai file trong `messages/vi/` và `messages/en/`.
* **Ngôn ngữ & Giọng văn (Language & Tone):** Code comments, terminal logs, console prints, và thông báo lỗi hiển thị cho user phải viết bằng tiếng Việt tự nhiên, gần gũi.
  *(Comment và log luôn dùng tiếng Việt tự nhiên để tạo cảm giác do con người viết, không phải AI dịch tự động)*

---

## 5. Testing & Verification Guidelines

* File unit test đặt ngay cạnh file code cần test, sử dụng đuôi `*.test.ts` hoặc `*.test.tsx` (ví dụ: `lib/i18n/routing.test.ts`).
* Luôn xác thực tính đúng đắn bằng các test tập trung vào routing, i18n, data parsing và các luồng nghiệp vụ quan trọng.
* Chạy `pnpm test` và `pnpm lint` trước khi gửi yêu cầu review code.
* Bộ test tối thiểu cho tính năng mới phải bao gồm các case: Happy path, Validation error, Unauthorized/Forbidden, Not found, và xử lý ký tự Unicode tiếng Việt có dấu.

---

## 6. Security & Agent-Specific Notes

* Tuyệt đối không commit các file chứa secret, credentials, database sqlite (`prisma/*.sqlite`) hay dữ liệu khách hàng thật.
* Không cập nhật tài liệu public ở `vclaw-ui/docs/` bằng các file chứa thông tin nội bộ/nhạy cảm. Luôn đối chiếu `KNOWLEDGE_INDEX.md` trước khi đổi vị trí tài liệu.
* Chỉ dẫn cho coding agent và runtime bot persona là độc lập. Không copy profile bot (`~/.openclaw/workspace/AGENTS.md`) vào repo này.
* Khi thực hiện các task dạng blueprint-driven, tuân thủ tuyệt đối các bước trong `superpowers/specs/` và `superpowers/plans/`, đánh dấu hoàn thành bằng `- [x]`.
* Khi chạy Workflow Control tự động, sử dụng tool `workflow_runner.py` để tạo run, cập nhật `BOARD.md` và lưu bằng chứng trong `.agents/runs/<run-id>/outputs`.

---

## 7. AI Vibe Coding Guidelines (Best Practices)

Để đảm bảo trải nghiệm Pair Programming tốt nhất với nhà phát triển:

1. **Chính xác & Hạn chế ảnh hưởng lan rộng:** Chỉ sửa đổi trong phạm vi hẹp nhất có thể để giải quyết yêu cầu. Tránh việc tự ý refactor lan man ("cascade refactoring") trừ khi được yêu cầu rõ ràng.
2. **Kiểm tra Knowledge Indexes TRƯỚC:** Trước khi viết logic mới, hãy tra cứu `KNOWLEDGE_INDEX.md` và các KI summary hiện có xem đã có pattern tương tự hay chưa.
3. **Liên tục kiểm tra Build:** Chạy `pnpm build` hoặc kiểm tra tính tương thích SSR bất cứ khi nào chỉnh sửa layout wrapper hoặc các component React.
4. **Giao tiếp bằng tiếng Việt tự nhiên:** Luôn trò chuyện, giải thích với nhà phát triển ngắn gọn, trực diện bằng tiếng Việt. Sử dụng liên kết dạng markdown click được (`file://`) để chỉ rõ các file đã thay đổi.
5. **Tận dụng Design Skill:** Khi làm việc với UI/UX hoặc custom layout, sử dụng skill [.agent/skills/ui-ux-pro-max](./.agent/skills/ui-ux-pro-max) để áp dụng đúng Design System (Master + Overrides).
