# Hướng Dẫn Đóng Gói VClaw Desktop (macOS, Ubuntu, Windows)

Tài liệu này Hướng dẫn chi tiết quy trình đóng gói ứng dụng VClaw Desktop từ mã nguồn thành các bộ cài đặt phân phối chính thức trên cả ba hệ điều hành: **macOS (`.pkg`)**, **Ubuntu/Debian (`.deb`)**, và **Windows (`.exe`)**.

---

## 1. Tóm Tắt Lệnh Đóng Gói & Đầu Ra (Quick Start)

Dưới đây là bảng tổng hợp các lệnh đơn giản chạy từ **thư mục gốc của dự án (repository root)** để đóng gói ứng dụng trên từng hệ điều hành tương ứng:

| Hệ điều hành | Lệnh Đóng Gói | Gói Cài Đặt Đầu Ra | Thư Mục Staging (Tạm thời) | Nhật Ký Đóng Gói (Logs) |
| :--- | :--- | :--- | :--- | :--- |
| **🍏 macOS** | `bash scripts/package-vclaw.sh` | `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg` | `vclaw-ui/dist/.build/staging/VClaw.app` | `/tmp/vclaw-preinstall.log`<br>`/tmp/vclaw-postinstall.log` |
| **🐧 Ubuntu** | `bash scripts/package-vclaw-ubuntu.sh` | `vclaw-ui/dist/VClawInstaller-<version>-<arch>.deb` | `vclaw-ui/dist/.build-ubuntu/staging/` | `/tmp/vclaw-preinst.log`<br>`/tmp/vclaw-postinst.log` |
| **🪟 Windows** | `node scripts/package-vclaw-windows.mjs` | `vclaw-ui/dist/VClawInstaller-<version>-x64.exe` | `vclaw-ui/dist/.build-windows/electron-app/` | `%TEMP%\vclaw-openclaw-install.log` |

> [!TIP]
> **Tăng tốc đóng gói (SKIP_BUILD)**: Bạn có thể thêm biến môi trường `SKIP_BUILD=1` ở phía trước lệnh chạy (ví dụ: `SKIP_BUILD=1 bash scripts/package-vclaw.sh`) để bỏ qua bước build lại Next.js, giúp đẩy nhanh quá trình đóng gói nếu đã có sẵn thư mục build `.next/standalone/`.

### Biến môi trường & Cờ khi build:
- **Cờ kiến trúc (macOS)**: `--arm64` / `--x64` (mặc định tự phát hiện theo `uname -m`).
- **Yêu cầu trước khi chạy**: Phải chạy lệnh build cho OpenClaw Zero Token trước (`cd core/openclaw-zero-token && pnpm install && pnpm build`) vì các script đóng gói chỉ thực hiện đóng gói (`npm pack`) tarball thành phẩm, không tự động build lại OpenClaw.

---

## 2. Kiến Trúc Đóng Gói Chung (Core Architecture)

Cả ba hệ điều hành đều chia sẻ chung một mô hình kiến trúc VClaw Desktop:
1. **Next.js Standalone (UI)**: Giao diện web Next.js được build dưới dạng `standalone` để bảo toàn middleware, các API routes, Server Actions và MCP proxy.
2. **Electron Shell (Launcher)**: Một lớp vỏ Electron mỏng (`vclaw-ui/launcher`) chịu trách nhiệm mở cửa sổ máy tính, quản lý cổng gỡ lỗi Chrome CDP (`9222`) và điều khiển vòng đời dịch vụ.
3. **OpenClaw Zero Token Runtime**: Toàn bộ engine OpenClaw nằm tại `core/openclaw-zero-token` được đóng gói thành `openclaw-bundled.tgz`. Khi người dùng cài đặt ứng dụng, gói cài đặt sẽ tự động giải nén và chạy `npm install` cục bộ tarball này vào thư mục cá nhân `~/.openclaw/runtime` để hoạt động.

---

