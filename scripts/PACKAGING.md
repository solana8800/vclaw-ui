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
2. Giải nén, dọn dẹp các tệp tạm và cài dependencies bằng npm (`--omit=dev`).
3. Sinh client Prisma và tạo các client aliases gói `@prisma`.
4. Đóng gói OpenClaw Zero Token thành `openclaw-bundled.tgz`.
5. Tạo tệp script PowerShell `install-openclaw-runtime.ps1` để tự động hóa cài đặt runtime trên máy khách.
6. Tạo các file cấu hình đóng gói `electron-builder.yml` và kịch bản cài đặt NSIS `installer.nsh`.
7. Gọi công cụ `electron-builder` để biên dịch thành tệp trình cài đặt `.exe` (NSIS).

#### Cơ chế cài đặt của trình cài đặt Windows (NSIS & PowerShell):
- Khi người dùng chạy file `.exe`, trình cài đặt NSIS sẽ sao chép các tệp tin ứng dụng vào thư mục đích (`Program Files` hoặc `AppData`).
- NSIS sẽ kích hoạt chạy ngầm script PowerShell `install-openclaw-runtime.ps1` để giải nén template cấu hình và chạy `npm install` gói runtime vào thư mục `%USERPROFILE%\.openclaw\runtime`.
- Tạo phím tắt Desktop và Start Menu (chỉ tạo khi tìm thấy file `vclaw-logo.ico` lúc build).

---

## 4. Phân Tích So Sánh Quy Trình Đóng Gói

### A. Bảng So Sánh Tổng Quan 3 Hệ Điều Hành

| Tiêu chí | macOS (`package-vclaw.sh`) | Ubuntu (`package-vclaw-ubuntu.sh`) | Windows (`package-vclaw-windows.mjs`) | Đánh giá chênh lệch (Gap) |
| :--- | :--- | :--- | :--- | :--- |
| **Công cụ đóng gói** | `pkgbuild` & `productbuild` | `dpkg-deb --build` | `electron-builder` & `NSIS` | Đều đạt tiêu chuẩn phân phối native trên từng nền tảng. |
| **Định dạng bộ cài** | `.pkg` (Gói hệ thống Apple) | `.deb` (Gói hệ thống Debian) | `.exe` (Trình cài đặt NSIS) | Chuẩn mực cho cả ba hệ điều hành. |
| **Dọn dẹp trước cài (Preinstall)** | **Có cực kỳ chi tiết**: Script `preinstall` tự động dừng app cũ, kill gateway port 3001, dọn các thư mục tạm. | **Có hoàn hảo**: Script `preinst` dừng toàn bộ tiến trình `vclaw`, `node` phụ trợ, kill port 3001, dọn dẹp các thư mục cài đặt cũ. | **Không có**: NSIS chỉ check quyền ghi thư mục cài nhưng không tắt app/gateway cũ đang chạy ngầm. | 🔴 **Windows Thiếu sót lớn**: Dẫn tới lỗi khóa file ("File in use") khi người dùng nâng cấp đè bản cài đặt mới. |
| **Trình gỡ cài đặt (Uninstaller)** | **Tích hợp chuyên sâu**: Tạo shortcut `Uninstall-VClaw.app` trong `/Applications`, có hộp thoại xác nhận và cho phép lựa chọn giữ lại hoặc xóa sạch cấu hình. | **Tích hợp chuyên sâu**: Có shortcut `Uninstall VClaw` trong menu ứng dụng Gnome. Sử dụng UI Zenity để hỏi lựa chọn giữ lại/xóa sạch dữ liệu an toàn. | **Sơ sài**: Chỉ có uninstaller mặc định của NSIS trong Control Panel để xóa thư mục cài đặt chính. | 🔴 **Windows Thiếu sót lớn**: Không tắt tiến trình khi gỡ; để lại toàn bộ thư mục dữ liệu cá nhân khổng lồ `%USERPROFILE%\.openclaw` mà không hỏi ý kiến người dùng. |
| **Branding cho Gỡ cài đặt** | **Có logo riêng**: Sử dụng `vclaw-uninstall-logo.icns` riêng (logo VClaw làm mờ đè icon cấm đỏ rất sang trọng). | **Có logo riêng**: Tích hợp `vclaw-uninstall.png` riêng (logo làm mờ đè icon cấm đỏ) vào hệ thống icons Gnome của Ubuntu. | **Không có**: Biểu tượng uninstaller sử dụng trùng với icon chính (`vclaw-logo.ico`) hoặc dùng icon mặc định của Windows. | 🔴 **Windows Thiếu sót**: Trải nghiệm UI/UX kém tinh tế và đồng bộ hơn so với macOS và Ubuntu. |
| **Cài đặt Node.js/npm ngầm** | **Có fallback tự động**: Tự tải Node.js v22.14.0 nếu máy khách thiếu để phục vụ chạy npm install cho runtime. | **Không có (Cảnh báo thông minh)**: Tự động kiểm tra và cảnh báo trực quan bằng tiếng Việt qua Zenity GUI hoặc Terminal yêu cầu nâng cấp Node v22+ nếu thiếu/cũ, cực kỳ minh bạch và phù hợp với thói quen của dev Ubuntu. | **Không có**: Nếu thiếu `npm`, script chỉ ghi log và bỏ qua, chờ launcher tự phục hồi lúc khởi chạy. | **Phù hợp với đặc thù từng OS**: Tự động tải ngầm trên macOS (phù hợp user phổ thông) và Cảnh báo thông minh trên Ubuntu (phù hợp nhà phát triển kỹ thuật) là thiết kế tối ưu nhất. Windows hiện tại đang thiếu cả hai cơ chế. |
| **Độ tin cậy tạo phím tắt (Shortcuts)** | Luôn hoạt động độc lập qua script cài đặt và file cấu hình `.plist`. | Luôn hoạt động độc lập qua việc tạo file `.desktop` trong `/usr/share/applications/`. | Chỉ tạo shortcut Desktop/Start Menu nếu tìm thấy file `.ico` lúc build. Nếu thiếu sẽ bỏ qua. | 🔴 **Windows Rủi ro cao**: Thiếu file `.ico` rời lúc build sẽ khiến cài đặt xong ứng dụng hoàn toàn không có shortcut để mở. |
| **Mượn quyền user thường (Sudo-to-user)** | **Có**: Nhận diện user thật để cài đặt runtime dưới quyền của user thường, tránh sinh file rác thuộc quyền root. | **Có**: Nhận diện `$SUDO_USER` hoặc chủ sở hữu `/dev/console` để thực thi cài đặt runtime dưới quyền của user thường. | **Mặc định**: Chạy trong môi trường user thường (hoặc UAC admin) nên ít gặp xung đột quyền sở hữu file. | Bảo vệ an toàn thư mục cá nhân người dùng, tránh lỗi phân quyền ghi file sau này. |

