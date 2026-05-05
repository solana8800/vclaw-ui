VClaw là **trình duyệt quản trị nghiệp vụ (Operations Browser) chuyên dụng** dành cho SMB/hộ kinh doanh nhỏ tại Việt Nam, tập trung giải các bài toán “sát tiền” (thanh toán, đối soát, giao hàng, lịch hẹn, follow-up) bằng mô hình **AI trợ lý tích hợp ngay trên trình duyệt đa nền tảng** trên nền tảng **OpenClaw**.
Lõi của VClaw không chỉ là một Dashboard, mà là một **Desktop App Shell** quản lý các phiên làm việc trực tiếp trên sàn TMĐT.

---

## 0) TL;DR — Repo này gồm 3 phần chính

1. **OpenClaw Zero Token core (submodule):** `core/openclaw-zero-token/` — runtime/gateway/agent framework được VClaw đóng gói kèm.
2. **VClaw UI:** `vclaw-ui/` — website Next.js (landing + docs viewer + admin shell).
3. **Coding Agent OS:** `AGENTS.md` ở root + `KNOWLEDGE_INDEX.md` + `superpowers/` + các thư mục agent-tooling (`.agent/`, `.claude/`, `.cursor/`) — nơi giữ rule coding agent, specs và kế hoạch thực thi. Runtime persona của OpenClaw sales bot nằm ngoài repo tại `~/.openclaw/workspace/`.

---

## 1) Định vị sản phẩm (tóm tắt theo PRD)

VClaw **không** được định vị là:
- POS/OMS/ERP hoàn chỉnh.
- DevOps Mission Control.
- Công cụ hóa đơn điện tử/kế toán tuân thủ pháp lý.

VClaw **được** định vị là:
- **Operations Console / CRM-lite** dưới dạng trình duyệt chuyên dụng.
- **Lớp trợ lý AI** giúp người bán xử lý tác vụ vận hành hằng ngày ngay trên giao diện web của đối tác.
- Một **product-fork có kiểm soát** trên OpenClaw (tận dụng core, xây product layer riêng).
- **Phát triển Browser-Native Shell** tích hợp Playwright để thực thi tác vụ trực tiếp trên Shopee, Facebook, Zalo mà không cần API chính thức.

 Tài liệu source-of-truth:
- PRD: `vclaw-ui/docs/02-Product-Requirements-Document.vi.md`
- Kiến trúc: `vclaw-ui/docs/01-System-Architecture.vi.md`
- UI/Screens: `vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md`

---

## 2) Kiến trúc tổng thể (high-level)

### 2.1 Các lớp chính

- **Desktop Browser Shell (Native Host)**
  - Quản lý cửa sổ ứng dụng và các Tab trình duyệt (Shopee, FB, Zalo).
  - Tích hợp Agent Overlay hỗ trợ người dùng tại chỗ.
- **Reusable OpenClaw Zero Token Core (submodule)**
  - Gateway daemon + channel adapters
  - Session routing / multi-agent runtime
  - Plugin/tool runtime, config, prompt assembly
- **VClaw Product Layer (repo này)**
  - Rebranding & UX SMB Việt Nam
  - Business workflows, policy, confirmation layer (human-in-the-loop)
  - Dashboard Next.js (Admin Console) tích hợp trong App Shell.

### 2.2 Event-driven UI (nguyên tắc quan trọng)

Theo thiết kế, UI **không** nên “chọc thẳng” vào DB để đổi trạng thái nghiệp vụ.
UI nên phát **event** xuống OpenClaw Gateway (hoặc lớp orchestrator) → core mới là nơi:
1) cập nhật state, 2) ghi log/audit, 3) ra quyết định tool/agent, 4) phản hồi lại khách.

> Tham khảo chi tiết: `vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md` (mục Tech Stack & nguyên tắc event).

---

## 3) Cấu trúc thư mục (repo layout)

> Repo root là source-of-truth của **dự án VClaw**. `core/openclaw-zero-token/` là submodule OpenClaw Zero Token nằm bên trong repo, có nhiều `AGENTS.md`/`CLAUDE.md` riêng cho upstream core. Khi làm việc ở VClaw, đọc root trước; chỉ để rule trong core chi phối khi task thật sự sửa core.

