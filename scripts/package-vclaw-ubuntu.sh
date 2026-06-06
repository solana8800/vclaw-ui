#!/usr/bin/env bash
# VClaw Desktop Packaging Script for Ubuntu (.deb)
#
# Lắp ráp Next.js standalone và Electron launcher tương tự macOS,
# sau đó biên dịch thành gói cài đặt Debian .deb bằng dpkg-deb.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT_DIR/vclaw-ui"
PACKAGING_DIR="$ROOT_DIR/scripts/packaging"
VCLAW_LOGO_PNG="$PACKAGING_DIR/vclaw-logo.png"
VCLAW_UNINSTALL_LOGO_PNG="$PACKAGING_DIR/vclaw-uninstall-logo.png"
STANDALONE="$UI_DIR/.next/standalone"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SKIP_BUILD="${SKIP_BUILD:-0}"

# Đọc phiên bản native desktop
VERSION="$(node -e "process.stdout.write(require('$UI_DIR/release-versions.json').nativeVersion)")"

# Xác định kiến trúc
ARCH="$(uname -m)"
DEB_ARCH="amd64"
ASSET_ARCH="x64"
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  DEB_ARCH="arm64"
  ASSET_ARCH="arm64"
fi

echo "🦞 VClaw Ubuntu Package Builder (.deb)"
echo "   Phiên bản : $VERSION"
echo "   Kiến trúc : $DEB_ARCH"
echo "   Tên asset : $ASSET_ARCH"
echo "   Nguồn     : $UI_DIR"
echo ""

# ── 1. Thư mục Staging ────────────────────────────────────────────────────────
BUILD_DIR="$UI_DIR/dist/.build-ubuntu"
STAGING="$BUILD_DIR/staging"
OPT_VCLAW="$STAGING/opt/vclaw"
RESOURCES="$OPT_VCLAW/resources"
DEBIAN_DIR="$STAGING/DEBIAN"

rm -rf "$BUILD_DIR" 2>/dev/null || true
mkdir -p "$DEBIAN_DIR"
mkdir -p "$OPT_VCLAW"
mkdir -p "$RESOURCES/app"
mkdir -p "$RESOURCES/launcher"
mkdir -p "$RESOURCES/branding"
mkdir -p "$STAGING/usr/share/applications"
mkdir -p "$STAGING/usr/share/icons/hicolor/512x512/apps"
mkdir -p "$UI_DIR/dist"

# ── 2. Cài đặt dependencies vclaw-ui và Next.js build ─────────────────────────
echo "▶ Cài đặt dependencies cho vclaw-ui..."
cd "$UI_DIR"
pnpm install --frozen-lockfile

if [[ "$SKIP_BUILD" == "0" ]]; then
  echo "▶ Biên dịch Next.js (standalone)..."
  rm -rf "$UI_DIR/.next" 2>/dev/null || true
  pnpm build
  echo "  ✓ Next.js standalone đã sẵn sàng"
else
  echo "  ↩ Bỏ qua Next.js build (SKIP_BUILD=1)"
  [[ -d "$STANDALONE" ]] || { echo "  ✗ Không thấy thư mục Next.js standalone"; exit 1; }
fi

# Sao chép tài nguyên tĩnh vào standalone
echo "▶ Đồng bộ tài nguyên tĩnh..."
rm -rf "$STANDALONE/.next/static" && cp -R "$UI_DIR/.next/static" "$STANDALONE/.next/static"
rm -rf "$STANDALONE/public"       && cp -R "$UI_DIR/public"       "$STANDALONE/public"

# ── 3. Cài đặt deps cho launcher ──────────────────────────────────────────────
echo "▶ Cài đặt dependencies cho launcher (electron)..."
cd "$UI_DIR/launcher"
npm install --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev
cd "$UI_DIR"

# ── 4. Lắp ráp cây thư mục /opt/vclaw ────────────────────────────────────────
echo "▶ Lắp ráp cấu trúc opt/vclaw..."

# Next.js standalone server
cp -R "$STANDALONE/."       "$RESOURCES/app/"
# Dọn dẹp rác
rm -rf "$RESOURCES/app/macos" 2>/dev/null || true
rm -f "$RESOURCES/app/prisma/business.sqlite" 2>/dev/null || true

# Electron launcher
cp    "$UI_DIR/launcher/main.js"              "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/branding.cjs"         "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/electron-main.cjs"    "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/electron-preload.cjs" "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/ui-updater.cjs"       "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/runtime-updater.cjs"  "$RESOURCES/launcher/"
cp    "$UI_DIR/launcher/window-state.cjs"     "$RESOURCES/launcher/"
cp    "$UI_DIR/release-versions.json"         "$RESOURCES/"
cp -R "$UI_DIR/launcher/node_modules"         "$RESOURCES/launcher/node_modules"

