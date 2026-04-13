# VClaw UI Design Spec

## Goal

Xay dung `vclaw-ui` thanh mot website san pham hoan chinh co the deploy len Vercel, bao gom:

1. Landing page marketing cho VClaw.
2. Trang docs render markdown UI tu bo tai lieu hien co.
3. Admin/onboarding shell san sang noi API that trong cac vong tiep theo.

## Product Intent

`vclaw-ui` can phan anh dung dinh vi san pham da mo ta trong `docs/`:

1. VClaw la tro ly van hanh va ban hang local-first cho SMB Viet Nam.
2. OpenClaw la execution substrate o tang nen.
3. Web admin la be mat chinh cho non-technical operators.
4. Docs la be mat cong khai de doc BRD, architecture, implementation plan, va technical blueprint.

## Scope

### In Scope

1. Tao app `vclaw-ui` moi, doc lap voi `langeval-ui`.
2. Dung thu muc `docs/` lam source of truth cho tai lieu san pham.
3. Landing page hoan chinh voi product narrative, sections, CTA, va links vao docs/admin.
4. Docs viewer route `/docs` va `/docs/[...slug]`, render markdown theo UI rieng.
5. Admin shell route `/admin` va cac sub-routes chinh dung mock/local state.
6. Build thanh cong trong moi truong Vercel.

### Out of Scope

1. Backend API that.
2. Auth production.
3. Persist data server-side.
4. Tich hop voi OpenClaw runtime that.
5. CMS hay docs pipeline phuc tap.

## Architectural Decision

Huong chon la tao mot app Next.js moi trong `vclaw-ui`, nhung tham khao co chon loc cac pattern tot tu `langeval-ui`:

1. Marketing page structure.
2. Markdown rendering va docs route.
3. Dashboard shell pattern.

Khong copy nguyen app `langeval-ui`, vi nhu vay de mang theo qua nhieu man hinh va logic khong lien quan. Thay vao do:

1. Chi lay cac y tuong ve route, component, va visual rhythm.
2. To chuc app moi theo brand `VClaw`.
3. Toi uu de build gon, de deploy, va de noi backend sau nay.

## Information Architecture

### Public Surface

1. `/`
2. `/docs`
3. `/docs/[...slug]`

### Product Surface

1. `/admin`
2. `/admin/onboarding`
3. `/admin/inbox`
4. `/admin/customers`
5. `/admin/orders`
6. `/admin/payments`
7. `/admin/bookings`
8. `/admin/integrations`
9. `/admin/automation`
10. `/admin/settings`

## File and Data Layout

### Repository Layout

1. `docs/`: source of truth cho tat ca tai lieu markdown.
2. `vclaw-ui/`: Next.js app moi.
3. `langeval-ui/`: tham khao code, khong la runtime chinh cua VClaw UI.

### VClaw UI Internal Layout

Ben trong `vclaw-ui`, can chia thanh cac nhom sau:

1. `app/`: route landing, docs, admin.
2. `components/marketing/`: sections cua landing page.
3. `components/docs/`: docs sidebar, toc, markdown wrappers.
4. `components/admin/`: admin layout, cards, widgets, tables, workflow blocks.
5. `lib/docs/`: scan docs, parse slug, group navigation, read markdown.
6. `lib/mock/`: du lieu mock cho admin pages.
7. `lib/types/`: type definitions cho docs va admin entities.

## Docs Strategy

### Source of Truth

Thu muc `docs/` la noi luu tai lieu chinh thuc. `vclaw-ui` doc truc tiep cac file markdown tu `../docs`.

### Docs Rendering

Docs viewer can ho tro:

1. Sidebar navigation.
2. Docs index page.
3. Breadcrumb.
4. Previous/next navigation.
5. Markdown renderer voi `table`, `code`, `blockquote`, `links`.
6. Ho tro `mermaid` neu trong tai lieu co su dung.

### Grouping

Trong giai doan dau, docs se duoc group don gian:

1. Product docs.
2. Architecture and implementation docs.

Vong nay khong them metadata `frontmatter`; navigation se duoc sinh tu ten file va cau truc thu muc. Neu can metadata, do se la mot vong mo rong rieng.

## Landing Page Content Model

Landing page phai doc duoc nhu mot product site that, khong phai chi la mockup. Cac section can co:

1. Hero section:
   - VClaw la tro ly van hanh va ban hang local-first.
   - CTA vao docs.
   - CTA vao admin demo shell.