## 3. Quy Trình Đóng Gói Chi Tiết Từng Hệ Điều Hành

### HĐH 🍏 macOS (`package-vclaw.sh`)

#### Các bước đóng gói chính:
1. Cài đặt dependencies cho launcher (`vclaw-ui/launcher`).
2. Biên dịch Next.js thành standalone, sao chép thư mục `.next/static` và `public` vào standalone.
3. Tạo cấu trúc App Bundle tiêu chuẩn tại `VClaw.app/Contents/Resources`.
4. Sao chép launcher, Next.js standalone, wrapper khởi chạy `vclaw.sh` và script gỡ cài đặt `uninstall-vclaw.sh` vào App Bundle.
5. Đóng gói OpenClaw Zero Token thành `openclaw-bundled.tgz` đưa vào `Resources/`.
6. Biên dịch tệp `vclaw-uninstall-logo.icns` chuyên dụng (logo làm mờ đè ký hiệu cấm đỏ) làm icon uninstaller.
7. Gọi lệnh `pkgbuild` (set `BundleIsRelocatable=false` qua Plist để cố định `/Applications`) và `productbuild` để tạo file `.pkg` cài đặt.

#### Cơ chế của tập lệnh tiền cài đặt (`preinstall`):
- Tắt ứng dụng VClaw, node launcher, kill tiến trình Gateway đang chiếm dụng cổng `3001`.
- Xóa bản cài đặt cũ tại `/Applications/VClaw.app` và symlink cũ.
- Chỉ dọn dẹp các thành phần runtime tạm thời trong `~/.openclaw`, giữ nguyên dữ liệu cấu hình, lịch sử chat và database của khách hàng.

#### Cơ chế của tập lệnh hậu cài đặt (`postinstall`):
- Tạo thư mục cấu hình cá nhân `~/.openclaw/` và đồng bộ template (chỉ copy file thiếu).
- Sử dụng quyền của user thường (mượn quyền qua `$SUDO_USER`) để thực thi `npm install` gói `openclaw-bundled.tgz` vào `~/.openclaw/runtime`, tránh sinh file rác thuộc sở hữu của root.
- Tự động vá các tệp plugin manifest bị thiếu sang thư mục `dist/extensions`.
- Tạo ứng dụng gỡ cài đặt chuyên nghiệp **Uninstall-VClaw.app** trong thư mục `/Applications`.

---

### HĐH 🐧 Ubuntu / Debian (`package-vclaw-ubuntu.sh`)

#### Các bước đóng gói chính:
1. Chuẩn bị cây thư mục staging Debian tại `dist/.build-ubuntu/staging/`.
2. Sao chép Next.js standalone server và Electron launcher tương tự macOS.
3. Đóng gói OpenClaw Zero Token thành `openclaw-bundled.tgz`.
4. Tạo script wrapper thực thi `/opt/vclaw/vclaw` trỏ trực tiếp tới tệp Electron CLI cục bộ đi kèm.
5. Copy tệp cấu hình phím tắt Gnome `/usr/share/applications/vclaw.desktop` và `vclaw-uninstall.desktop`.
6. Tích hợp icon PNG chất lượng cao của app chính và app gỡ cài đặt vào `/usr/share/icons/hicolor/512x512/apps/`.
7. Thay thế phiên bản, kiến trúc trong tệp `DEBIAN/control` và biên dịch bằng lệnh `dpkg-deb --build`.

#### Cơ chế của tập lệnh tiền cài đặt (`preinst`):
- Tắt toàn bộ tiến trình Electron `vclaw` và dịch vụ Gateway cũ đang chạy ngầm để giải phóng file đang mở trước khi dpkg ghi đè.

