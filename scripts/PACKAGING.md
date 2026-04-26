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
6. **Lắp `VClaw.app`**: binary `macos/vclaw`, `Info.plist` (version từ `package.json`), copy cây standalone → `Resources/app/`, xóa `business.sqlite` nếu có, copy launcher + `node_modules`.
7. **Config & Zero Token (Resources)**:
   - File cấu hình mặc định người dùng: `vclaw-ui/resources/openclaw.zero-token.default.json` → `Contents/Resources/openclaw.default.json`.
   - `core/openclaw-zero-token/start-chrome-debug.sh` → `Contents/Resources/start-chrome-debug.sh`.
   - `scripts/vclaw-zero.sh` → `Contents/Resources/vclaw-zero.sh` (cùng thư mục với `start-chrome-debug.sh`: Chrome CDP → `openclaw onboard webauth` → `openclaw gateway run` nền).

   *(Trong script có một dòng copy `openclaw.default.json` trước đó; bản dùng thật là preset zero-token ở trên.)*

8. **OpenClaw tarball**: `OPENCLAW_DIR="$ROOT_DIR/core/openclaw-zero-token"`. Cần `dist/` sẵn (build trước khi đóng gói). `npm pack` → đúng một `openclaw-*.tgz` trong `dist/.build` → `Contents/Resources/openclaw-bundled.tgz`.

9. **Tiện ích**: `scripts/uninstall-vclaw.sh` → Resources; icon (nếu có `scripts/packaging/vclaw-logo.png` + `iconutil`).

10. **Installer**: `chmod +x` `pkg-scripts/preinstall` và `postinstall`; `pkgbuild` (root `/Applications`, bundle không relocatable) + `productbuild` (ReadMe/Conclusion trong `pkg-scripts/`).

Không có bước `pnpm ui:build` riêng trong script đóng gói hiện tại (UI gateway nằm trong quy trình build của chính `openclaw-zero-token` nếu dự án đó yêu cầu).

## `preinstall` (pkg)

- `pkill` VClaw; nếu có `openclaw`: `gateway stop`, `gateway uninstall --force`.
- Xóa `/Applications/VClaw.app`, symlink/binary `openclaw` thường gặp, `~/.openclaw`.
- Nếu Node chưa đủ major 20 hoặc thiếu: thử tải Node **v22.14.0** darwin arm64/x64 vào `/usr/local` (cần quyền ghi); nếu không được thì người dùng cài tay.

## `postinstall` (pkg) — 3 bước log `[1/3]` … `[3/3]`

1. Tạo `~/.openclaw`; **chỉ** copy `openclaw.default.json` từ app → `~/.openclaw/openclaw.json` nếu file đích **chưa tồn tại** (không ghi đè config đã có).
2. Copy `openclaw-bundled.tgz` → `~/.openclaw/bundled-packages/`, `npm install` tarball vào `~/.openclaw/runtime`, symlink `openclaw` → `/usr/local/bin/openclaw`.
3. Mở **Terminal** (AppleScript) chạy `bash /Applications/VClaw.app/Contents/Resources/vclaw-zero.sh` (Chrome CDP → `openclaw onboard webauth` → `openclaw gateway run` nền trên cổng 3001, `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` trỏ `~/.openclaw`). **Không** chạy `gateway install`, `plugins install` zalouser, Ollama hay `open -a VClaw` trong postinstall (luồng user-driven giống `core/openclaw-zero-token/server.sh`).

Nhật ký: `/tmp/vclaw-postinstall.log`.

## Tài nguyên trong app sau build

| Đường dẫn trong `VClaw.app` | Mục đích |
|-----------------------------|----------|
| `Contents/Resources/openclaw.default.json` | Preset Zero Token (từ `openclaw.zero-token.default.json`). |
| `Contents/Resources/openclaw-bundled.tgz` | Gói `openclaw` đã pack từ `core/openclaw-zero-token`. |
| `Contents/Resources/start-chrome-debug.sh` | Mở Chrome CDP (profile shell VClaw). |
| `Contents/Resources/vclaw-zero.sh` | Luồng Zero Token: Chrome → `openclaw onboard webauth` → gateway. |
| `Contents/Resources/uninstall-vclaw.sh` | Gỡ cài đặt thủ công nếu cần. |

## Sau khi người dùng cài pkg

- `~/.openclaw/openclaw.json`, `~/.openclaw/runtime` (state/plugin theo cấu hình OpenClaw, có thể dùng plugin bundled trong gói `openclaw`).
- `~/Library/Application Support/VClaw/ShellElectron`: profile Electron/Chrome dùng chung cho VClaw và bước webauth.

## Lệnh build mẫu

```bash
bash scripts/package-vclaw.sh
bash scripts/package-vclaw.sh --arm64
bash scripts/package-vclaw.sh --x64
SKIP_BUILD=1 bash scripts/package-vclaw.sh
```
