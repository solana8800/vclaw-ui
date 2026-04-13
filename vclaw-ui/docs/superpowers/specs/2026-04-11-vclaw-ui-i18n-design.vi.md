# VClaw UI I18n Design Spec

## Goal

Refactor `vclaw-ui` thanh mot website song ngu co cau truc ro rang, trong do:

1. Tieng Viet la ngon ngu mac dinh tai `/`.
2. Tieng Anh duoc phuc vu tai `/en/...`.
3. Landing page, docs UI, admin shell, va navigation deu ho tro ca hai ngon ngu.
4. Docs markdown co fallback ro rang khi chua co ban dich tieng Anh.

## Product Intent

Refactor nay khong chi la doi text trong UI. Muc tieu la bien `vclaw-ui` thanh mot app co nen tang i18n dung chuan de:

1. Phuc vu nguoi dung Viet Nam ngay lap tuc ma khong can route prefix.
2. Ho tro khach hang hoac doi tac quoc te qua he thong route va metadata rieng cho tieng Anh.
3. Giu cho thong diep san pham, docs, va admin shell nhat quan theo tung ngon ngu.
4. Tao nen tang de mo rong them locale khac trong tuong lai neu can.

## Scope

### In Scope

1. Them he thong route `vi` mac dinh va `en` co prefix.
2. Refactor text hardcoded trong landing page, app shell, docs shell, va admin shell thanh message dictionaries.
3. Ho tro language switcher de chuyen doi giua `/...` va `/en/...` tren cung mot loai trang.
4. Refactor docs loader de doc file markdown theo locale.
5. Dinh nghia fallback cho docs thieu ban dich tieng Anh.
6. Cap nhat metadata, `html lang`, va labels de phan anh locale dang hoat dong.

### Out of Scope

1. Tu dong phat hien browser language va redirect ngay o vong nay.
2. He thong CMS hay translation management phuc tap.
3. Locales khac ngoai `vi` va `en`.
4. Dich toan bo noi dung docs san pham trong cung mot vong refactor neu chua co noi dung nguon.
5. Backend i18n API hoac persisted user locale preferences.

## Architectural Decision

Huong chon la dua `vclaw-ui` sang mot i18n architecture co route-based locale su dung `next-intl`.

Ly do chon huong nay:

1. App da duoc tach thanh root doc lap trong `vclaw-ui`, nen day la thoi diem phu hop de dat nen tang i18n dung chuan.
2. Route `/` va `/en/...` ro rang hon cach chi doi text bang state trong client.
3. `next-intl` phu hop voi Next.js App Router va giam rui ro tu viet mot framework i18n rieng.
4. Metadata, routing, va locale-specific rendering can mot giai phap hop voi server components.

## Information Architecture

### Route Model

Tieng Viet la route mac dinh:

1. `/`
2. `/docs`
3. `/docs/[slug]`
4. `/admin`
5. `/admin/...`

Tieng Anh dung route prefix:

1. `/en`
2. `/en/docs`
3. `/en/docs/[slug]`
4. `/en/admin`
5. `/en/admin/...`

### Route Equivalence

Language switcher phai chuyen doi giua hai route tuong ung thay vi dua nguoi dung ve trang chu.

Vi du:

1. `/admin/orders` <-> `/en/admin/orders`
2. `/docs/00-Business-Requirements` <-> `/en/docs/00-Business-Requirements`
3. `/` <-> `/en`

Neu route hien tai khong co mapping hop le, language switcher se fallback ve home page cua locale do.

## File and Data Layout

### Docs Directory

`vclaw-ui/docs/` la source of truth cho docs cua app. Docs markdown theo locale se co ten file:

1. `00-Business-Requirements.vi.md`
2. `00-Business-Requirements.en.md`

Ten slug van duoc tinh tu phan base name:

1. `00-Business-Requirements`
2. `01-System-Architecture`

### Messages Directory

Them message dictionaries trong app:

1. `vclaw-ui/messages/vi/common.json`
2. `vclaw-ui/messages/vi/navigation.json`
3. `vclaw-ui/messages/vi/landing.json`
4. `vclaw-ui/messages/vi/admin.json`
5. `vclaw-ui/messages/vi/docs.json`
6. `vclaw-ui/messages/en/...` voi cau truc tuong tu

Tach namespace nhu vay giup giam kich thuoc file va giu component boundaries ro rang.

## Translation Strategy

### UI Translation

Tat ca UI chrome can duoc dua vao dictionaries:

1. Header, footer neu co, va nav labels.
2. Landing page hero, sections, CTA, va card copy.
3. Admin shell titles, descriptions, labels, va helper text.
4. Docs layout labels nhu `Documentation`, `Previous`, `Next`, `Open documentation page`.
5. Metadata titles va descriptions theo locale.
6. Empty states, fallback notices, va not-found copy neu co.

### Docs Translation

Noi dung markdown duoc xu ly rieng voi UI chrome:

1. Neu locale la `vi`, docs loader uu tien file `.vi.md`.
2. Neu locale la `en`, docs loader uu tien file `.en.md`.
3. Neu `.en.md` khong ton tai, he thong fallback sang `.vi.md`.
4. Khi fallback xay ra, docs page phai hien notice ro rang rang ban dang xem noi dung mac dinh vi ban dich tieng Anh chua san sang.

Fallback notice phai trung thuc va de hieu, tranh tao cam giac day la ban dich chinh thuc.

## Runtime Behavior

### Locale Resolution

Locale duoc xac dinh tu route:

1. Khong co prefix -> `vi`
2. Co prefix `/en` -> `en`

Khong them redirect dua tren browser language trong vong nay de tranh phat sinh nhieu hanh vi kho test va kho doan.

### Layout Behavior

Root layout va locale layout phai dam bao:

1. `html lang` dung voi locale hien tai.
2. Metadata theo locale.
3. Navigation labels theo locale.
4. Language switcher hien locale hien tai va route dich sang locale con lai.

### Docs Behavior

Docs index can hien:

1. Tieu de va mo ta theo locale.
2. Danh sach tai lieu theo locale shell.
3. File title duoc suy ra tu ten file base name de giu consistency giua `vi` va `en`.

Neu docs content fallback tu `vi` trong route `/en/...`, phan shell van la tieng Anh, nhung notice phai thong bao ro noi dung hien tai chua duoc dich.

## Component Boundaries

### I18n Infrastructure

Them mot lop i18n infrastructure rieng, chiu trach nhiem:

1. Quan ly danh sach locales hop le.
2. Load messages theo locale.
3. Tao helper lay localized route.
4. Doc locale tu route params.

### Docs Utilities

`lib/docs.ts` can duoc tach ro trach nhiem:

1. Scan base doc identifiers.
2. Resolve file theo locale va fallback.
3. Tra metadata ve locale dang yeu cau, locale thuc te duoc phuc vu, va co fallback hay khong.
4. Giu safe slug validation nhu hien tai.

### UI Components

Components hien tai khong nen tu doc file messages truc tiep mot cach tuy tien. Thay vao do:

1. Pages/layouts se lay translations va truyen xuong props khi phu hop.
2. Shared helpers hoac hooks se duoc dung o noi can thiet de giam prop drilling qua muc.
3. Components chung nhu `DocsLayout` va `AdminShell` chi nhan text da localized hoac tu namespace ro rang.

## Refactor Targets

Nhung khu vuc can refactor trong vong nay:

1. `app/layout.tsx`
2. `app/page.tsx`
3. `components/marketing/landing-page.tsx`
4. `components/admin/admin-shell.tsx`
5. Toan bo `app/admin/**`
6. `app/docs/[[...slug]]/page.tsx`
7. `components/docs/docs-layout.tsx`
8. `lib/docs.ts`
9. Test files lien quan den docs loader va docs rendering

## Testing and Verification

Can co verification toi thieu cho vong refactor nay:

1. Unit test cho docs loader voi ca `vi`, `en`, va fallback tu `en` sang `vi`.
2. Unit test cho helper route mapping giua `/...` va `/en/...`.
3. Build app thanh cong voi route model moi.
4. Lint pass.
5. Kiem tra thu cong:
   - landing page tai `/` va `/en`
   - docs index va doc detail tai hai locale
   - admin overview va it nhat mot sub-page tai hai locale
   - language switcher giu dung route context

## Risks and Mitigations

### Risk 1: Fallback docs gay nham rang da co ban dich

Mitigation:

1. Hien notice ro rang khi `en` fallback ve `vi`.
2. Khong an fallback behavior trong im lang.

### Risk 2: Refactor text qua rong gay sot hardcoded copy

Mitigation:

1. Gom text theo namespace.
2. Refactor theo surface: app shell -> landing -> docs -> admin.
3. Dung search co he thong de giam text sot lai.

### Risk 3: Route model moi lam vo link hien tai

Mitigation:

1. Giu nguyen route `vi` khong prefix de tranh pha vo link mac dinh.
2. Them helper mapping route thay vi noi string thu cong o nhieu noi.

## Acceptance Criteria

Thiet ke nay duoc xem la dat khi implementation tao ra:

1. `vclaw-ui` ho tro tieng Viet mac dinh tai `/`.
2. `vclaw-ui` ho tro tieng Anh tai `/en/...`.
3. Landing page, docs shell, va admin shell deu hien thi dung theo locale.
4. Language switcher doi locale ma van giu duoc route tuong ung.
5. Docs loader doc duoc file `.vi.md` va `.en.md`.
6. Neu file `.en.md` thieu, route `/en/docs/...` van hoat dong, shell van la tieng Anh, va co notice fallback ro rang.
7. `npm test`, `npm run lint`, va `npm run build` deu pass trong `vclaw-ui`.