#### Cơ chế của tập lệnh hậu cài đặt (`postinst`):
- Xác định chính xác user cá nhân thật (`$SUDO_USER` hoặc chủ sở hữu `/dev/console`).
- Đồng bộ template cấu hình, giải nén và chạy `npm install` gói runtime bằng quyền của user thường.
- **Cảnh báo thông minh Node.js v22+**: Tự động kiểm tra phiên bản Node.js của máy khách. Nếu thiếu hoặc cũ (< v22), script sẽ in ra cảnh báo chi tiết nổi bật bằng tiếng Việt ngay trong giao diện terminal cài đặt để hướng dẫn nhà phát triển kỹ thuật nâng cấp kịp thời.
- Tạo symlink hệ thống `/usr/local/bin/openclaw`.

---

### HĐH 🪟 Windows (`package-vclaw-windows.mjs`)

#### Các bước đóng gói chính:
1. Chuẩn bị thư mục staging tại `dist/.build-windows/electron-app/`.
2. Copy Next.js standalone vào `electron-app/app/`, loại bỏ thư mục macOS, `dist/` lồng nhau và SQLite dev.
3. Load `vclaw-ui/.env`, validate `OPENCLAW_GATEWAY_TOKEN` và `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN`, rồi build Next.js theo đúng biến trong `.env` (ví dụ `NEXT_PUBLIC_IS_DESKTOP=true` để dùng layout desktop).
4. Cài lại production dependencies trong staging bằng `npm install --omit=dev --package-lock=false --no-audit --no-fund`.
5. Sinh Prisma client và tạo các alias `@prisma/client-*` mà Next standalone có thể tham chiếu.
6. Copy launcher Electron, branding icon PNG/ICO, template `openclaw-state-template/`, `openclaw.default.json`, MCP stdio script.
7. Đóng gói OpenClaw Zero Token thành `openclaw-bundled.tgz`.
8. Sinh `install-openclaw-runtime.ps1`, `installer.nsh`, `after-pack.cjs` và `electron-builder.yml`.
9. Gọi `electron-builder --win nsis --x64` để tạo installer `.exe` và `win-unpacked/`.

#### Cơ chế cài đặt của trình cài đặt Windows (NSIS & PowerShell):
- Installer chạy theo `perMachine: false`, mặc định cài vào thư mục user (`%LOCALAPPDATA%\Programs\VClaw`) và cho phép đổi thư mục cài đặt.
- Macro `customInit` dừng `VClaw.exe` và các `node.exe` liên quan tới `VClaw`/`.openclaw\runtime` trước khi ghi file, giảm lỗi file bị khóa khi upgrade.
- Nếu registry cũ trỏ tới thư mục không ghi được, ví dụ path cũ thuộc user khác, installer tự fallback về `%LOCALAPPDATA%\Programs\VClaw`.
- Installer được build thành một file `.exe` NSIS tự chứa payload, phù hợp cách phát hành/cài đặt thông thường trên Windows. Khi cài/nâng cấp, macro preinstall dừng tiến trình cũ trước để giảm lỗi file bị khóa trong lúc extract.
- Script đóng gói dọn các payload NSIS tạm như `.nsis.7z/.nsis.zip` trước khi build. Artifact phát hành đúng là `VClawInstaller-<version>-x64.exe` cỡ vài trăm MB; nếu thấy `.exe` chỉ vài trăm KB kèm `.nsis.7z` thì đó là build bị dừng giữa chừng, không dùng để phát hành.
- `customInstall` chạy nền `install-openclaw-runtime.ps1`, không chặn màn hình installer. Script này copy template thiếu, copy `openclaw-bundled.tgz`, chạy `npm install` vào `%USERPROFILE%\.openclaw\runtime`, repair plugin manifest và ghi log vào `%TEMP%\vclaw-openclaw-install.log`.
- Launcher load lại `.env` đã copy vào `resources/app/app/.env` trước khi start Next.js/OpenClaw, để token gateway và URL hoạt động giống lúc build.
- Launcher vẫn giữ fallback tự cài lại OpenClaw từ tarball nếu postinstall thiếu `npm`, lỗi mạng, hoặc runtime chưa sẵn sàng lúc mở app.
- `afterPack` dùng `rcedit.exe` từ `electron-winstaller` để gắn icon vào `VClaw.exe` mà không bật `signAndEditExecutable`; cách này tránh lỗi `winCodeSign` cần quyền tạo symlink trên Windows.
- NSIS tạo Desktop shortcut và Start Menu shortcut. Khi có `scripts/packaging/vclaw-logo.ico`, shortcut/installer/uninstaller dùng icon VClaw.
- Uninstaller mặc định của NSIS có trong Control Panel và trong thư mục cài đặt. Macro `customUnInstall` dừng tiến trình VClaw, sau đó hỏi người dùng có muốn xóa `%USERPROFILE%\.openclaw` hay giữ lại dữ liệu.

