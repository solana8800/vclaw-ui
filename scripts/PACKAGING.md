# Đóng gói VClaw Desktop

Script chính: `scripts/package-vclaw.sh`.

Runtime OpenClaw trong installer **luôn** lấy từ **`core/openclaw-zero-token`** (cùng tên gói npm `openclaw`, preset Zero Token + webauth), không dùng submodule `core/openclaw` gốc.

## Output

- Installer: `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg`
- App staging (trước khi đóng pkg): `vclaw-ui/dist/.build/staging/VClaw.app`

## Biến môi trường khi build

| Biến | Ý nghĩa |
|------|--------|
| `SKIP_BUILD=1` | Bỏ `pnpm build` Next.js; bắt buộc đã có `.next/standalone`. |

Trước khi chạy `package-vclaw.sh`, cần đã `pnpm build` trong `core/openclaw-zero-token` (có `dist/`) vì script chỉ `npm pack` tarball, không build lại OpenClaw.

Cờ kiến trúc: `--arm64` / `--x64` (mặc định theo `uname -m`).

## Luồng `package-vclaw.sh` (tóm tắt)

1. **`ROOT_DIR` / `UI_DIR`**: repo gốc, `vclaw-ui/`.
2. **Staging**: `vclaw-ui/dist/.build/staging/VClaw.app/Contents/{MacOS,Resources/{app,launcher}}`.
3. **`vclaw-ui`**: `pnpm install --frozen-lockfile`.
4. **Next.js**: trừ khi `SKIP_BUILD=1` — xóa `.next`, `pnpm build` (standalone), rồi copy `.next/static` và `public` vào thư mục standalone.
5. **Launcher**: trong `vclaw-ui/launcher`, `npm install --omit=dev`.
6. **Lắp `VClaw.app`**: binary `macos/vclaw`, `Info.plist` (version từ `package.json`), copy cây standalone → `Resources/app/`, xóa `Resources/app/macos` để tránh PackageKit nhận nhầm source macOS như nested app bundle khi upgrade, xóa `business.sqlite` nếu có, copy launcher + `node_modules`.
7. **Config & Zero Token (Resources)**:
   - File cấu hình mặc định người dùng: `vclaw-ui/resources/openclaw.zero-token.default.json` → `Contents/Resources/openclaw.default.json`.
   - `scripts/vclaw.sh` → `Contents/Resources/vclaw.sh` (luồng hỗ trợ chạy tay/dev: tìm `~/.openclaw/runtime/node_modules/.bin/openclaw`, tự cài từ `openclaw-bundled.tgz` nếu thiếu, rồi Chrome CDP → `openclaw onboard webauth` → `openclaw gateway run` nền).

   *(Trong script có một dòng copy `openclaw.default.json` trước đó; bản dùng thật là preset zero-token ở trên.)*

8. **OpenClaw tarball**: `OPENCLAW_DIR="$ROOT_DIR/core/openclaw-zero-token"`. Cần `dist/` sẵn (build trước khi đóng gói). `npm pack` → đúng một `openclaw-*.tgz` trong `dist/.build` → `Contents/Resources/openclaw-bundled.tgz`.

9. **Tiện ích**: `scripts/uninstall-vclaw.sh` → Resources; icon (nếu có `scripts/packaging/vclaw-logo.png` + `iconutil`).

10. **Installer**: `chmod +x` `pkg-scripts/preinstall` và `postinstall`; `pkgbuild` (root `/Applications`, set `BundleIsRelocatable=false` bằng `PlistBuddy`) + `productbuild` (ReadMe/Conclusion trong `pkg-scripts/`).

Không có bước `pnpm ui:build` riêng trong script đóng gói hiện tại (UI gateway nằm trong quy trình build của chính `openclaw-zero-token` nếu dự án đó yêu cầu).

## `preinstall` (pkg)

- Dừng VClaw, launcher, Gateway cũ theo PID file/cổng để có thể thay app và runtime.
- Xóa `/Applications/VClaw.app`, wrapper gỡ cài đặt cũ, symlink/binary `openclaw` thường gặp.
- Chỉ xóa artifact có thể tái tạo trong `~/.openclaw`: `runtime/`, `bundled-packages/`, `bundled-plugins/`, PID file Gateway.
- Không xóa `~/.openclaw/openclaw.json`, `~/.openclaw/workspace`, `~/.openclaw/business.sqlite`, session/auth state hoặc dữ liệu khách hàng. Nếu dữ liệu cần đổi schema, app xử lý bằng migration.
- Không chạy `openclaw gateway uninstall --force` trong đường cài/nâng cấp để tránh đụng config/state khách hàng.
- Nếu Node chưa đủ major 22 hoặc thiếu: thử tải Node **v22.14.0** darwin arm64/x64 vào `/usr/local` (cần quyền ghi); nếu không được thì người dùng cài tay.

