# Đóng gói VClaw Desktop (`package-vclaw.sh`)

Tài liệu mô tả **thứ tự bước**, **lệnh copy**, **đích sau build**, và **hành vi cài đặt trên máy người dùng** (kèm `preinstall` / `postinstall`). Script nguồn: [`package-vclaw.sh`](./package-vclaw.sh).

---

## Tổng quan sản phẩm

| Artifact | Đường dẫn (sau khi chạy script) |
|----------|----------------------------------|
| Installer một file | `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg` |
| `.app` để thử (staging, trước khi đóng vào pkg) | `vclaw-ui/dist/.build/staging/VClaw.app` |

Luồng hiện tại: **một** gói component `pkgbuild` (`VClaw-component.pkg`) chứa `VClaw.app`, rồi `productbuild` ghép thành installer.

**Cơ chế bundle nội bộ:**
- OpenClaw CLI build từ nguồn local (`core/openclaw`) rồi đóng gói thành `openclaw-bundled.tgz` trong `VClaw.app`.
- Plugin `zalouser` cũng được đóng gói thành `zalouser-bundled.tgz` trong `VClaw.app`.
- `postinstall` sẽ copy các `.tgz` này về `~/.openclaw/...` (thuộc quyền user console) trước khi chạy lệnh cài, để tránh lỗi permission khi truy cập trực tiếp file trong `/Applications/VClaw.app`.

---

## Biến / đường dẫn quan trọng (trong `package-vclaw.sh`)

| Biến / đường dẫn | Ý nghĩa |
|------------------|---------|
| `ROOT_DIR` | Gốc repo `vclaw` |
| `UI_DIR` | `vclaw-ui` |
| `OPENCLAW_DIR` | `core/openclaw` (Nguồn của OpenClaw CLI) |
| `PACKAGING_DIR` / `VCLAW_LOGO_PNG` | `scripts/packaging/` — logo `vclaw-logo.png` dùng tạo `AppIcon.icns` và `launcher/branding/app-icon.png` |
| `MACOS_DIR` | `vclaw-ui/macos` (`vclaw`, `Info.plist`) |
| `SCRIPTS_DIR` | `scripts/pkg-scripts` (chứa `preinstall`, `postinstall`, `ReadMe`, `Conclusion`) |
| `STANDALONE` | `vclaw-ui/.next/standalone` (Next `output: 'standalone'`) |
| `BUILD_DIR` | `vclaw-ui/dist/.build` (thư mục tạm cho quá trình build) |
| `STAGING` | `vclaw-ui/dist/.build/staging` — root cho `pkgbuild` (bên trong có `VClaw.app`) |
| `APP_BUNDLE` | `…/staging/VClaw.app` |

---

## Các bước thực hiện (theo thứ tự trong script)

### Bước 0 — Chuẩn bị thư mục
- Xóa `vclaw-ui/dist/.build`, tạo lại cây `staging/VClaw.app/Contents/{MacOS,Resources/...}`.
- Tạo `vclaw-ui/dist` nếu chưa có.

### Bước 1 — `vclaw-ui`: cài dependency
- Chạy `pnpm install --frozen-lockfile` trong `vclaw-ui`.

### Bước 2 — Next.js: build standalone
- Chạy `pnpm build` (trừ khi đặt `SKIP_BUILD=1`). Tạo ra `.next/standalone` chứa server thu gọn.

### Bước 3 — Ghép static vào cây standalone
- Copy `.next/static` và `public` vào thư mục `standalone` để phục vụ giao diện.

### Bước 4 — Launcher Electron: dependency production
- Chạy `npm install --omit=dev` trong `vclaw-ui/launcher`. Đây là phần "nặng" nhất vì chứa nhân Chromium.

### Bước 5 — Build & Bundle OpenClaw CLI + plugin `zalouser`
- Build nguồn từ `core/openclaw` (trừ khi đặt `SKIP_OPENCLAW_BUILD=1`).
- Dùng `npm pack` để tạo `openclaw-bundled.tgz`. File này sẽ được copy vào `VClaw.app/Contents/Resources/`.
- Dùng `npm pack` trong `core/extensions/zalouser` để tạo `zalouser-bundled.tgz`, cũng copy vào `VClaw.app/Contents/Resources/`.

### Bước 6 — Dựng `VClaw.app` (Ghép các thành phần)
- Copy binary macOS (`vclaw`), `Info.plist`, code server (`app`), code launcher (`launcher`).
- Copy `openclaw.default.json` và `uninstall-vclaw.sh`.
- Tự động sinh `AppIcon.icns` từ `scripts/packaging/vclaw-logo.png`.

### Bước 7 — `pkgbuild` & `productbuild`
- `pkgbuild`: Tạo component package, đặt `BundleIsRelocatable = false`.
- `productbuild`: Ghép thành installer hoàn chỉnh với tài liệu `ReadMe.html`, `Conclusion.html`.