---

## 4. Phân Tích So Sánh Quy Trình Đóng Gói

### A. Bảng So Sánh Tổng Quan macOS và Windows

| Tiêu chí | macOS `.pkg` | Windows `.exe` hiện tại | Trạng thái |
| :--- | :--- | :--- | :--- |
| Công cụ native | `pkgbuild` + `productbuild` | `electron-builder` + NSIS | Đạt yêu cầu native từng OS |
| Staging app | `dist/.build/staging/VClaw.app` | `dist/.build-windows/electron-app` | Tương đương về nội dung: Next standalone + Electron + OpenClaw tarball |
| OpenClaw runtime | `postinstall` chạy `npm install openclaw-bundled.tgz` vào `~/.openclaw/runtime` | `install-openclaw-runtime.ps1` chạy nền vào `%USERPROFILE%\.openclaw\runtime` | Đã học theo cơ chế macOS, có launcher fallback |
| Dọn tiến trình trước khi cài | `preinstall` dừng VClaw/Gateway cũ | `customInit` dừng `VClaw.exe` và `node.exe` liên quan | Đã xử lý |
| Path cài đặt cố định/an toàn | `/Applications`, `BundleIsRelocatable=false` | Per-user, fallback về `%LOCALAPPDATA%\Programs\VClaw` nếu path cũ không ghi được | Đã xử lý lỗi registry/path cũ |
| Giải nén app | PackageKit ghi bundle trực tiếp | NSIS single-file installer extract payload vào thư mục cài | Windows vẫn chậm hơn do nhiều file nhỏ |
| Icon app | `.icns` trong bundle | `.ico` cho `.exe`, installer, shortcut; `rcedit` chạy `afterPack` | Đã xử lý |
| Uninstall | `Uninstall-VClaw.app`, có hỏi giữ/xóa dữ liệu | NSIS uninstaller, dừng tiến trình và hỏi xóa `%USERPROFILE%\.openclaw` | Đã xử lý phần chức năng; UX vẫn kém macOS nếu chưa có app uninstall riêng |
| Kích thước/copy dư | Không copy trùng `node_modules` | `extraResources` vẫn copy `app/node_modules` vào đúng vị trí `resources/app/app/node_modules` vì Next standalone cần nó khi chạy packaged | Còn gap; chưa bỏ được nếu không đổi cấu trúc bundle |
| Thiếu Node/npm | macOS có logic fallback/cài Node phục vụ postinstall | Windows ghi log và để launcher tự phục hồi nếu thiếu `npm` | Còn gap có chủ ý; cần quyết định có bundle Node/npm riêng không |

---

### B. Những Phần Windows Đã Xử Lý Sau Khi So Với macOS

1. **Cài OpenClaw native sau install**  
   Windows đã có `install-openclaw-runtime.ps1`, copy cùng `openclaw-bundled.tgz` và cài runtime vào `%USERPROFILE%\.openclaw\runtime`, giống vai trò `postinstall` của `.pkg` macOS.

2. **Không chặn installer vì OpenClaw**  
   macOS postinstall có thể chạy trong tiến trình installer; Windows chuyển postinstall OpenClaw sang background để tránh UI cài bị treo quá lâu. Nếu bước này lỗi, app vẫn mở được và launcher tự retry.