```text
.
├─ README.md                         # file này: bản đồ repo, cách chạy, ranh giới agent
├─ AGENTS.md                         # luật workspace dành cho Codex/agent đọc AGENTS.md
├─ KNOWLEDGE_INDEX.md                # chỉ mục public docs, private docs, agent docs
├─ docs/                             # tài liệu private, không serve qua web /docs
├─ scripts/                          # script đóng gói và vận hành VClaw desktop
├─ superpowers/                      # execution OS cho Codex: task, backlog, specs, plans
│  ├─ CURRENT_TASK.md                # task hiện tại/blocker hiện tại
│  ├─ PROJECT_STATE.md               # trạng thái dự án để agent tiếp tục dài hơi
│  ├─ ROADMAP.md                     # hướng phát triển theo priority
│  ├─ RISK_REGISTER.md               # rủi ro đã biết
│  ├─ backlog/                       # backlog P0/P1/P2
│  ├─ specs/                         # đặc tả thiết kế
│  ├─ plans/                         # checklist triển khai theo bước
│  └─ runbooks/                      # quy trình kiểm chứng/tự chạy
├─ memory/                           # ghi chú/ngữ cảnh dự án nếu cần, không phải runtime workspace chính
│  └─ .dreams/                       # dữ liệu runtime cũ nếu còn, không dùng làm source-of-truth
├─ .agent/skills/                    # skill local cho agent framework dùng thư mục .agent
├─ .cursor/skills/                   # skill local cho Cursor
├─ .claude/settings.local.json       # permission/config local cho Claude Code
├─ vclaw-ui/                         # Next.js app: landing, docs viewer, admin shell, API
│  ├─ app/                           # App Router routes
│  ├─ components/                    # reusable UI/admin/docs components
│  ├─ lib/                           # shared server/client logic
│  ├─ messages/                      # next-intl messages vi/en
│  ├─ prisma/                        # schema, migrations, local sqlite dev data
│  ├─ docs/                          # public markdown served by /docs
│  ├─ launcher/, macos/, resources/  # desktop wrapper resources
│  ├─ .cursor/                       # Cursor config scoped to UI workspace
│  └─ memory/                        # UI-local notes, not the main agent memory
└─ core/
   ├─ openclaw-zero-token/           # OpenClaw Zero Token submodule used by VClaw
   ├─ extensions/                    # VClaw-side extension experiments
   └─ patch/                         # local patch workspace for core integration
```

### 3.1 Coding instructions vs runtime bot persona

Các file ở root (`README.md`, `AGENTS.md`, `KNOWLEDGE_INDEX.md`) mô tả **ý định coding của dự án VClaw**. Đây là lớp định hướng cao nhất khi task đến từ workspace này.

