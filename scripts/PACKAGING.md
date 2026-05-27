# Đóng gói VClaw Desktop

Script macOS chính: `scripts/package-vclaw.sh`.

Script Windows chính: `scripts/package-vclaw-windows.mjs`.

Runtime OpenClaw trong installer **luôn** lấy từ **`core/openclaw-zero-token`** (cùng tên gói npm `openclaw`, preset Zero Token + webauth), không dùng submodule `core/openclaw` gốc.

## Output

- Installer: `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg`
- App staging (trước khi đóng pkg): `vclaw-ui/dist/.build/staging/VClaw.app`

## Windows `.exe`

Lệnh build:

```bash
cd vclaw-ui
pnpm package:win
```

Hoặc từ repo root:

```bash
node scripts/package-vclaw-windows.mjs
```

Output chính:

- Installer: `vclaw-ui/dist/VClawInstaller-<version>-x64.exe`
- App unpacked để smoke test: `vclaw-ui/dist/win-unpacked/`

Script Windows dùng cùng kiến trúc Next.js standalone + Electron shell, nhưng không dùng `.app`, `.pkg`,
`pkgbuild`, `postinstall`, `osascript`, `/Applications`, `/tmp`, `lsof`, `/usr/local/bin`, hoặc
`/opt/homebrew/bin` làm điều kiện chạy. Thay vào đó script tạo staging Electron riêng trong
`vclaw-ui/dist/.build-windows/electron-app/`, copy `openclaw.default.json` từ `openclaw-state-template/openclaw.json`, `vclaw-agent-tools-mcp-stdio.mjs`,
`openclaw-state-template/`, đóng `openclaw-bundled.tgz`, và sinh `install-openclaw-runtime.ps1` để NSIS
cài OpenClaw runtime vào `%USERPROFILE%\.openclaw\runtime` trong bước install. Launcher vẫn giữ fallback tự
cài lại từ tarball này khi runtime còn thiếu hoặc bước postinstall Windows lỗi.

Logo Windows:

- `scripts/packaging/vclaw-logo.png` luôn được copy thành `branding/app-icon.png` để Electron dùng cho cửa sổ/About.
- Nếu có thêm `scripts/packaging/vclaw-logo.ico`, script copy thành `branding/app-icon.ico` và cấu hình
  `electron-builder` dùng icon này cho `.exe`/installer/taskbar. Windows release nên có file `.ico`
  chứa nhiều kích thước như 16, 32, 48, 64, 128, 256 px.

Nên chạy lệnh Windows release trên Windows hoặc Windows CI để native dependencies trong OpenClaw runtime
được cài đúng nền tảng. Build cross-platform từ macOS có thể tạo được installer nhưng không phải nguồn kiểm
chứng tốt cho native module Windows.

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
   - File cấu hình mặc định người dùng: `vclaw-ui/resources/openclaw.vclaw.default.json` → `Contents/Resources/openclaw.default.json`.
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
| `Contents/Resources/openclaw.default.json` | Preset Zero Token (từ `openclaw.vclaw.default.json`). |
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

## Phân Tích So Sánh Quy Trình Đóng Gói: macOS vs Windows

Dưới đây là bảng phân tích so sánh chi tiết quy trình đóng gói hiện tại của **VClaw Desktop** trên hai hệ điều hành: **macOS** (sử dụng `package-vclaw.sh`) và **Windows** (sử dụng `package-vclaw-windows.mjs`). Qua đó, chỉ ra các thiếu sót của phiên bản Windows và hướng khắc phục tương ứng.

### 1. Bảng So Sánh Tổng Quan Quy Trình Đóng Gói