3. **Fix lỗi path cũ không ghi được**  
   Installer Windows tự kiểm tra quyền ghi `$INSTDIR`. Nếu registry cũ trỏ tới thư mục thuộc user khác, script đổi về `%LOCALAPPDATA%\Programs\VClaw`.

4. **Giảm lỗi cài đè do file bị khóa**  
   Windows dừng `VClaw.exe` và các tiến trình `node.exe` liên quan trước khi extract payload, đồng thời kiểm tra lại quyền ghi `$INSTDIR` để tránh path cũ không còn hợp lệ.

5. **Fix logo app Windows**  
   Icon `.ico` được copy vào app, dùng cho installer/uninstaller/shortcut, và được patch vào `VClaw.exe` bằng `rcedit` sau `afterPack`.

6. **Có uninstall đúng nghĩa**  
   NSIS tạo `Uninstall VClaw.exe`, registry uninstall trong Control Panel, shortcut bị xóa khi uninstall. Hook uninstall đã dừng tiến trình và hỏi người dùng có xóa dữ liệu `.openclaw` hay không.

7. **Giữ đúng runtime layout cho Next standalone**  
   Đã kiểm tra lại phần `extraResources`: Windows vẫn cần copy `app/node_modules` vào `resources/app/app/node_modules` để `server.js` chạy được sau khi đóng gói. Không bỏ mục này nếu chưa có phương án bundle khác, vì app sẽ không render giao diện.

8. **Fix lỗi Next/Turbopack external package `ws` trên Windows**  
   `ws` không còn nằm trong `serverExternalPackages`, vì Next/Turbopack có thể sinh import dạng `ws-<hash>` trong `.next/server` nhưng package hash này không tồn tại trong standalone sau khi cài. Smoke test cần quét `.next/server` và bản cài để không còn `ws-<hash>`, sau đó kiểm tra `http://127.0.0.1:12687/en/admin` và `http://127.0.0.1:3001/health`.

### C. Gap Còn Lại Nếu Muốn Windows Gần macOS Hơn

1. **Tốc độ cài đặt Windows vẫn thấp hơn macOS**  
   Nguyên nhân chính là số lượng file trong Next standalone + `node_modules` rất lớn. macOS ghi nguyên cây `.app` bằng PackageKit ổn định hơn; Windows NSIS xử lý nhiều file nhỏ chậm hơn. Hướng tối ưu tiếp theo là giảm số file trong `node_modules`, dùng `asar` có chọn lọc nhưng vẫn giữ `app/node_modules` đọc được cho Next, hoặc tách runtime/UI thành payload ít file hơn.

2. **Node/npm dependency của OpenClaw**  
   macOS có thể fallback cài Node phục vụ postinstall. Windows hiện chỉ log nếu thiếu `npm` và để launcher retry. Nếu nhắm tới máy khách phổ thông không có Node.js, cần cân nhắc bundle Node/npm riêng cho Windows hoặc cài Node portable vào app.

3. **Uninstaller UX chưa đẹp như macOS**  
   Windows hiện dùng NSIS uninstaller chuẩn. Chức năng đã đủ, nhưng chưa có app uninstall riêng với branding chuyên biệt như `Uninstall-VClaw.app` trên macOS.

---

## 5. Phát Hành Auto-update Cho UI, OpenClaw Runtime Và Native Installer

Launcher hỗ trợ tải nền payload Next.js standalone và OpenClaw runtime từ GitHub Releases
public mà không cần tải lại installer. Native installer chỉ phát hành khi Electron launcher
hoặc installer hook thay đổi.

### Source of truth version

Chỉ sửa `vclaw-ui/release-versions.json`:

```json
{
  "nativeVersion": "0.1.0",
  "uiVersion": "0.1.0",
  "openclawRuntime": {
    "version": "0.1.0"
  }
}
```