**Source-of-truth khi gateway chạy** là `~/.openclaw/workspace/` (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`) theo `agents.defaults.workspace` trong `openclaw.json`. Bản **seed** mặc định (nhân viên bán hàng online + bắt buộc MCP/enrich VClaw) nằm trong repo tại `scripts/packaging/openclaw-workspace/` và được đồng bộ bằng `scripts/sync-openclaw-workspace.sh` (gói `.pkg` / `vclaw.sh` — mặc định chỉ tạo file thiếu).

Không commit `.openclaw/identity/` hay dữ liệu khách/secret vào repo. Tránh nhân đôi “persona coding” vào cùng thư mục runtime trên máy.

Các file nằm trong `core/openclaw-zero-token/` mô tả **ý định của upstream OpenClaw core**. Chúng quan trọng khi sửa runtime/gateway/plugin SDK trong core, nhưng không được dùng để diễn giải lại mục tiêu sản phẩm VClaw nếu task đang nằm ở `vclaw-ui/`, `docs/`, `scripts/`, `superpowers/`, hoặc root repo.

---

## 4) VClaw UI (`vclaw-ui/`) — màn hình, route, và module code

### 4.1 Route map (đúng theo code hiện tại)

VClaw UI là Next.js App Router, có **song ngữ** (VI mặc định, EN có prefix).

**Public surface**
- `/` (VI) / `/en` (EN): landing page
- `/docs` / `/en/docs`: danh sách tài liệu
- `/docs/[slug]` / `/en/docs/[slug]`: đọc markdown theo slug (có fallback EN → VI)
- `/privacy`, `/terms` (và `/en/privacy`, `/en/terms`)

**Admin surface (CRM-lite shell)**
- `/admin` (Overview/Dashboard)
- `/admin/onboarding` (Setup wizard mock)
- `/admin/inbox` (Task inbox mock)
- `/admin/customers`
- `/admin/orders`
- `/admin/payments`
- `/admin/bookings`
- `/admin/integrations`
- `/admin/automation`
- `/admin/reports`
- `/admin/settings`

> Các route trên tồn tại song song cả ở dạng `app/admin/...` (unprefixed) và `app/[locale]/admin/...` (i18n). Entry `/` đang mặc định render VI bằng `LocaleShell`.

### 4.2 Các “màn hình” admin (mapping → file)

| Màn hình | Route | File chính |
|---|---|---|
| Dashboard / Overview | `/admin` | `vclaw-ui/app/[locale]/admin/page.tsx` |
| Setup Wizard | `/admin/onboarding` | `vclaw-ui/app/[locale]/admin/onboarding/page.tsx` |
| Task Inbox | `/admin/inbox` | `vclaw-ui/app/[locale]/admin/inbox/page.tsx` |
| Customers | `/admin/customers` | `vclaw-ui/app/[locale]/admin/customers/page.tsx` |
| Orders | `/admin/orders` | `vclaw-ui/app/[locale]/admin/orders/page.tsx` |
| Payments | `/admin/payments` | `vclaw-ui/app/[locale]/admin/payments/page.tsx` |
| Bookings | `/admin/bookings` | `vclaw-ui/app/[locale]/admin/bookings/page.tsx` |
| Integrations | `/admin/integrations` | `vclaw-ui/app/[locale]/admin/integrations/page.tsx` |
| Automation | `/admin/automation` | `vclaw-ui/app/[locale]/admin/automation/page.tsx` |
| Reports | `/admin/reports` | `vclaw-ui/app/[locale]/admin/reports/page.tsx` |
| Settings | `/admin/settings` | `vclaw-ui/app/[locale]/admin/settings/page.tsx` |

### 4.3 UI component boundaries (quan trọng để dev/agent sửa đúng chỗ)

**Marketing (Landing)**
- `vclaw-ui/components/marketing/landing-page.tsx`: landing page theo `LandingContent` (content được i18n qua messages).

**Docs**
- `vclaw-ui/components/docs/docs-layout.tsx`: layout sidebar + content + prev/next + fallback notice.
- `vclaw-ui/components/docs/markdown-viewer.tsx`: renderer markdown (có hỗ trợ mermaid).
- `vclaw-ui/lib/docs.ts`: đọc file markdown từ `vclaw-ui/docs/`, resolve theo locale và fallback.

**Admin shell**
- `vclaw-ui/components/admin/admin-shell.tsx`: layout sidebar + header + container.
- `vclaw-ui/components/admin/admin-page-view.tsx`: wrapper trang admin (kết hợp shell + stats/list/workflow/next step).
- `vclaw-ui/lib/admin-runtime.ts`: load messages `admin` theo locale.
- `vclaw-ui/lib/admin-content.ts`: định nghĩa kiểu dữ liệu + build navigation + helper route.

**I18n**
- `vclaw-ui/i18n/routing.ts`: định nghĩa locale (`vi`, `en`), mapping `/` ↔ `/en`.
- `vclaw-ui/i18n/request.ts`: load message dictionaries từ `vclaw-ui/messages/{vi,en}/*.json`.
- `vclaw-ui/components/app/language-switcher.tsx`: switch giữa VI/EN, giữ nguyên context route.

### 4.4 Các capability “MVP demo” đã có trong code (hiện là mock/demo UI)

> Lưu ý: nhiều phần là **mock UI** để chốt trải nghiệm và ranh giới component; phần “kết nối OpenClaw runtime thật” sẽ được nối ở các vòng sau.

**(1) VietQR**
- UI demo ở: `/admin/payments`
- Code:
  - `vclaw-ui/lib/vietqr.ts`: `generateVietQRUrl()` tạo link ảnh VietQR (dùng dịch vụ `img.vietqr.io` cho MVP).
  - `vclaw-ui/components/admin/vietqr-generator.tsx`: form nhập bank/account/amount/description và render ảnh QR.

**(2) Bill verification (OCR/Vision)**
- UI demo ở: `/admin/payments`
- Code:
  - `vclaw-ui/lib/bill-verify.ts`: `verifyBillMock()` mô phỏng kết quả OCR (placeholder cho backend vision).
  - `vclaw-ui/components/admin/bill-verifier.tsx`: upload ảnh + giả lập “đang phân tích”.

**(3) Shipping (chuẩn hóa địa chỉ + ước tính phí)**
- Code nền ở:
  - `vclaw-ui/lib/shipping.ts`: `normalizeAddress()` + `getShippingEstimates()` (hiện là mock/heuristic).
- UI/flow thật sẽ được gắn vào các màn hình Orders/Integrations/Automation ở các vòng tiếp theo.

**(4) Theme & UI primitives**
- `vclaw-ui/lib/theme.ts` + `components/app/theme-toggle.tsx`: cơ chế theme.
- `vclaw-ui/components/ui/*`: primitives (button/card/badge) dùng xuyên suốt.

**(5) Browser Automation (Playwright)**
- **Vị trí kiến trúc**: Module Integrations (Commerce Web Adapters - Zalo/Facebook).
- **Tình trạng hiện tại**: Hướng tới phát triển Headful login mode (người dùng làm chủ quá trình quét QR) và chế độ Background ngầm (Headless) nhằm tránh việc phụ thuộc API từ các nền tảng thứ ba.

---

## 5) Knowledge & Agent OS (để dev/agent “đọc là làm được”)

### 5.1 Nguồn sự thật và thứ tự ưu tiên

Repo này có nhiều lớp hướng dẫn cho nhiều loại agent. Để tránh agent hiểu nhầm đây chỉ là repo `core/openclaw-zero-token`, dùng thứ tự ưu tiên sau:

1. **Tin nhắn/task hiện tại của người dùng** — mục tiêu trực tiếp luôn đứng đầu.
2. **`./AGENTS.md` ở root** — luật workspace VClaw cho Codex và agent đọc `AGENTS.md`.
3. **`README.md` + `KNOWLEDGE_INDEX.md` ở root** — bản đồ repo và chỉ mục tài liệu.
4. **`superpowers/`** — chỉ dùng khi task là blueprint, backlog, tự chạy dài hơi, hoặc plan/spec.
5. `core/openclaw-zero-token/**/AGENTS.md` và `CLAUDE.md` — chỉ áp dụng trong phạm vi core/submodule hoặc khi task yêu cầu sửa OpenClaw runtime/plugin SDK.
6. `~/.openclaw/workspace/` — chỉ dành cho runtime bot bán hàng khi gateway chạy, không dùng làm coding instruction cho repo.

Quy tắc thực tế: nếu task là UI, docs, packaging VClaw, admin workflow, Zalo workflow ở product layer, hoặc agent workflow của repo, không để hướng dẫn trong `core/openclaw-zero-token/` tự đổi mục tiêu sang phát triển upstream OpenClaw.

### 5.2 Bảng vai trò các file/thư mục agent

| Đường dẫn | Dành cho agent nào | Mục đích | Khi nào đọc |
|---|---|---|---|
| `AGENTS.md` | Codex, agent đọc chuẩn `AGENTS.md` | Quy tắc workspace: cấu trúc repo, lệnh build/test, coding style, bảo mật | Luôn đọc khi bắt đầu làm trong repo |
| `KNOWLEDGE_INDEX.md` | Mọi agent/dev | Chỉ mục tài liệu public/private và agent docs | Khi cần tìm source-of-truth |
| `superpowers/README.md` | Codex/autonomous coding agent | Entry point cho việc tự chọn task và tiếp tục dự án dài hơi | Khi người dùng nói “tiếp tục”, “tự chạy”, “làm theo plan” |
| `superpowers/CURRENT_TASK.md` | Codex/autonomous coding agent | Task hiện tại hoặc blocker hiện tại | Đọc trước khi tự chọn việc |
| `superpowers/PROJECT_STATE.md` | Codex/autonomous coding agent | Snapshot trạng thái dự án | Khi cần hiểu dự án đang ở đâu |
| `superpowers/ROADMAP.md` | Codex/autonomous coding agent | Định hướng priority | Khi chọn task mới |
| `superpowers/RISK_REGISTER.md` | Codex/autonomous coding agent | Rủi ro đã biết, tránh lặp lỗi cũ | Trước khi sửa phần nhạy cảm |
| `superpowers/backlog/` | Codex/autonomous coding agent | Backlog theo P0/P1/P2 | Khi không có task đang chạy |
| `superpowers/specs/` | Agent/dev thực thi blueprint | Đặc tả mục tiêu, scope, quyết định | Khi task yêu cầu bám spec |
| `superpowers/plans/` | Agent/dev thực thi blueprint | Checklist triển khai từng bước | Khi task yêu cầu làm theo plan |
| `superpowers/runbooks/` | Agent/dev kiểm chứng | Quy trình verify, autonomous loop, zero-token checks | Trước khi claim hoàn thành hoặc chạy dài hơi |
| `~/.openclaw/workspace/AGENTS.md` | OpenClaw runtime sales bot | Luật runtime cho bot bán hàng online | Khi chỉnh hành vi bot chạy qua gateway |
| `~/.openclaw/workspace/SOUL.md` | OpenClaw runtime sales bot | Tinh thần/tone bán hàng | Khi chỉnh phong cách tư vấn |
| `~/.openclaw/workspace/IDENTITY.md` | OpenClaw runtime sales bot | Danh tính/vai trò nhân viên sale | Khi chỉnh persona runtime |
| `~/.openclaw/workspace/USER.md` | OpenClaw runtime sales bot | Ngữ cảnh chủ shop/người vận hành | Chỉ dùng cho runtime bot |
| `~/.openclaw/workspace/TOOLS.md` | OpenClaw runtime sales bot | Ghi chú tool/môi trường runtime | Khi chỉnh tool runtime |
| `~/.openclaw/workspace/HEARTBEAT.md` | OpenClaw runtime sales bot | Checklist heartbeat runtime | Khi chỉnh nhịp kiểm tra chủ động |
| `.agent/skills/` | Agent framework dùng `.agent` | Skill local, ví dụ `ui-ux-pro-max` | Khi agent framework hỗ trợ thư mục này |
| `.cursor/skills/` | Cursor | Skill local cho Cursor | Khi làm trong Cursor |
| `.claude/settings.local.json` | Claude Code | Allow-list/permission local | Không dùng làm source-of-truth sản phẩm |
| `vclaw-ui/.cursor/` | Cursor trong UI workspace | Config scoped cho `vclaw-ui` | Khi mở riêng workspace UI |
| `vclaw-ui/memory/` | Ghi chú UI-local | Memory/notes cũ scoped cho UI | Chỉ đọc nếu task liên quan history UI |
| `core/openclaw-zero-token/AGENTS.md` | Agent sửa OpenClaw core | Boundary/rule riêng của submodule | Chỉ đọc khi sửa core hoặc extension contract |
| `core/openclaw-zero-token/**/AGENTS.md` | Agent sửa thư mục con core | Rule cục bộ cho plugin SDK, channels, gateway, extensions | Chỉ áp dụng trong subtree tương ứng |
| `core/openclaw-zero-token/**/CLAUDE.md` | Claude Code khi ở core | Rule cục bộ dành cho Claude | Không dùng để định nghĩa mục tiêu VClaw |

### 5.3 Thứ tự đọc khuyến nghị theo tình huống

**Task VClaw thông thường:**
1. `AGENTS.md`
2. `README.md`
3. `KNOWLEDGE_INDEX.md`
4. Tài liệu liên quan trong `vclaw-ui/docs/` hoặc `docs/`

**Task tự chạy dài hơi / chọn việc tiếp theo:**
1. `AGENTS.md`
2. `KNOWLEDGE_INDEX.md`
3. `superpowers/CURRENT_TASK.md`
4. `superpowers/PROJECT_STATE.md`
5. `superpowers/ROADMAP.md`
6. `superpowers/RISK_REGISTER.md`
7. `superpowers/backlog/P0.md`, rồi `P1.md`, `P2.md`
8. Plan/spec liên quan trong `superpowers/plans/` và `superpowers/specs/`

**Task OpenClaw runtime/core:**
1. Root `AGENTS.md`, `README.md`, `KNOWLEDGE_INDEX.md`
2. `docs/14-OpenClaw-Zero-Token-Compatibility.vi.md` nếu liên quan Zero Token
3. `core/openclaw-zero-token/README.md`
4. `core/openclaw-zero-token/AGENTS.md`
5. `AGENTS.md`/`CLAUDE.md` trong đúng subtree đang sửa, nếu có

**Task OpenClaw bot/persona/heartbeat:**
1. Xác nhận gateway đang trỏ workspace nào trong `core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json`.
2. Mặc định chỉnh `~/.openclaw/workspace/AGENTS.md`.
3. Chỉ chỉnh `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md` trong cùng workspace runtime nếu task cần.
4. Không tạo identity runtime trong repo.

### 5.4 “Agentic coding” — giao việc cho Agent bằng plan/spec (prompt tối ưu)

#### 5.4.1 Nguyên tắc khi giao việc (để OpenClaw hiểu đúng và làm ra output ổn định)

Khi nhắn cho agent, nên luôn “khóa” các yếu tố sau trong prompt:

1. **Mục tiêu (Goal):** làm gì, kết quả mong muốn là gì (file nào thay đổi).
2. **Nguồn sự thật (Source of truth):** chỉ rõ file spec/plan/doc nào phải bám theo.
3. **Phạm vi (Scope):** chỉ sửa phần nào, tránh “refactor lan”.
4. **Ràng buộc kỹ thuật (Constraints):**
   - ngôn ngữ: ưu tiên tiếng Việt trong UI text/log/comment (theo `AGENTS.md`).
   - giữ architecture boundaries: UI không sửa DB trực tiếp; event-driven.
   - không đổi API/behavior nếu chưa có spec.
5. **Cách bàn giao (Deliverables):** output gì (tóm tắt, file changed, lệnh test/build).

#### 5.4.2 Prompt template khuyến nghị (copy/paste)

Dùng template này khi muốn agent “nạp ngữ cảnh repo” trước khi code:

```text
Bạn là OpenClaw agent đang làm việc trong repo VClaw.

YÊU CẦU BẮT BUỘC (đọc trước khi làm):
1) README.md (root) để hiểu cấu trúc repo
2) KNOWLEDGE_INDEX.md để biết source-of-truth và đường dẫn tài liệu quan trọng
3) AGENTS.md (root) để tuân thủ rule workspace VClaw
4) Nếu task liên quan UI: đọc thêm `vclaw-ui/docs/01-System-Architecture.vi.md` và `vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md` (public)
5) Nếu task bám blueprint: đọc superpowers/specs/<...>.md và superpowers/plans/<...>.md tương ứng
6) Chỉ đọc `core/openclaw-zero-token/**/AGENTS.md` khi task thật sự sửa core/submodule

