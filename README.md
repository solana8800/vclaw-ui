VClaw là **trình duyệt quản trị nghiệp vụ (Operations Browser) chuyên dụng** dành cho SMB/hộ kinh doanh nhỏ tại Việt Nam, tập trung giải các bài toán “sát tiền” (thanh toán, đối soát, giao hàng, lịch hẹn, follow-up) bằng mô hình **AI trợ lý tích hợp ngay trên trình duyệt đa nền tảng** trên nền tảng **OpenClaw**.
Lõi của VClaw không chỉ là một Dashboard, mà là một **Desktop App Shell** quản lý các phiên làm việc trực tiếp trên sàn TMĐT.

---

## 0) TL;DR — Repo này gồm 3 phần chính

1. **OpenClaw core (submodule):** `core/openclaw/` — runtime/gateway/agent framework.
2. **VClaw UI:** `vclaw-ui/` — website Next.js (landing + docs viewer + admin shell).
3. **Knowledge/Agent OS:** các file ở thư mục gốc + `superpowers/` + `memory/` — nơi giữ “tri thức”, rule vận hành agent, specs và kế hoạch thực thi.

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
- **Reusable OpenClaw Core (submodule)**
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

> Tập trung vào các thư mục “thuộc VClaw”. `core/openclaw/` là submodule upstream nên rất lớn.

```text
.
├─ README.md                      # (file này) hướng dẫn dev + agent
├─ KNOWLEDGE_INDEX.md             # chỉ mục tri thức & tài liệu (public + private)
├─ docs/                          # markdown PRIVATE (không serve qua Next /docs)
├─ AGENTS.md / SOUL.md / IDENTITY.md / USER.md / TOOLS.md
│                                # “Agent OS” – quy tắc vận hành & bối cảnh làm việc
├─ superpowers/
│  ├─ specs/                      # đặc tả (VI/EN) để agent/engineering bám theo
│  └─ plans/                      # kế hoạch triển khai theo từng bước
├─ memory/                        # nhật ký/ngữ cảnh liên tục cho agent
├─ vclaw-ui/                      # Next.js app (landing + docs + admin shell)
│  └─ docs/                       # markdown PUBLIC (route /docs, đọc bởi lib/docs.ts)
└─ core/openclaw/                 # submodule OpenClaw (gateway/runtime/tooling)
```

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

### 5.1 Tài liệu & tri thức (source-of-truth)

Mọi tri thức về dự án và cấu hình Agent được quản lý tập trung:
- **[KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md)**: chỉ mục tài liệu **public** (`vclaw-ui/docs/`) và **private** (`docs/` ở root).
- **Agent OS (workspace root):** `SOUL.md`, `AGENTS.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md` ở thư mục gốc.
- **Blueprints:** `superpowers/specs/` (đặc tả) và `superpowers/plans/` (kế hoạch thực thi).

#### 5.1.1 Thứ tự đọc “mặc định” cho developer/AI agent

Khi bắt đầu một phiên làm việc mới (đặc biệt khi dùng `openclaw agent`), nên đọc theo thứ tự:

1. **README.md** (file này) → hiểu map repo, route, module.
2. **KNOWLEDGE_INDEX.md** → biết “source-of-truth nằm ở đâu”.
3. **`vclaw-ui/docs/`** (public, web `/docs`) → đọc các file theo nhu cầu:
   - `02-Product-Requirements-Document.vi.md` (PRD) — narrative sản phẩm, phạm vi MVP.
   - `01-System-Architecture.vi.md` — kiến trúc và ranh giới core vs product.
   - `04-UI-Design-And-Screen-Specs.vi.md` — screen map và triết lý UX.