# File cấu hình mặc định & MCP script
cp "$ROOT_DIR/scripts/vclaw-agent-tools-mcp-stdio.mjs" "$RESOURCES/vclaw-agent-tools-mcp-stdio.mjs"
chmod +x "$RESOURCES/vclaw-agent-tools-mcp-stdio.mjs"
cp -R "$ROOT_DIR/scripts/packaging/openclaw-state-template" "$RESOURCES/openclaw-state-template"

# Đóng gói OpenClaw Zero Token tarball (.tgz)
OPENCLAW_DIR="$ROOT_DIR/core/openclaw-zero-token"
if [[ ! -d "$OPENCLAW_DIR/dist" ]] || { [[ ! -f "$OPENCLAW_DIR/dist/entry.js" ]] && [[ ! -f "$OPENCLAW_DIR/dist/entry.mjs" ]]; }; then
  echo "  ✗ Lỗi: Thiếu bản build OpenClaw Zero Token hợp lệ."
  echo "     Cần có dist/entry.js hoặc dist/entry.mjs để openclaw.mjs nạp runtime."
  echo "     Vui lòng chạy trước: cd \"$OPENCLAW_DIR\" && pnpm install && pnpm build"
  exit 1
fi

echo "▶ Biên dịch OpenClaw Control UI..."
( cd "$OPENCLAW_DIR" && pnpm ui:build )
if [[ ! -f "$OPENCLAW_DIR/dist/control-ui/index.html" ]]; then
  echo "  ✗ Lỗi: Thiếu OpenClaw Control UI sau khi build."
  echo "     Cần có dist/control-ui/index.html để gateway phục vụ Control UI."
  exit 1
fi

echo "▶ Đang npm pack OpenClaw Zero Token..."
# Đảm bảo copy các manifest plugin vào dist trước khi pack
for ext_src in "$OPENCLAW_DIR/extensions/"* "$OPENCLAW_DIR/src/zero-token/extensions/"*; do
  if [[ -d "$ext_src" && -f "$ext_src/openclaw.plugin.json" ]]; then
    ext_name=$(basename "$ext_src")
    if [[ "$ext_src" == *"/zero-token/"* ]]; then
      mkdir -p "$OPENCLAW_DIR/dist/zero-token/extensions/$ext_name"
      cp "$ext_src/openclaw.plugin.json" "$OPENCLAW_DIR/dist/zero-token/extensions/$ext_name/"
    else
      mkdir -p "$OPENCLAW_DIR/dist/extensions/$ext_name"
      cp "$ext_src/openclaw.plugin.json" "$OPENCLAW_DIR/dist/extensions/$ext_name/"
    fi
  fi
done