---

## Hành vi khi cài đặt trên máy người dùng

### `preinstall` (Chạy trước khi copy file)
- **Log file:** `/tmp/vclaw-preinstall.log`.
- **Dừng dịch vụ:** Tắt các tiến trình VClaw, Ollama và Gateway.
- **Hard Reset:** Xóa sạch `/Applications/VClaw.app`, `~/.openclaw` và `~/.ollama` để đảm bảo cài mới hoàn toàn.
- **Kiểm tra Node.js:** Tự động tải và cài đặt Node.js v22.14.0 nếu hệ thống chưa có Node 20+.

### `postinstall` (Chạy sau khi copy file)
- **Log file:** `/tmp/vclaw-postinstall.log`.
- **Cấu hình:** Khởi tạo `~/.openclaw`, copy config mặc định và `business.sqlite`.
- **Cài đặt OpenClaw:** copy `openclaw-bundled.tgz` từ app bundle vào `~/.openclaw/bundled-packages/`, rồi cài vào `~/.openclaw/runtime`.
- **Cài plugin local (`zalouser`):** copy `zalouser-bundled.tgz` vào `~/.openclaw/bundled-plugins/` rồi chạy `openclaw plugins install ... --force`.
- **Dịch vụ:** Chạy `openclaw gateway install --force` rồi `gateway start`.
- **Ollama:** Tự động cài đặt Ollama qua script của hãng.
- **Khởi động:** Tự động mở ứng dụng VClaw sau khi xong.

---

## Biến môi trường và Tham số

| Biến / Tham số | Ý nghĩa |
|----------------|---------|
| `SKIP_BUILD=1` | Bỏ qua build Next.js. |
| `SKIP_OPENCLAW_BUILD=1` | Bỏ qua build OpenClaw CLI source. |
| `--arm64` | Build cho Apple Silicon (M1/M2/M3). |
| `--x64` | Build cho Intel (x86_64). |

---

## Lệnh thực hiện

```bash
# Build cho kiến trúc hiện tại của máy
bash scripts/package-vclaw.sh

# Build cho kiến trúc cụ thể
bash scripts/package-vclaw.sh --arm64
bash scripts/package-vclaw.sh --x64

# Chạy nhanh (nếu đã build code xong)
SKIP_BUILD=1 SKIP_OPENCLAW_BUILD=1 bash scripts/package-vclaw.sh
```

---

## Gỡ cài đặt

Người dùng có thể gỡ bỏ hoàn toàn VClaw bằng script đi kèm:
- `/Applications/VClaw.app/Contents/Resources/uninstall-vclaw.sh`
- Hoặc `sudo bash scripts/uninstall-vclaw.sh` (từ repo).

Script sẽ hỏi xác nhận trước khi xóa dữ liệu chat và Ollama.

---

## Các thư mục sau khi cài đặt (máy người dùng)

### 1) Thành phần ứng dụng (`/Applications`)
- `/Applications/VClaw.app`: bundle app chính.
- `/Applications/VClaw.app/Contents/Resources/app`: Next.js standalone server.
- `/Applications/VClaw.app/Contents/Resources/launcher`: Electron launcher + runtime deps.
- `/Applications/VClaw.app/Contents/Resources/openclaw-bundled.tgz`: gói OpenClaw để postinstall cài local.
- `/Applications/VClaw.app/Contents/Resources/zalouser-bundled.tgz`: gói plugin local `zalouser`.
- `/Applications/VClaw.app/Contents/Resources/openclaw.default.json`: config mẫu ban đầu.

### 2) Dữ liệu runtime của người dùng (`~/.openclaw`)
- `~/.openclaw/openclaw.json`: config OpenClaw của user.
- `~/.openclaw/business.sqlite`: DB khởi tạo từ bundle app.
- `~/.openclaw/runtime`: nơi `npm install openclaw-bundled.tgz` (chứa `node_modules/openclaw`).
- `~/.openclaw/bundled-packages/openclaw-bundled.tgz`: file archive OpenClaw copy từ app bundle để cài với quyền user.
- `~/.openclaw/extensions`: thư mục plugin sau khi chạy `openclaw plugins install` (bao gồm `zalouser` nếu cài thành công).
- `~/.openclaw/bundled-plugins/zalouser-bundled.tgz`: file archive trung gian copy từ app bundle để cài plugin với quyền user.

### 3) Liên kết CLI hệ thống
- `/usr/local/bin/openclaw` → symlink tới `~/.openclaw/runtime/node_modules/.bin/openclaw`.

### 4) Dữ liệu UI/Electron
- `~/Library/Application Support/VClaw/ShellElectron`: userData của shell Electron (session/cookie/local state).

### 5) Ollama
- Binary thường ở `/usr/local/bin/ollama` hoặc `/opt/homebrew/bin/ollama` (phụ thuộc máy và script của Ollama).
- Model/cache runtime thường trong `~/.ollama`.