4. **`docs/`** (private, root repo) → blueprint, packaging, tích hợp nội bộ (không serve qua Next); xem `docs/README.md`.
5. **Agent OS ở workspace root** (các file `.md` ở thư mục gốc) để nắm rule vận hành:
   - `AGENTS.md` — quy tắc vận hành agent, red-lines, formatting, nguyên tắc hỏi/không hỏi, v.v.
   - `SOUL.md` — sứ mệnh và phong cách giúp đỡ (tone, định hướng).
   - `IDENTITY.md` — persona, cách phản hồi/ra quyết định.
   - `USER.md` — bối cảnh người dùng (developer) & ưu tiên (vd: update qua Telegram).
   - `TOOLS.md` — ghi chú môi trường và thói quen sử dụng tool.
6. **superpowers/** — specs & plans nếu nhiệm vụ là “thực thi theo blueprint”.

> Ghi chú quan trọng: repo này có **2 lớp “AGENTS.md/README.md”**:
> - `./AGENTS.md` (workspace root): quy tắc cho agent khi làm việc với repo VClaw.
> - `core/openclaw/AGENTS.md` (trong submodule): quy tắc/khuyến nghị riêng của OpenClaw core.  
> Khi sửa core, agent nên đọc cả 2 (ưu tiên an toàn theo root workspace, sau đó theo core).

#### 5.1.2 Các file `.md` quan trọng ở workspace root (giải thích nhanh)

- `README.md`: map dự án, cách chạy, ranh giới module.
- `KNOWLEDGE_INDEX.md`: mục lục tri thức — `vclaw-ui/docs/` (public) + `docs/` (private) + specs/plans.
- `SOUL.md`: “tôn chỉ” (vì sao tồn tại, triết lý).
- `IDENTITY.md`: “cá tính” (vai trò, cách giao tiếp).
- `AGENTS.md`: “luật chơi” cho agent (security, khi nào hỏi, khi nào im lặng, v.v.).
- `USER.md`: hồ sơ tối thiểu của người dùng chính (developer), ưu tiên giao tiếp.
- `TOOLS.md`: ghi chú môi trường/tooling cụ thể.
- `HEARTBEAT.md`: checklist định kỳ (nếu dùng heartbeat/cron).

### 5.2 “Agentic coding” — giao việc cho Agent bằng plan/spec (prompt tối ưu)

#### 5.2.1 Nguyên tắc khi giao việc (để OpenClaw hiểu đúng và làm ra output ổn định)

Khi nhắn cho agent, nên luôn “khóa” các yếu tố sau trong prompt:

1. **Mục tiêu (Goal):** làm gì, kết quả mong muốn là gì (file nào thay đổi).
2. **Nguồn sự thật (Source of truth):** chỉ rõ file spec/plan/doc nào phải bám theo.
3. **Phạm vi (Scope):** chỉ sửa phần nào, tránh “refactor lan”.
4. **Ràng buộc kỹ thuật (Constraints):**
   - ngôn ngữ: ưu tiên tiếng Việt trong UI text/log/comment (theo `AGENTS.md`).
   - giữ architecture boundaries: UI không sửa DB trực tiếp; event-driven.
   - không đổi API/behavior nếu chưa có spec.
5. **Cách bàn giao (Deliverables):** output gì (tóm tắt, file changed, lệnh test/build).

#### 5.2.2 Prompt template khuyến nghị (copy/paste)

Dùng template này khi muốn agent “nạp ngữ cảnh repo” trước khi code:

```text
Bạn là OpenClaw agent đang làm việc trong repo VClaw.

YÊU CẦU BẮT BUỘC (đọc trước khi làm):
1) README.md (root) để hiểu cấu trúc repo
2) KNOWLEDGE_INDEX.md để biết source-of-truth và đường dẫn tài liệu quan trọng
3) AGENTS.md + SOUL.md + IDENTITY.md + USER.md + TOOLS.md + HEARTBEAT.md (root) để tuân thủ rule, phong cách, ghi chú môi trường và checklist vận hành
4) Nếu task liên quan UI: đọc thêm `vclaw-ui/docs/01-System-Architecture.vi.md` và `vclaw-ui/docs/04-UI-Design-And-Screen-Specs.vi.md` (public)
5) Nếu task bám blueprint: đọc superpowers/specs/<...>.md và superpowers/plans/<...>.md tương ứng

CÁCH THỰC THI:
- Thực thi đúng “bước tiếp theo” trong plan (KHÔNG nhảy bước).
- Chỉ thay đổi các file cần thiết; tránh refactor lan.
- Mọi text/label/log/comment ưu tiên tiếng Việt.
- Nếu có điểm mơ hồ/thiếu spec: dừng lại và nêu câu hỏi cụ thể + gợi ý phương án.

BÀN GIAO (bắt buộc):
1) Tóm tắt thay đổi
2) Danh sách file đã sửa
3) Lệnh test/build đã chạy + kết quả
4) Rủi ro/tech debt phát hiện (nếu có)
```

#### 5.2.3 Prompt ví dụ theo plan (bước-kế-tiếp, có “guardrail”)

```bash
openclaw agent \
  --to @OpenViClawBot \
  --message "Hãy đọc README.md + KNOWLEDGE_INDEX.md + AGENTS.md (root). Sau đó thực thi BƯỚC TIẾP THEO trong kế hoạch superpowers/plans/2026-04-16-vclaw-packaging-web-adapters.md. Bắt buộc bám theo spec superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md và tài liệu private docs/10-Product-Packaging-And-Release.vi.md (root). Đánh dấu [x] vào plan khi làm xong một task. Chỉ sửa đúng phạm vi task hiện tại, không refactor lan. Kết thúc bằng: tóm tắt + file changed + lệnh test/build đã chạy." \
  --deliver
```

### 5.3 Superpowers (Blueprints) — giải thích chi tiết

`superpowers/` là nơi chứa **“tài liệu điều khiển”** để agent/engineering triển khai tính năng theo quy trình chuẩn.

#### 5.3.1 `superpowers/specs/` (Specifications)

- Là **đặc tả thiết kế**: mục tiêu, phạm vi, kiến trúc, quyết định quan trọng, rủi ro, tiêu chí hoàn thành.
- Dùng để **khóa narrative** và tránh agent “tự bịa scope”.
- Thường có 2 bản: `.vi.md` và `.en.md` (ưu tiên `.vi.md` khi làm ở VClaw).

Ví dụ:
- `superpowers/specs/2026-04-16-vclaw-packaging-web-adapters.vi.md`: đặc tả thiết kế tích hợp Zalo Web Adapter và Packaging Pipeline đóng gói Mac App.

#### 5.3.2 `superpowers/plans/` (Implementation Plans)

- Là **kế hoạch thực thi theo bước** (step-by-step) để agent chạy tuần tự.
- Mỗi bước nên có: mục tiêu, file dự kiến đụng, acceptance criteria, và lệnh verify.
- Khi giao cho agent: luôn nói rõ **“bước tiếp theo”** và yêu cầu **không nhảy bước**.

### 5.4 “Agent OS” của OpenClaw core (khi cần đọc thêm)

Nếu bạn đang debug/sửa OpenClaw core (submodule), ngoài tài liệu VClaw ở root, nên đọc thêm:
- `core/openclaw/README.md`: overview + install/cli.
- `core/openclaw/AGENTS.md`: rule riêng của upstream (cách làm việc, security posture, conventions).
- `core/openclaw/CONTRIBUTING.md`, `core/openclaw/SECURITY.md`, các `docs*.md`: guideline và policy của upstream.

---

## 6) OpenClaw core (submodule) — dùng thế nào trong repo này?

### 6.1 Vị trí

OpenClaw core nằm ở:
- `core/openclaw/` (git submodule trỏ tới `https://github.com/openclaw/openclaw`)

### 6.2 Khi nào cần đụng vào core?

Quy tắc kiến trúc (theo `01-System-Architecture.vi.md`):
- Ưu tiên thêm năng lực ở **VClaw product layer** (UI, workflow, config, plugin/tools).
- Chỉ chỉnh **OpenClaw core** khi “không thể đạt được bằng extension points” hiện có.

### 6.3 Cập nhật submodule (dành cho dev)

```bash
git submodule update --init --recursive
git submodule update --remote --merge
```

---

## 7) Hướng dẫn chạy local (dev)

### 7.1 Yêu cầu môi trường (khuyến nghị)

- **Node.js >= 22.14.0** (OpenClaw core yêu cầu `>=22.14.0`).
- npm hoặc pnpm (OpenClaw dùng pnpm; VClaw UI dùng npm trong scripts hiện tại).
- **Trình duyệt Playwright**: Sẽ được tải về tự động khi khởi chạy quy trình liên quan thông qua Web Adapter.

### 7.2 Chạy VClaw UI (Next.js)

```bash
cd vclaw-ui
npm install
npm run dev
```

Scripts:
- `npm run dev`: chạy local dev server
- `npm run build`: build production
- `npm run start`: chạy production build
- `npm run lint`: eslint
- `npm run test`: vitest

### 7.3 Hướng dẫn build OpenClaw Core

Chạy các lệnh sau để cài đặt và xây dựng OpenClaw từ mã nguồn:

```bash
cd core/openclaw

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

> OpenClaw CLI có thể được cài global (tham khảo README của OpenClaw trong `core/openclaw/README.md`).

- `openclaw gateway`: khởi động API Gateway (nhận tin nhắn Telegram/Local…).
- `openclaw gateway --force`: tự động sửa lỗi & clean port.
- `openclaw channels login`: đăng nhập kênh tương tác.

### 7.5 Vận hành chạy ngầm với PM2

```bash
pm2 start openclaw --name "vclaw-gateway" -- gateway
pm2 save
```

### 7.6 Đóng gói thành App (Packaging) cho Macbook

Sử dụng script tự động để đóng gói toàn bộ ứng dụng (UI + Core) thành bộ cài đặt `.dmg`:

```bash
bash scripts/package-vclaw.sh
```

- **Kết quả**: File `.app` và `.dmg` sẽ được tạo tại `build/vclaw-desktop/dist/`.
- **Lưu ý**: Quy trình này thực hiện đóng gói cô lập, không ảnh hưởng đến mã nguồn gốc của OpenClaw core.

Chi tiết quy trình thủ công và cấu hình: `docs/10-Product-Packaging-And-Release.vi.md` (private, root repo)

### 7.7 Cấu hình Standalone (Cài đặt mặc định)

Bản đóng gói `.dmg` được thiết kế để hoạt động ngay lập tức nhờ cơ chế nhúng cấu hình mẫu:
- **Cấu hình mẫu**: Script đóng gói tự động lấy tệp `~/.openclaw/openclaw.json` của bạn và nhúng vào bundle ứng dụng.
- **Tự động khởi tạo**: Khi người dùng lần đầu mở `VClaw.app` trên máy mới, ứng dụng sẽ tự động sử dụng cấu hình mẫu này để thiết lập môi trường làm việc mà không cần cấu hình thủ công.

### 7.7 Cách mở ứng dụng Desktop trên macOS

Ứng dụng OpenClaw/VClaw được thiết kế dưới dạng **Menu Bar App** (hiển thị trên thanh Taskbar phía trên cùng của macOS).

- **Chế độ phát triển (build lại từ đầu):** Chạy lệnh sau để clean build và khởi chạy ngay lập tức:
  ```bash
  cd core/openclaw
  scripts/restart-mac.sh
  ```
- **Chạy nhanh bản đã build (không build lại):** 
  ```bash
  cd core/openclaw
  pnpm mac:open
  ```
- **Sử dụng bản đóng gói:** Sau khi chạy script ở mục 7.6, hãy tìm và mở file:
  `build/vclaw-desktop/dist/VClaw.app`

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

**Đội ngũ VClaw & OpenClaw Agent.**