rm -f "$BUILD_DIR"/openclaw-*.tgz 2>/dev/null || true
( cd "$OPENCLAW_DIR" && npm pack --ignore-scripts --pack-destination "$BUILD_DIR" )
shopt -s nullglob
OPENCLAW_PACKED=( "$BUILD_DIR"/openclaw-*.tgz )
shopt -u nullglob
if [[ ${#OPENCLAW_PACKED[@]} -ne 1 ]]; then
  echo "  ✗ Lỗi: Cần đúng 1 file openclaw-*.tgz trong $BUILD_DIR, hiện có ${#OPENCLAW_PACKED[@]} file."
  exit 1
fi
cp "${OPENCLAW_PACKED[0]}" "$RESOURCES/openclaw-bundled.tgz"
echo "  ✓ Đóng gói OpenClaw -> resources/openclaw-bundled.tgz"

# Copy tập lệnh gỡ cài đặt tương tác chuyên dụng
cp "$ROOT_DIR/scripts/uninstall-vclaw-ubuntu.sh" "$OPT_VCLAW/uninstall-vclaw-ubuntu.sh"
chmod +x "$OPT_VCLAW/uninstall-vclaw-ubuntu.sh"

# Tạo script wrapper thực thi 'vclaw' chính
cat <<'EOF' > "$OPT_VCLAW/vclaw"
#!/usr/bin/env bash
# VClaw Desktop App Runner
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
LAUNCHER_MAIN="/opt/vclaw/resources/launcher/main.js"
ELECTRON_CLI="/opt/vclaw/resources/launcher/node_modules/electron/cli.js"

# Kiểm tra phiên bản Node.js của máy khách
NODE_VER=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VER" -lt 22 ]; then
    MSG="🦞 Cảnh báo: VClaw yêu cầu Node.js v22 trở lên để hoạt động ổn định.\n\n- Phiên bản hiện tại trên hệ thống của bạn: v$NODE_VER\n\nVui lòng tự cài đặt Node.js v22+ để tránh các hành vi bất thường của AI Gateway."
    if command -v zenity &>/dev/null; then
        zenity --warning --title="VClaw — Yêu cầu Node.js v22+" --text="$MSG" --width=400 2>/dev/null || true
    else
        echo -e "\n\033[38;2;255;176;32m⚠️  [VClaw] Cảnh báo: Phiên bản Node.js của bạn là v$NODE_VER. Yêu cầu Node.js v22 trở lên để AI hoạt động ổn định.\033[0m\n" >&2
    fi
fi

if [[ ! -f "$LAUNCHER_MAIN" ]]; then
    echo "Lỗi: Không tìm thấy launcher tại $LAUNCHER_MAIN" >&2
    exit 1
fi

# Chạy Electron launcher thông qua cli.js đi kèm
exec node "$ELECTRON_CLI" "$LAUNCHER_MAIN" "$@"
EOF
chmod +x "$OPT_VCLAW/vclaw"

# ── 5. Thiết lập Phím tắt (Shortcuts) và Icons ────────────────────────────────
echo "▶ Cấu hình phím tắt và icons hệ thống..."

# Copy icons
if [[ -f "$VCLAW_LOGO_PNG" ]]; then
  cp "$VCLAW_LOGO_PNG" "$STAGING/usr/share/icons/hicolor/512x512/apps/vclaw.png"
  cp "$VCLAW_LOGO_PNG" "$RESOURCES/branding/app-icon.png"
fi

if [[ -f "$VCLAW_UNINSTALL_LOGO_PNG" ]]; then
  cp "$VCLAW_UNINSTALL_LOGO_PNG" "$STAGING/usr/share/icons/hicolor/512x512/apps/vclaw-uninstall.png"
  cp "$VCLAW_UNINSTALL_LOGO_PNG" "$RESOURCES/branding/vclaw-uninstall-logo.png"
fi

# Copy Desktop entries
cp "$ROOT_DIR/scripts/pkg-scripts-ubuntu/vclaw.desktop" "$STAGING/usr/share/applications/vclaw.desktop"
cp "$ROOT_DIR/scripts/pkg-scripts-ubuntu/vclaw-uninstall.desktop" "$STAGING/usr/share/applications/vclaw-uninstall.desktop"
chmod 0644 "$STAGING/usr/share/applications/"*.desktop

# Symlink trong /usr/bin của staging
mkdir -p "$STAGING/usr/bin"
ln -sf "/opt/vclaw/vclaw" "$STAGING/usr/bin/vclaw"

# ── 6. Chuẩn bị thư mục kiểm soát DEBIAN ──────────────────────────────────────
echo "▶ Thiết lập DEBIAN scripts..."

# Copy và thay thế placeholders trong file control
sed -e "s/__VERSION__/$VERSION/g" -e "s/__ARCH__/$DEB_ARCH/g" \
  "$ROOT_DIR/scripts/pkg-scripts-ubuntu/control" > "$DEBIAN_DIR/control"

# Copy maintainer scripts
for script in preinst postinst prerm postrm; do
  cp "$ROOT_DIR/scripts/pkg-scripts-ubuntu/$script" "$DEBIAN_DIR/$script"
  chmod 0755 "$DEBIAN_DIR/$script"
done

# ── 7. Biên dịch gói .deb ─────────────────────────────────────────────────────
echo "▶ Biên dịch gói .deb bằng dpkg-deb..."
FINAL_DEB="$UI_DIR/dist/VClawInstaller-${VERSION}-${ASSET_ARCH}.deb"

if command -v dpkg-deb &>/dev/null; then
  # Đảm bảo phân quyền chính xác cho các file trong staging trước khi đóng gói
  chown -R root:root "$STAGING" 2>/dev/null || true
  DPKG_BUILD_ARGS=(--build)
  if dpkg-deb --help 2>/dev/null | grep -q -- "--root-owner-group"; then
    DPKG_BUILD_ARGS=(--root-owner-group "${DPKG_BUILD_ARGS[@]}")
  else
    echo "  ! dpkg-deb không hỗ trợ --root-owner-group; nếu không chạy bằng root, package có thể giữ owner hiện tại."
  fi
  dpkg-deb "${DPKG_BUILD_ARGS[@]}" "$STAGING" "$FINAL_DEB"
  echo ""
  echo "✅ Đã tạo thành công gói cài đặt Ubuntu (.deb) tại:"
  ls -lh "$FINAL_DEB"
else
  echo ""
  echo "⚠️ Cảnh báo: Lệnh dpkg-deb không khả dụng trên môi trường hiện tại (chỉ có sẵn trên Linux/macOS Homebrew)."
  echo "   Đã chuẩn bị xong cây staging hoàn chỉnh tại: $STAGING"
  echo "   Bạn có thể chuyển thư mục này sang máy Ubuntu và chạy lệnh sau để build gói .deb:"
  echo "   dpkg-deb --build $STAGING $FINAL_DEB"
fi

echo ""
exit 0