---

### B. Các Thiếu Sót Của Bản Windows & Giải Pháp Khắc Phục

#### 1. Không dọn dẹp tiến trình VClaw & Gateway cũ khi Cài đặt / Nâng cấp (Upgrade)
* **Chi tiết**: Trên Windows, khi cài đè phiên bản mới, nếu ứng dụng VClaw cũ hoặc dịch vụ Gateway ngầm (`node.exe` chạy cổng `3001` hoặc tương tự) đang chạy, Windows sẽ khóa chặt các file binary này. Trình cài đặt NSIS sẽ báo lỗi "Error writing file..." và buộc người dùng phải đóng thủ công qua Task Manager hoặc khởi động lại máy.
* **Giải pháp khắc phục**: Bổ sung các lệnh dừng tiến trình ngầm bằng cách cấu hình macro `customInit` trong file `installer.nsh` trước khi tiến hành giải nén file:
  ```nsis
  !macro customInit
    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name VClaw -ErrorAction SilentlyContinue; Stop-Process -Name node -ErrorAction SilentlyContinue"'
  !macroend
  ```

#### 2. Trình gỡ cài đặt (Uninstaller) sơ sài, không dọn dẹp sạch sẽ
* **Chi tiết**: Hiện tại, khi người dùng gỡ cài đặt VClaw trên Windows thông qua Control Panel, hệ thống chỉ xóa thư mục cài đặt chính. Dịch vụ Gateway vẫn tiếp tục chạy ngầm trong bộ nhớ do không bị dừng lại. Thư mục dữ liệu cấu hình cá nhân khổng lồ `%USERPROFILE%\.openclaw` vẫn bị bỏ lại vĩnh viễn trên máy khách.
* **Giải pháp khắc phục**: Cấu hình thêm macro `customUninstall` trong file `installer.nsh` để dừng mọi tiến trình liên quan và hiển thị hộp thoại xác nhận hỏi người dùng có muốn dọn sạch dữ liệu cá nhân hay không:
  ```nsis
  !macro customUninstall
    nsExec::Exec 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name VClaw -ErrorAction SilentlyContinue"'
    MessageBox MB_YESNO "Bạn có muốn xóa sạch cấu hình, lịch sử chat và dữ liệu VClaw tại thư mục .openclaw không?" IDNO keepData
      RMDir /r "$PROFILE\.openclaw"
    keepData:
  !macroend
  ```

#### 3. Rủi ro biến mất phím tắt (Shortcuts) khi thiếu file `.ico` lúc build
* **Chi tiết**: Đoạn mã kiểm tra `...(existsSync(logoIco) ? [ ... CreateShortCut ... ] : [])` trong `package-vclaw-windows.mjs` khiến cho nếu nhà phát triển build ứng dụng trên môi trường thiếu tệp `vclaw-logo.ico` rời, installer cài xong sẽ hoàn toàn không tạo phím tắt ra Desktop hay Start Menu.
* **Giải pháp khắc phục**: Luôn tạo phím tắt cho người dùng. Nếu thiếu file `.ico` rời, phím tắt sẽ tự động sử dụng icon mặc định được nhúng sẵn bên trong file `.exe` (hệ thống Windows tự động trích xuất icon từ file thực thi chính).

#### 4. Thiếu Branding & Logo chuyên biệt cho Uninstaller
* **Chi tiết**: Trình gỡ cài đặt trên Windows hiển thị icon y hệt app chính hoặc không có icon, không đem lại trải nghiệm chuyên nghiệp cao cấp giống như logo gỡ cài đặt làm mờ đè ký hiệu cấm đỏ tinh tế của macOS và Ubuntu.
* **Giải pháp khắc phục**:
  - Tạo tệp `vclaw-uninstall-logo.ico` chuyên dụng cho Windows (tương tự bản `.icns`/`.png` trên macOS và Ubuntu).
  - Cấu hình trường `uninstallerIcon` trong `electron-builder.yml` trỏ tới file icon uninstall này thay vì dùng chung icon với app chính:
  ```yaml
  nsis:
    installerIcon: "scripts/packaging/vclaw-logo.ico"
    uninstallerIcon: "scripts/packaging/vclaw-uninstall-logo.ico"
  ```