CÁCH THỰC THI:
- Thực thi đúng “bước tiếp theo” trong plan (KHÔNG nhảy bước).
- Chỉ thay đổi các file cần thiết; tránh refactor lan.
- Mọi text/label/log/comment ưu tiên tiếng Việt.
- Không diễn giải task VClaw thành task upstream OpenClaw chỉ vì core có nhiều AGENTS/CLAUDE files.
- Nếu có điểm mơ hồ/thiếu spec: dừng lại và nêu câu hỏi cụ thể + gợi ý phương án.

BÀN GIAO (bắt buộc):
1) Tóm tắt thay đổi
2) Danh sách file đã sửa
3) Lệnh test/build đã chạy + kết quả
4) Rủi ro/tech debt phát hiện (nếu có)
```

#### 5.4.3 Prompt ví dụ theo plan (bước-kế-tiếp, có “guardrail”)

```bash
openclaw agent \
  --to @OpenViClawBot \
  --message "Hãy đọc README.md + KNOWLEDGE_INDEX.md + AGENTS.md (root). Sau đó thực thi BƯỚC TIẾP THEO trong kế hoạch superpowers/plans/2026-04-16-vclaw-packaging-web-adapters.md. Bắt buộc bám theo spec superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md và tài liệu private docs/10-Product-Packaging-And-Release.vi.md (root). Chỉ đọc core/openclaw-zero-token/**/AGENTS.md nếu bước này thật sự sửa OpenClaw core. Đánh dấu [x] vào plan khi làm xong một task. Chỉ sửa đúng phạm vi task hiện tại, không refactor lan. Kết thúc bằng: tóm tắt + file changed + lệnh test/build đã chạy." \
  --deliver
