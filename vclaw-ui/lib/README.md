# `lib/` Organization Convention

Muc tieu: giu `lib/` de doc, de tim, de mo rong ma khong bi "file roi" o root.

## Nguyen tac chinh

- Toan bo logic moi trong `lib/` phai duoc dat theo **domain folder**.
- Uu tien import theo domain:
  - Dung: `@/lib/<domain>/<file>`
  - Tranh: `@/lib/<file>` (root-level file roi, khong ro ngu canh)
- Khi thay doi lon, refactor theo cum domain (khong doi ten file ngau nhien tung cai le).

## Cac domain hien tai

- `admin/`: content, runtime, revalidate cho admin shell
- `admin-chat/`: intent va storage cho AI chat admin
- `channel/`: pilot/provider/ingest lien quan kenh inbound
- `commerce/`: orders, payments, tasks, report stats
- `gateway/`: client, server, env, ws-url cho OpenClaw gateway
- `integration/`: oauth flash, provider map, external links, public profile sanitize
- `logistics/`: shipping, GHN/GHTK quote va config
- `zalouser/`: luong Zalo user/OpenClaw theo nghiep vu
- `openclaw/`: server-side OpenClaw helper/rpc wrapper
- `actions/`: server actions theo module nghiep vu
- `i18n/`: helper/test routing i18n

## Quy tac them file moi

1. Xac dinh domain truoc khi tao file.
2. Tao trong folder domain tuong ung.
3. Dat ten file theo vai tro ro rang (`client.ts`, `providers.ts`, `report-stats.ts`, ...).
4. Neu module co test, dat test cung domain (`<name>.test.ts` cung folder).
5. Cap nhat import theo path moi va quet lai import cu.

## Naming convention chi tiet

- `client.ts`: module chi dung cho client/browser (`"use client"` hoac phu thuoc Web APIs).
- `server.ts`: module chi dung cho server (Route Handler, Server Action, Server Component).
- `env.ts`: helper doc bien moi truong va fallback policy.
- `types.ts`: type chung khong chua side-effect/runtime logic.
- `constants.ts`: hang so domain-level, khong co business flow.
- `helpers.ts` hoac `<topic>-utils.ts`: helper nho, tinh chat thu vien.
- `index.ts`:
  - Chi tao khi can "public entry" cho domain.
  - Khong dung `index.ts` neu no lam import mo ho, kho trace source.

## Quy uoc test file

- Unit test dat canh module:
  - `foo.ts` -> `foo.test.ts`
- Neu test scope lon hon 1 file, dat ten theo use-case:
  - `oauth-flow.test.ts`, `shipping-quotes.test.ts`
- Tranh ten chung chung `utils.test.ts` neu khong ro nghiep vu.

## Quy uoc export/import

- Uu tien named export, tranh default export cho helper/module core.
- Import bang alias tuyet doi:
  - Dung: `@/lib/<domain>/<file>`
  - Tranh: import tuong doi sau (`../../..`) trong code app.
- Khong cross-import lung tung giua domain:
  - Neu domain A dung domain B qua nhieu, can tach phan dung chung sang domain thu 3 ro nghia hon.

## Mau skeleton domain

Dung mau nay khi tao domain moi trong `lib/`:

```txt
lib/<domain>/
  client.ts            # neu can logic browser
  server.ts            # neu can logic server-only
  env.ts               # doc env + fallback
  types.ts             # type public cua domain
  constants.ts         # const dung chung trong domain
  <feature>.ts         # business logic theo use-case
  <feature>.test.ts    # unit test canh module
  index.ts             # tuy chon, chi khi can public entry
```

Vi du nhanh:

```txt
lib/notification/
  server.ts
  providers.ts
  templates.ts
  templates.test.ts
```

## Khi nao can tao domain moi

Tao folder domain moi khi co it nhat 2-3 file lien quan cung ngiep vu hoac se tiep tuc tang truong.
Neu moi chi co 1 helper nho, dat vao domain gan nhat (tranh tao domain qua manh).

## Checklist truoc khi merge refactor structure

- Khong con import den path cu
- Build/test pass cho nhom file vua doi
- Lint khong loi
- Khong doi hanh vi runtime (chi doi vi tri/module boundary)

## Luu y

- `lib/` khong phai noi de dat "misc".
- Neu phan nao "khong biet de dau", dung 5 phut dat ten domain ro rang truoc khi code.