- `uiVersion`: giai đoạn pre-release bắt đầu từ `0.1.0`. Tăng patch thường xuyên,
  ví dụ `0.1.0` → `0.1.1` → `0.1.2`.
- `openclawRuntime.version`: tăng khi sửa OpenClaw hoặc script Playwright trong skill.
- `nativeVersion`: giai đoạn pre-release bắt đầu từ `0.1.0`. Chỉ chuyển sang `1.0.0`
  khi phát hành chính thức; sau đó chỉ tăng khi đổi launcher, Electron hoặc installer hook.

### Release helper chuẩn

Helper Node.js chạy giống nhau trên macOS và Windows. Nếu bỏ `--type` hoặc `--version`,
helper sẽ hỏi ngắn gọn trong console. Mặc định helper chỉ build; thêm `--upload` để upload.
Thêm `--create-release` để tự tạo GitHub Release khi tag chưa có; nếu release đã tồn tại,
helper sẽ bỏ qua bước tạo và vẫn upload asset bằng `--clobber`.

Để chạy ngắn hơn, dùng wrapper tương tác:

```bash
bash scripts/release-vclaw.sh
```

Nếu đang ở Git Bash/MINGW64 trên Windows, vẫn dùng wrapper Bash ở trên. Đừng chạy
`bash scripts/release-vclaw.ps1` vì `.ps1` là script PowerShell.

Trên Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-vclaw.ps1
```

Hai wrapper này chỉ là lớp mỏng phía trên `scripts/release-vclaw.mjs`, dùng cùng tham số
`type/version/platform/arch/installer/min-launcher-version/upload/create-release` nhưng có sẵn menu chọn nhanh và help.
Khi bỏ trống `--version`, wrapper sẽ tự gợi ý bản kế tiếp theo patch từ version hiện tại
của đúng loại release đã chọn theo quy ước:

- `ui`: tăng patch, ví dụ `0.1.0 -> 0.1.1`
- `runtime`: nếu còn ở `0.x.y` thì tăng minor và reset patch, ví dụ `0.1.0 -> 0.2.0`
- `native`: nếu còn ở `0.x.y` thì nhảy thẳng `1.0.0`

Riêng release `ui`, wrapper còn hỏi `minLauncherVersion` để ghi vào manifest.
Mặc định giá trị này lấy từ `release-versions.json.nativeVersion`, có thể nhấn `Enter`
để dùng luôn giá trị gợi ý.
Nếu bật `--create-release`, CLI sẽ mở prompt release note cho phép dán nhiều dòng và
nhấn một dòng trống để kết thúc. Bỏ trống phần này sẽ dùng note mặc định `Cập nhật VClaw vX.Y.Z`.

```bash
node scripts/release-vclaw.mjs
```

Release UI-only trên macOS Apple Silicon:

```bash
node scripts/release-vclaw.mjs \
  --type ui \
  --version 0.1.0 \
  --platform darwin \
  --arch arm64 \
  --upload \
  --create-release
```

Release UI-only trên Windows x64:

```powershell
node scripts/release-vclaw.mjs `
  --type ui `
  --version 0.1.0 `
  --platform win32 `
  --arch x64 `
  --upload
```

Release OpenClaw runtime sau khi build core:

```bash
cd core/openclaw-zero-token
pnpm build
cd ../..
node scripts/release-vclaw.mjs \
  --type runtime \
  --version 0.1.0 \
  --upload \
  --create-release
```

Release native installer macOS:

```bash
node scripts/release-vclaw.mjs \
  --type native \
  --version 0.1.0 \
  --platform darwin \
  --arch arm64 \
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg \
  --upload \
  --create-release
```

Release native installer Windows:

```powershell
node scripts/release-vclaw.mjs `
  --type native `
  --version 0.1.0 `
  --platform win32 `
  --arch x64 `
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-x64.exe `
  --upload
```

Release native installer Ubuntu/Debian x64:

```bash
node scripts/release-vclaw.mjs \
  --type native \
  --version 0.1.0 \
  --platform linux \
  --arch x64 \
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-x64.deb \
  --upload
```

Lưu ý: Ubuntu/Debian vẫn dùng `platform linux` trong manifest vì launcher đọc
`process.platform` của Node/Electron. Tên hiển thị `Ubuntu` chỉ dùng ở landing page.

Landing page không dùng `/releases/latest/download` cho native installer. Link tải installer
phải trỏ vào tag cố định của `release-versions.json.nativeVersion`, ví dụ
`/releases/download/v0.1.0/VClawInstaller-0.1.0-x64.deb`. Lý do: tag UI/runtime như
`v0.1.1` có thể trở thành GitHub latest nhưng không chứa installer native, dẫn tới link tải
landing bị 404.

Xem toàn bộ helper params:

```bash
node scripts/release-vclaw.mjs --help
```

### OpenClaw runtime manifest

Runtime release thêm field sau vào `vclaw-ui-update.json`:

```json
{
  "openclawRuntime": {
    "version": "0.1.0",
    "url": "https://github.com/solana8800/vclaw/releases/download/v0.1.0/openclaw-bundled-0.1.0.tgz",
    "sha256": "<hex>"
  }
}
```

Launcher tải tarball, xác minh SHA-256, cài staging, dừng gateway trong lúc swap runtime
và khởi động lại gateway. Nếu runtime mới không lên, launcher rollback về backup.

### Build payload macOS và Windows

Payload Next.js standalone phải build riêng trên từng hệ điều hành mục tiêu. Không lấy
payload build trên macOS để phát hành cho Windows hoặc ngược lại, vì standalone có thể
chứa dependency native theo nền tảng.

Trên máy macOS Apple Silicon:

```bash
cd vclaw-ui
pnpm build
cd ..
node scripts/package-vclaw-ui-update.mjs \
  --version 0.2.1 \
  --platform darwin \
  --arch arm64
```

Trên máy macOS Intel, đổi kiến trúc thành `x64`:

```bash
node scripts/package-vclaw-ui-update.mjs \
  --version 0.2.1 \
  --platform darwin \
  --arch x64
```

Trên máy Windows x64, mở PowerShell tại repo:

```powershell
cd vclaw-ui
pnpm build
cd ..
node scripts/package-vclaw-ui-update.mjs `
  --version 0.2.1 `
  --platform win32 `
  --arch x64
```

Nếu bản vá bắt buộc người dùng restart để áp dụng, thêm cờ `--required` vào lệnh build
payload trên mọi nền tảng:

```bash
node scripts/package-vclaw-ui-update.mjs \
  --version 0.2.1 \
  --platform darwin \
  --arch arm64 \
  --required
```

### Ghép manifest đa nền tảng

Mỗi lần chạy script, file `vclaw-ui-update.json` trong thư mục output sẽ giữ lại payload
đã tạo trước đó và cập nhật payload trùng `platform + arch`. Để tạo manifest chung cho
macOS và Windows:

1. Build payload macOS.
2. Chuyển file ZIP macOS và `vclaw-ui-update.json` sang máy Windows.
3. Đặt manifest vào cùng thư mục output `vclaw-ui/dist/ui-update/`.
4. Build payload Windows. Script sẽ bổ sung `win32-x64` vào manifest hiện có.
5. Upload toàn bộ ZIP và manifest cuối cùng lên cùng một GitHub Release.

Đầu ra cuối cùng:

```text
vclaw-ui/dist/ui-update/
  vclaw-ui-0.2.1-darwin-arm64.zip
  vclaw-ui-0.2.1-win32-x64.zip
  vclaw-ui-update.json
```

### Upload GitHub Release

Tạo release nếu tag chưa tồn tại:

```bash
gh release create v0.2.1 \
  --repo solana8800/vclaw \
  --title "VClaw UI v0.2.1" \
  --notes "Cập nhật giao diện VClaw v0.2.1"