## `postinstall` (pkg) — 3 bước log `[1/3]` … `[3/3]`

1. Tạo `~/.openclaw`; **chỉ** copy `openclaw.default.json` từ app → `~/.openclaw/openclaw.json` nếu file đích **chưa tồn tại** (không ghi đè config đã có).
2. Copy `openclaw-bundled.tgz` → `~/.openclaw/bundled-packages/`, `npm install` tarball vào `~/.openclaw/runtime`, thử tạo symlink `openclaw` để tiện gọi tay. Symlink không còn là điều kiện bắt buộc vì `vclaw.sh` dùng trực tiếp binary trong runtime.
3. Sửa thiếu plugin manifest từ `extensions/*/openclaw.plugin.json` sang `dist/extensions/*/openclaw.plugin.json` nếu gói runtime cần vá. Không mở VClaw, không chạy WebAuth, không start Gateway. `postinstall` chỉ kết luận runtime đã sẵn sàng hoặc ghi log để `VClaw.app` tự phục hồi khi mở ứng dụng.

## `VClaw.app` launcher và OpenClaw lifecycle

Khi người dùng mở app, `vclaw-ui/launcher/main.js` là nơi sở hữu lifecycle OpenClaw:

- Seed `~/.openclaw/openclaw.json` và `~/.openclaw/workspace` nếu còn thiếu.
- Tự cài lại OpenClaw từ `openclaw-bundled.tgz` nếu runtime chưa có, và repair plugin manifest như fallback nếu runtime bị thay đổi sau cài đặt.
- Mở Electron với CDP port `9222`, chạy `openclaw onboard webauth --providers deepseek-web`, sau đó start `openclaw gateway run --port <config> --force`.
- Ghi PID vào `~/.openclaw/.vclaw-zero-gateway.pid`.
- Khi VClaw thoát, launcher dừng Gateway để người dùng chủ động quyết định lúc nào bot chạy.

UI vẫn giữ nút WebAuth/Restart trong admin để recover hoặc login lại thủ công, nhưng startup mặc định phải cố gắng đưa AI chat về trạng thái dùng được.

Nhật ký: `/tmp/vclaw-postinstall.log`.

## Tài nguyên trong app sau build

| Đường dẫn trong `VClaw.app` | Mục đích |
|-----------------------------|----------|
| `Contents/Resources/openclaw.default.json` | Preset Zero Token (từ `openclaw.zero-token.default.json`). |
| `Contents/Resources/openclaw-bundled.tgz` | Gói `openclaw` đã pack từ `core/openclaw-zero-token`. |
| `Contents/Resources/vclaw.sh` | Luồng Zero Token: tự tìm/cài OpenClaw runtime → Chrome → `openclaw onboard webauth` → gateway. |
| `Contents/Resources/uninstall-vclaw.sh` | Gỡ cài đặt thủ công nếu cần. |

## Sau khi người dùng cài pkg

- `~/.openclaw/openclaw.json`, `~/.openclaw/runtime` (state/plugin theo cấu hình OpenClaw, có thể dùng plugin bundled trong gói `openclaw`).
- `~/Library/Application Support/VClaw/ShellElectron`: profile Electron/Chrome dùng chung cho VClaw và bước webauth.

## Gỡ cài đặt và dữ liệu khách hàng

- Cài lại hoặc nâng cấp bằng `.pkg` phải giữ nguyên dữ liệu khách hàng.
- `scripts/uninstall-vclaw.sh` mặc định gỡ app/runtime nhưng giữ `~/.openclaw` để có thể phục hồi khi cài lại.
- Chỉ khi người dùng chọn xóa sạch hoặc chạy `uninstall-vclaw.sh --clean` mới xóa toàn bộ `~/.openclaw`, gồm workspace, session/auth state, `business.sqlite`, config và dữ liệu khách hàng.

## Lệnh build mẫu

```bash
bash scripts/package-vclaw.sh
bash scripts/package-vclaw.sh --arm64
bash scripts/package-vclaw.sh --x64
SKIP_BUILD=1 bash scripts/package-vclaw.sh
```