| Tiêu chí | macOS (`package-vclaw.sh`) | Windows (`package-vclaw-windows.mjs`) | Đánh giá chênh lệch (Gap) |
| :--- | :--- | :--- | :--- |
| **Công cụ đóng gói chính** | `pkgbuild` & `productbuild` (Công cụ gốc Apple) | `electron-builder` & `NSIS` (Môi trường Node.js) | Cả hai đều phù hợp với tiêu chuẩn phân phối của từng hệ điều hành. |
| **Định dạng bộ cài** | `.pkg` (Bộ cài đặt trọn gói hệ thống) | `.exe` (Trình cài đặt NSIS) | Chuẩn mực cho cả hai nền tảng. |
| **Dọn dẹp trước khi cài (Preinstall)** | **Có cực kỳ chi tiết**: Script `preinstall` tự động tắt app cũ, kill gateway port, dọn dẹp các thư mục rác để tránh xung đột file đang mở. | **Không có**: NSIS chỉ kiểm tra quyền ghi thư mục cài đặt nhưng không tắt app/gateway cũ đang chạy ngầm. | 🔴 **Windows Thiếu sót lớn**: Có thể gây lỗi "File in use" khi người dùng nâng cấp đè bản cài đặt mới. |
| **Gỡ cài đặt (Uninstaller)** | **Có ứng dụng riêng biệt**: Tạo shortcut `Uninstall-VClaw.app` chuyên nghiệp trong `/Applications`, có hộp thoại xác nhận và cho phép lựa chọn giữ lại hoặc xóa sạch cấu hình. | **Chỉ có uninstaller mặc định của NSIS**: Chỉ xóa thư mục app chính trong Control Panel/Settings. | 🔴 **Windows Thiếu sót lớn**: Không tắt tiến trình ngầm trước khi gỡ; không dọn dẹp thư mục cấu hình `%USERPROFILE%\.openclaw`. |
| **Branding cho Gỡ cài đặt** | **Có biểu tượng chuyên biệt**: Sử dụng `vclaw-uninstall-logo.icns` riêng (logo VClaw làm mờ đè vòng tròn cấm đỏ rất sang trọng). | **Không có**: Biểu tượng uninstaller sử dụng trùng với icon chính (`vclaw-logo.ico`) hoặc dùng icon mặc định của Windows, dễ nhầm lẫn. | 🔴 **Windows Thiếu sót**: Trải nghiệm UI/UX chưa đồng bộ và kém tinh tế so với macOS. |
| **Cài đặt Node.js/npm ngầm** | **Có fallback tự động**: Tải Node.js v22.14.0 nếu máy khách chưa cài đặt để phục vụ chạy npm install cho runtime. | **Không có**: Nếu máy thiếu `npm`, script cài đặt PowerShell chỉ in ra log và bỏ qua, chờ ứng dụng tự thử lại lúc khởi chạy. | 🟡 **Windows Thiếu sót trung bình**: Phụ thuộc hoàn toàn vào môi trường chạy của máy khách mà không tự phục hồi cài đặt. |
| **Ràng buộc tạo phím tắt (Shortcuts)** | Tạo thông qua file `.plist` hệ thống và script cài đặt, độc lập và luôn hoạt động. | Chỉ tạo phím tắt Desktop/Start Menu khi tìm thấy file `vclaw-logo.ico` lúc build. Nếu thiếu `.ico` sẽ không tạo shortcut. | 🔴 **Windows Rủi ro cao**: Thiếu file `.ico` rời lúc build sẽ khiến cài đặt xong ứng dụng biến mất không dấu vết với người dùng. |
| **Xử lý native dependencies** | Sử dụng pnpm và npm pack cho macOS nguyên bản (Darwin arm64/x64). | Đóng gói native module cho Windows (x64) nhưng khuyến nghị phải chạy build từ Windows / Windows CI để biên dịch đúng. | Đã có cảnh báo và xử lý tốt ở cấu hình `electron-builder.yml`. |

---

### 2. Các Thiếu Sót Của Bản Windows & Giải Pháp Khắc Phục