```

Upload toàn bộ payload trước:

```bash
gh release upload v0.2.1 \
  vclaw-ui/dist/ui-update/vclaw-ui-0.2.1-darwin-arm64.zip \
  vclaw-ui/dist/ui-update/vclaw-ui-0.2.1-win32-x64.zip \
  --repo solana8800/vclaw \
  --clobber
```

Sau khi tất cả payload đã upload thành công, upload manifest ở lệnh cuối cùng:

```bash
gh release upload v0.2.1 \
  vclaw-ui/dist/ui-update/vclaw-ui-update.json \
  --repo solana8800/vclaw \
  --clobber
```

Launcher tải manifest từ asset `vclaw-ui-update.json` của GitHub Release mới nhất, sau
đó tự chọn đúng payload theo hệ điều hành và kiến trúc máy người dùng.

### Thông báo native installer mới

Khi release mới thay đổi Electron launcher hoặc installer hook, người
dùng cần tải native installer mới. Launcher không tự chạy `.pkg`, `.exe` hoặc `.deb`; launcher
hiển thị thông báo và mở URL tải đúng nền tảng.

Manifest dùng thêm các field:

```json
{
  "nativeVersion": "0.1.0",
  "nativeRequired": false,
  "nativeInstallers": [
    {
      "platform": "darwin",
      "arch": "arm64",
      "url": "https://github.com/solana8800/vclaw/releases/download/v0.1.0/VClawInstaller-0.1.0-arm64.pkg"
    },
    {
      "platform": "win32",
      "arch": "x64",
      "url": "https://github.com/solana8800/vclaw/releases/download/v0.1.0/VClawInstaller-0.1.0-x64.exe"
    },
    {
      "platform": "linux",
      "arch": "x64",
      "url": "https://github.com/solana8800/vclaw/releases/download/v0.1.0/VClawInstaller-0.1.0-x64.deb"
    }
  ]
}
```

Build và upload manifest native installer macOS bằng helper chuẩn:

```bash
node scripts/release-vclaw.mjs \
  --type native \
  --version 0.1.0 \
  --platform darwin \
  --arch arm64 \
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg \
  --upload
```

Trên máy Windows, chạy tiếp với cùng thư mục output để bổ sung installer Windows:

```powershell
node scripts/release-vclaw.mjs `
  --type native `
  --version 0.1.0 `
  --platform win32 `
  --arch x64 `
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-x64.exe `
  --upload
```

Trên Ubuntu/Debian, chạy tiếp với `platform linux` để bổ sung installer `.deb`:

```bash
node scripts/release-vclaw.mjs \
  --type native \
  --version 0.1.0 \
  --platform linux \
  --arch x64 \
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-x64.deb \
  --upload
```

Nếu native update bắt buộc, thêm `--native-required` khi tạo manifest. Khi app mở:

- `nativeRequired: false`: hiển thị `Tải installer mới` và `Để sau`.
- `nativeRequired: true`: chỉ hiển thị `Tải installer mới`; app sẽ nhắc lại ở lần mở sau
  cho tới khi người dùng cài native version mới.
- Native installer được ưu tiên thông báo trước UI payload update.

### Quy tắc payload MVP

- Chỉ dùng kênh `stable`.
- Manifest mặc định được launcher đọc từ
  `https://github.com/solana8800/vclaw/releases/latest/download/vclaw-ui-update.json`.
- Payload được xác minh SHA-256 và kiểm tra ZIP path trước khi giải nén.
- Script release loại bỏ `business.sqlite`, `.env`, `.DS_Store` và `public/uploads`
  trước khi tạo ZIP public.
- Payload có thể thêm Prisma table hoặc column nhưng không được xóa hay đổi tên schema.
- Khi payload active không khởi động được, launcher đánh dấu bản lỗi và fallback về
  Next.js bundle trong installer.
- SHA-256 chưa thay thế chữ ký số. Cần thêm chữ ký Ed25519 ở vòng hardening tiếp theo.