```

### 5.5 Superpowers (Blueprints) — giải thích chi tiết

`superpowers/` là nơi chứa **“tài liệu điều khiển”** để agent/engineering triển khai tính năng theo quy trình chuẩn.

#### 5.5.1 `superpowers/specs/` (Specifications)

- Là **đặc tả thiết kế**: mục tiêu, phạm vi, kiến trúc, quyết định quan trọng, rủi ro, tiêu chí hoàn thành.
- Dùng để **khóa narrative** và tránh agent “tự bịa scope”.
- Thường có 2 bản: `.vi.md` và `.en.md` (ưu tiên `.vi.md` khi làm ở VClaw).

Ví dụ:
- `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`: đặc tả thiết kế tích hợp Zalo Web Adapter và Packaging Pipeline đóng gói Mac App.

#### 5.5.2 `superpowers/plans/` (Implementation Plans)

- Là **kế hoạch thực thi theo bước** (step-by-step) để agent chạy tuần tự.
- Mỗi bước nên có: mục tiêu, file dự kiến đụng, acceptance criteria, và lệnh verify.
- Khi giao cho agent: luôn nói rõ **“bước tiếp theo”** và yêu cầu **không nhảy bước**.

### 5.6 “Agent OS” của OpenClaw Zero Token core (khi cần đọc thêm)

Nếu bạn đang debug/sửa OpenClaw Zero Token core (submodule), ngoài tài liệu VClaw ở root, nên đọc thêm:
- `core/openclaw-zero-token/README.md`: overview + install/cli.
- `core/openclaw-zero-token/AGENTS.md`: rule riêng của upstream/submodule.
- `core/openclaw-zero-token/**/AGENTS.md` hoặc `CLAUDE.md` trong subtree đang sửa: rule cục bộ cho channels, gateway, plugin SDK, extensions.

Không nạp toàn bộ rule trong `core/openclaw-zero-token/` cho task VClaw thông thường. Core là dependency/runtime được VClaw dùng, không phải toàn bộ sản phẩm.

---

## 6) OpenClaw Zero Token core (submodule) — dùng thế nào trong repo này?

### 6.1 Vị trí

OpenClaw Zero Token core nằm ở:
- `core/openclaw-zero-token/` (git submodule trỏ tới `git@github.com:linuxhsj/openclaw-zero-token.git`)

### 6.2 Khi nào cần đụng vào core?

Quy tắc kiến trúc (theo `01-System-Architecture.vi.md` và tài liệu Zero Token):
- Ưu tiên thêm năng lực ở **VClaw product layer** (UI, workflow, config, plugin/tools).
- Chỉ chỉnh **OpenClaw Zero Token core** khi “không thể đạt được bằng extension points” hiện có.
- Nếu đang sửa code ngoài `core/openclaw-zero-token/`, không áp dụng bừa các rule lồng trong submodule.

### 6.3 Cập nhật submodule (dành cho dev)

```bash
git submodule update --init --recursive
git submodule update --remote --merge
```

---

## 7) Hướng dẫn chạy local (dev)

### 7.1 Yêu cầu môi trường (khuyến nghị)

- **Node.js >= 22.14.0** (OpenClaw core yêu cầu `>=22.14.0`).
- **pnpm** cho VClaw UI và OpenClaw core. Một số script packaging vẫn gọi `npm` cho launcher hoặc `npm pack` theo đúng script hiện tại.
- **Trình duyệt Playwright**: Sẽ được tải về tự động khi khởi chạy quy trình liên quan thông qua Web Adapter.

### 7.2 Chạy VClaw UI (Next.js)

```bash
cd vclaw-ui
pnpm install
pnpm dev
```

Scripts:
- `pnpm dev`: chạy local dev server trên port `12687` và sync gateway
- `pnpm build`: build production
- `pnpm start`: chạy production build trên port `12687`
- `pnpm lint`: eslint
- `pnpm test`: vitest

### 7.3 Hướng dẫn build OpenClaw Core

Chạy các lệnh sau để cài đặt và xây dựng OpenClaw từ mã nguồn:

```bash
cd core/openclaw-zero-token

