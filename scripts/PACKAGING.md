# Đóng gói VClaw Desktop (`package-vclaw.sh`)

Tài liệu mô tả **thứ tự bước**, **lệnh copy**, **đích sau build**, và **hành vi cài đặt trên máy người dùng** (kèm `preinstall` / `postinstall`). Script nguồn: [`package-vclaw.sh`](./package-vclaw.sh).

---

## Tổng quan sản phẩm

| Artifact | Đường dẫn (sau khi chạy script) |
|----------|----------------------------------|
| Installer một file | `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg` |
| `.app` để thử (staging, trước khi đóng vào pkg) | `vclaw-ui/dist/.build/staging/VClaw.app` |

Luồng hiện tại: **một** gói component `pkgbuild` (`VClaw-component.pkg`) chứa `VClaw.app`, rồi `productbuild` ghép thành installer. 

**Cơ chế OpenClaw:** OpenClaw CLI được build trực tiếp từ nguồn local (`core/openclaw`) và đóng gói thành file `.tgz` đặt vào trong bundle `.app`. Khi cài đặt, script `postinstall` sẽ cài đặt OpenClaw từ file nội bộ này, giúp đảm bảo phiên bản OpenClaw luôn đi kèm và khớp với phiên bản UI mà không phụ thuộc vào kết nối Internet tới npm registry cho gói chính.

---

## Biến / đường dẫn quan trọng (trong `package-vclaw.sh`)

| Biến / đường dẫn | Ý nghĩa |
|------------------|---------|
| `ROOT_DIR` | Gốc repo `vclaw` |
| `UI_DIR` | `vclaw-ui` |
| `OPENCLAW_DIR` | `core/openclaw` (Nguồn của OpenClaw CLI) |
| `ASSETS_DIR` | `assets` (logo → `AppIcon.icns`, branding Electron) |
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

- **Thư mục:** `cd vclaw-ui`
- **Lệnh:** `pnpm install --frozen-lockfile`

### Bước 2 — Next.js: build standalone

| Điều kiện | Hành động |
|-----------|-----------|
| `SKIP_BUILD=0` (mặc định) | Xóa `vclaw-ui/.next`, chạy `pnpm build` (tạo `.next/standalone`). |
| `SKIP_BUILD=1` | Bỏ qua bước build Next.js; yêu cầu đã có sẵn `.next/standalone`. |

### Bước 3 — Ghép static vào cây standalone

Script bổ sung các file static mà Next standalone không tự copy:
- `vclaw-ui/.next/static` → `vclaw-ui/.next/standalone/.next/static`
- `vclaw-ui/public` → `vclaw-ui/.next/standalone/public`

### Bước 4 — Launcher Electron: dependency production

- **Thư mục:** `vclaw-ui/launcher`
- **Lệnh:** `npm install --omit=dev --prefer-offline`
- **Mục đích:** Chuẩn bị `node_modules` (gồm `electron`) để copy vào bundle.

### Bước 5 — Build & Bundle OpenClaw CLI

| Điều kiện | Hành động |
|-----------|-----------|
| `SKIP_OPENCLAW_BUILD=0` (mặc định) | Chạy `pnpm build` trong `core/openclaw`. |
| `SKIP_OPENCLAW_BUILD=1` | Bỏ qua build, chỉ đóng gói từ thư mục `dist` hiện có. |

- **Đóng gói:** Chạy `npm pack` để tạo file `openclaw-*.tgz`.
- **Đích:** Copy vào `VClaw.app/Contents/Resources/openclaw-bundled.tgz`.

### Bước 6 — Dựng `VClaw.app` (Ghép các thành phần)

- MacOS executable: `vclaw-ui/macos/vclaw` → `Contents/MacOS/vclaw`.
- `Info.plist`: Inject version hiện tại từ `package.json`.
- Next.js: Toàn bộ `standalone` → `Contents/Resources/app/`.
- Launcher: `main.js`, `electron-main.cjs`, `electron-preload.cjs` và `node_modules`.
- Config mặc định: `openclaw.default.json`.
- Scripts gỡ cài đặt: `uninstall-vclaw.sh`.
- Biểu tượng: Tự động sinh `AppIcon.icns` từ logo PNG.

### Bước 7 — `pkgbuild` & `productbuild`

- `pkgbuild`: Tạo component package, cấu hình `BundleIsRelocatable = false` để ép cài vào `/Applications`.
- `productbuild`: Ghép thành installer hoàn chỉnh với tài liệu `ReadMe.html`, `Conclusion.html`.

---

## Hành vi khi cài đặt trên máy người dùng

### `preinstall` (Chạy trước khi copy file)

- **Dừng dịch vụ:** Tắt các tiến trình VClaw, Ollama và OpenClaw Gateway đang chạy.
- **Hard Reset (Xóa sạch):** 
    - Xóa `/Applications/VClaw.app` cũ.
    - Xóa thư mục dữ liệu `~/.openclaw` và `~/.ollama` (Hard Reset để đảm bảo môi trường sạch).
    - Xóa các symlink cũ của `openclaw` và `ollama`.
- **Kiểm tra Node.js:** Yêu cầu Node.js ≥ 20. Nếu không có hoặc phiên bản cũ, script tự động tải và cài đặt Node.js v22.14.0 vào `/usr/local`.

### `postinstall` (Chạy sau khi copy file)

- **Cấu hình:** Khởi tạo `~/.openclaw`, copy config mặc định và database khởi tạo (`business.sqlite`).
- **Cài đặt OpenClaw:** Chạy `npm install` cho file `openclaw-bundled.tgz` nội bộ vào `~/.openclaw/runtime`.
- **Khởi động Gateway:** Chạy `openclaw gateway install --force` và `gateway start`.
- **Ollama:** Tự động cài đặt Ollama qua script chính thức (`curl ... | sh`).
- **Mở ứng dụng:** Tự động mở VClaw sau khi cài đặt xong.

---

## Biến môi trường và Tham số

| Biến / Tham số | Ý nghĩa |
|----------------|---------|
| `SKIP_BUILD=1` | Bỏ qua build Next.js. |
| `SKIP_OPENCLAW_BUILD=1` | Bỏ qua build OpenClaw CLI source. |
| `--arm64` | Ép build cho kiến trúc Apple Silicon. |
| `--x64` | Ép build cho kiến trúc Intel. |

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

Người dùng có thể sử dụng script gỡ cài đặt nằm trong bundle:
`/Applications/VClaw.app/Contents/Resources/uninstall-vclaw.sh`
Hoặc chạy lệnh gỡ cài đặt từ script gốc trong repo:
`bash scripts/uninstall-vclaw.sh`