2. Problem section:
   - Chat phan manh.
   - Bill verification thu cong.
   - Tao QR va nhac lich ton thoi gian.
3. Core capability section:
   - VietQR.
   - Bill verification.
   - Address normalization.
   - Booking/reminders.
   - Commerce support.
4. Product surfaces section:
   - Local Web Admin.
   - Remote Access.
   - Chat-native Admin.
5. Workflow section:
   - Lead -> chat -> payment -> order/booking -> follow-up.
6. Trust and architecture section:
   - Build on OpenClaw.
   - Controlled product fork.
   - Local-first safety.
7. Final CTA section:
   - Read docs.
   - Open admin shell.

## Admin Shell Design

Admin shell o vong nay la `frontend-ready`, nghia la:

1. Route day du.
2. Layout production-friendly.
3. Mock data dung de demo va test flows.
4. Component boundaries ro rang de sau nay noi API khong phai viet lai.

### Admin Sections

1. Dashboard overview:
   - KPIs.
   - pending tasks.
   - recent activities.
2. Onboarding wizard:
   - channel selection
   - payment setup
   - delivery setup
   - service/booking setup
   - review
3. Inbox:
   - incoming conversations
   - lead status
4. Customers:
   - customer records
   - tags
   - activity history
5. Orders:
   - order-like workflow states
6. Payments:
   - QR generation
   - bill verification review
7. Bookings:
   - appointment list
   - reminders
8. Integrations:
   - channels
   - payment
   - delivery
9. Automation:
   - templates
   - rules
   - follow-up policies
10. Settings:
   - workspace-level preferences

## Design System Direction

Visual direction can:

1. Tham khao nhip dieu hien dai cua `langeval-ui`.
2. Dung cung mot design language cho landing, docs, admin.
3. Dung dark marketing surface cho landing va surface sang ro, de doc cho docs/admin.
4. Nhan manh clarity, trust, va operator UX.

Khong can pixel-perfect product dashboard, nhung phai nhin duoc nhu mot san pham that su.

## Vercel Deployment Requirements

De dam bao deploy duoc tren Vercel:

1. `vclaw-ui` phai la Next.js app tu build doc lap.
2. Khong phu thuoc vao local runtime rieng hay custom server.
3. Doc markdown bang file system tren server-side runtime cua Next.js.
4. Khong phu thuoc vao cac binary hay step build ngoai kha nang cua Vercel.
5. Co `package.json` ro rang, scripts `dev`, `build`, `start`, va `lint`.

Neu Vercel khong cho doc file ngoai app root trong mot cau hinh cu the, can fallback bang cach copy `docs/` vao trong app tai build step. Nhung phuong an mac dinh van la doc truc tiep tu repo-level docs de giu single source of truth.

## Testing and Verification

Can co muc verification toi thieu:

1. Build app thanh cong.
2. Docs routing hoat dong voi file markdown that.
3. Landing page render du.
4. Admin shell routes render du voi mock data.
5. Khong co link docs bi hong sau khi hop nhat tai lieu vao `docs/`.

## Implementation Order

Thu tu hop ly de giam rui ro:

1. Dam bao `docs/` chua day du bo tai lieu VClaw.
2. Scaffold `vclaw-ui`.
3. Tao docs loading va docs routes.
4. Tao design system core va app shell.
5. Dung landing page.
6. Dung admin shell va onboarding.
7. Chay build, lint, va fix van de deploy.

## Risks and Mitigations

### Risk 1: Docs loading khong on dinh tren Vercel

Mitigation:

1. To chuc docs reader theo server utility ro rang.
2. Neu can, them build-time copy step tu repo `docs/` vao app docs cache folder.

### Risk 2: Scope UI bi phong qua lon

Mitigation:

1. Admin shell dung mock-first.
2. Khong them auth/back-end that trong vong nay.
3. Uu tien route completeness hon business logic day du.

### Risk 3: Mang qua nhieu dau vet tu `langeval-ui`

Mitigation:

1. Khong clone nguyen structure.
2. Chi tham khao pattern, khong tai su dung man hinh business khong lien quan.

## Acceptance Criteria

Thiết kế nay duoc xem la dat neu ban implement tao ra:

1. Thu muc `docs/` chua bo tai lieu VClaw.
2. Thu muc `vclaw-ui/` chua app Next.js moi.
3. Landing page VClaw hoan chinh va coherent.
4. Docs markdown viewer hoat dong voi sidebar navigation va routes on dinh.
5. Admin shell co du cac routes chinh da liet ke.
6. Du an build duoc de deploy Vercel.