#### A. Không dọn dẹp tiến trình VClaw & Gateway cũ khi Cài đặt / Nâng cấp (Upgrade)
* **Chi tiết**: Trên Windows, khi cài đè phiên bản mới, nếu ứng dụng VClaw cũ hoặc dịch vụ Gateway ngầm (`node.exe` chạy cổng `3001` hoặc tương tự) đang chạy, Windows sẽ khóa chặt các file binary này. Trình cài đặt NSIS sẽ báo lỗi "Error writing file..." và buộc người dùng phải đóng thủ công qua Task Manager hoặc khởi động lại máy.
* **Giải pháp khắc phục**: Bổ sung macro tắt tiến trình vào `installer.nsh` trước khi tiến hành giải nén file. Sử dụng lệnh PowerShell tắt tiến trình ngầm trong NSIS:
  ```nsis
  !macro customInit
    # Tắt tiến trình VClaw.exe và các cổng liên quan
    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name VClaw -ErrorAction SilentlyContinue; Stop-Process -Name node -ErrorAction SilentlyContinue"'
  !macroend
  ```

#### B. Trình gỡ cài đặt (Uninstaller) sơ sài, không dọn dẹp sạch sẽ
* **Chi tiết**: Hiện tại, khi người dùng gỡ cài đặt VClaw trên Windows thông qua Control Panel, hệ thống chỉ xóa thư mục cài đặt trong `Program Files` hoặc `AppData`. 
  - Tiến trình Gateway vẫn tiếp tục chạy ngầm trong bộ nhớ do không bị dừng lại.
  - Thư mục dữ liệu người dùng khổng lồ `%USERPROFILE%\.openclaw` (chứa các package runtime nặng, logs, database sqlite) vẫn bị để lại vĩnh viễn mà không hỏi ý kiến người dùng.
* **Giải pháp khắc phục**: Cấu hình thêm macro `customUninstall` trong file `installer.nsh` để:
  1. Dừng mọi tiến trình liên quan trước khi gỡ.
  2. Bật popup hỏi người dùng có muốn xóa sạch dữ liệu cấu hình hay không (giống logic của script `uninstall-vclaw.sh` trên macOS).
  ```nsis
  !macro customUninstall
    # 1. Dừng ứng dụng
    nsExec::Exec 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name VClaw -ErrorAction SilentlyContinue"'
    
    # 2. Hỏi xóa dữ liệu người dùng
    MessageBox MB_YESNO "Bạn có muốn xóa sạch cấu hình, lịch sử chat và dữ liệu VClaw tại thư mục .openclaw không?" IDNO keepData
      RMDir /r "$PROFILE\.openclaw"
    keepData:
  !macroend
  ```

#### C. Rủi ro biến mất phím tắt (Shortcuts) khi thiếu file `.ico` lúc build
* **Chi tiết**: Đoạn mã kiểm tra `...(existsSync(logoIco) ? [ ... CreateShortCut ... ] : [])` trong `package-vclaw-windows.mjs` (dòng 379) khiến cho nếu nhà phát triển build ứng dụng trên môi trường thiếu tệp `vclaw-logo.ico` rời, installer cài xong sẽ hoàn toàn không tạo phím tắt ra Desktop hay Start Menu. Người dùng sẽ không biết tìm ứng dụng ở đâu sau khi cài xong.
* **Giải pháp khắc phục**: Luôn tạo phím tắt cho người dùng. Nếu thiếu file `.ico` rời, phím tắt sẽ tự động sử dụng icon mặc định được nhúng sẵn bên trong file `.exe` (Windows tự động trích xuất icon từ file thực thi chính).

#### D. Thiếu Branding & Logo chuyên biệt cho Uninstaller
* **Chi tiết**: Trình gỡ cài đặt trên Windows hiển thị icon y hệt app chính hoặc không có icon, không đem lại trải nghiệm chuyên nghiệp cao cấp giống như icon gỡ cài đặt làm mờ đè ký hiệu cấm đỏ tinh tế của macOS.
* **Giải pháp khắc phục**:
  1. Tạo file `vclaw-uninstall-logo.ico` chuyên dụng cho Windows (tương tự bản `.icns` trên macOS).
  2. Cấu hình `uninstallerIcon` trong `electron-builder.yml` trỏ tới file icon uninstall này thay vì dùng chung icon với app chính.
  ```yaml
  nsis:
    installerIcon: "scripts/packaging/vclaw-logo.ico"
    uninstallerIcon: "scripts/packaging/vclaw-uninstall-logo.ico"
  ```