pnpm install
pnpm ui:build # tự động cài đặt dependencies cho UI trong lần chạy đầu tiên
pnpm build

# Chạy onboarding để cấu hình gateway bản daemon
pnpm openclaw onboard --install-daemon

# Chế độ phát triển (tự động tải lại khi code hoặc cấu hình thay đổi)
pnpm gateway:watch
```

**Ghi chú:**
- `pnpm openclaw ...`: Chạy trực tiếp mã nguồn TypeScript (thông qua `tsx`).
- `pnpm build`: Tạo ra bản build trong thư mục `dist/` để chạy bằng Node hoặc đóng gói thành binary.

### 7.4 Lệnh Gateway thường dùng (OpenClaw CLI)

> OpenClaw CLI có thể được cài global (tham khảo README của OpenClaw trong `core/openclaw-zero-token/README.md`).

- `openclaw gateway`: khởi động API Gateway (nhận tin nhắn Telegram/Local…).
- `openclaw gateway --force`: tự động sửa lỗi & clean port.
- `openclaw channels login`: đăng nhập kênh tương tác.

### 7.5 Vận hành chạy ngầm với PM2

```bash
pm2 start openclaw --name "vclaw-gateway" -- gateway
pm2 save
```

### 7.6 Đóng gói thành App (Packaging) cho macOS

Sử dụng script tự động để đóng gói toàn bộ ứng dụng (UI + Core) thành `.app` để test nhanh và bộ cài `.pkg`:

```bash
bash scripts/package-vclaw.sh
```

- **Kết quả**: `vclaw-ui/dist/VClaw.app` và `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg`.
- **Lưu ý**: Quy trình này thực hiện đóng gói cô lập, không ảnh hưởng đến mã nguồn gốc của OpenClaw Zero Token core. Script cần `core/openclaw-zero-token/dist/` đã tồn tại; nếu thiếu, chạy `cd core/openclaw-zero-token && pnpm install && pnpm build` trước.

Chi tiết quy trình thủ công và cấu hình: `docs/10-Product-Packaging-And-Release.vi.md` (private, root repo)

### 7.7 Cấu hình Standalone (Cài đặt mặc định)

Bản đóng gói `.pkg` được thiết kế để hoạt động ngay lập tức nhờ cơ chế nhúng cấu hình mẫu:
- **Cấu hình mẫu**: Script đóng gói tự động lấy tệp `~/.openclaw/openclaw.json` của bạn và nhúng vào bundle ứng dụng.
- **Tự động khởi tạo**: Khi người dùng lần đầu mở `VClaw.app` trên máy mới, ứng dụng sẽ tự động sử dụng cấu hình mẫu này để thiết lập môi trường làm việc mà không cần cấu hình thủ công.

### 7.8 Cách mở ứng dụng Desktop trên macOS

Ứng dụng OpenClaw/VClaw được thiết kế dưới dạng **Menu Bar App** (hiển thị trên thanh Taskbar phía trên cùng của macOS).

- **Chế độ phát triển (build lại từ đầu):** Chạy lệnh sau để clean build và khởi chạy ngay lập tức:
  ```bash
  cd core/openclaw-zero-token
  scripts/restart-mac.sh
  ```
- **Chạy nhanh bản đã build (không build lại):** 
  ```bash
  cd core/openclaw-zero-token
  pnpm mac:open
  ```
- **Sử dụng bản đóng gói:** Sau khi chạy script ở mục 7.6, hãy tìm và mở file:
  `vclaw-ui/dist/VClaw.app` hoặc cài `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg`.

*Lưu ý: Nếu nhấn mở mà không thấy cửa sổ hiện ra, hãy kiểm tra icon của ứng dụng trên thanh Menu Bar ở góc trên bên phải màn hình.*


---

## 8) Định hướng phát triển (đọc ở đâu để hiểu sâu)

Nếu bạn cần hiểu sâu hơn README (luồng nghiệp vụ, policy, usecase commerce đa kênh, kế hoạch release):

**Public (`vclaw-ui/docs/` — có trên web `/docs`):**
- `vclaw-ui/docs/00-Business-Requirements.vi.md`
- `vclaw-ui/docs/02-Product-Requirements-Document.vi.md`
- `vclaw-ui/docs/11-User-Manual-And-Installation.vi.md`

**Private (`docs/` ở root — không qua Next docs viewer):**
- `docs/07-Continuous-Automation-Blueprint.vi.md`
- `docs/10-Product-Packaging-And-Release.vi.md`
- `docs/12-VClaw-OpenClaw-Integration-Strategy.vi.md`
- `docs/13-Technical-Integration-Reference.vi.md`

Toàn bộ chỉ mục: [KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md).

---

## 9) Gỡ lỗi và Nhật ký (Debugging & Logs)

Để hỗ trợ xử lý sự cố, VClaw ghi lại nhật ký vận hành tại các vị trí sau:

### 9.1 Các file log quan trọng
- **Gateway Log**: `/tmp/vclaw-zero-gateway.log`
  - Chứa toàn bộ log của OpenClaw Gateway (vận hành mô hình AI, kết nối Zalo/Facebook, các tool thực thi).
- **Installation Log**: `/tmp/vclaw-npm-install.log`
  - Nhật ký quá trình cài đặt runtime/dependencies qua npm khi khởi chạy hoặc cài đặt lần đầu.
- **Postinstall Log**: `/tmp/vclaw-postinstall.log`
  - Nhật ký quá trình thiết lập hệ thống sau khi cài đặt gói `.pkg` (quyền hạn, thư mục, symlink).
- **Core Internal Log**: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
  - Nhật ký chi tiết của nhân OpenClaw core, được xoay vòng (rolling) theo ngày.
- **UI/App Log**: 
  - Nếu chạy từ Terminal qua `scripts/vclaw.sh`: Log hiển thị trực tiếp trên màn hình Terminal.
  - Nếu chạy bản cài đặt `.pkg`: Log được hệ thống macOS quản lý (có thể xem qua ứng dụng Console.app).

### 9.2 Dữ liệu runtime và cấu hình
- **Thư mục làm việc**: `~/.openclaw/`
  - `openclaw.json`: File cấu hình chính.
  - `workspace/`: Chứa persona, tinh thần và danh tính của trợ lý AI.
  - `runtime/`: Thư mục cài đặt nhân OpenClaw.

---

**Đội ngũ VClaw & OpenClaw Agent.**
