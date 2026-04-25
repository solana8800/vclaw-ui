#!/usr/bin/env bash
set -euo pipefail

# VClaw Desktop Packaging Script
#
# Builds vclaw-ui as a Next.js STANDALONE server (preserves middleware, API routes,
# WebSocket, Server Actions, MCP proxy) then wraps it in a thin macOS .app shell
# that uses Electron as the desktop window (Next.js + middleware unchanged).
#
# Output:
#   vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg   ← macOS installer
#   vclaw-ui/dist/VClaw.app                             ← drag-to-test (no installer)
#
# Usage:
#   bash scripts/package-vclaw.sh             # current arch
#   bash scripts/package-vclaw.sh --arm64     # force arm64
#   bash scripts/package-vclaw.sh --x64       # force x64
#   SKIP_BUILD=1 bash scripts/package-vclaw.sh
#   SKIP_OPENCLAW_BUILD=1 bash scripts/package-vclaw.sh  # chỉ npm pack (cần core/openclaw/dist sẵn)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT_DIR/vclaw-ui"
PACKAGING_DIR="$ROOT_DIR/scripts/packaging"
VCLAW_LOGO_PNG="$PACKAGING_DIR/vclaw-logo.png"
MACOS_DIR="$UI_DIR/macos"
SCRIPTS_DIR="$ROOT_DIR/scripts/pkg-scripts"
STANDALONE="$UI_DIR/.next/standalone"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

SKIP_BUILD="${SKIP_BUILD:-0}"

# Version
VERSION="$(node -e "process.stdout.write(require('$UI_DIR/package.json').version)")"

# Architecture
ARCH="$(uname -m)"
for arg in "$@"; do
  case "$arg" in --arm64) ARCH="arm64" ;; --x64) ARCH="x86_64" ;; esac
done
ARCH_LABEL="${ARCH/x86_64/x64}"

echo "🦞 VClaw Desktop Build"
echo "   Version : $VERSION"
echo "   Arch    : $ARCH_LABEL"
echo "   Source  : $UI_DIR"
echo ""

# ── Staging dirs ──────────────────────────────────────────────────────────────
BUILD_DIR="$UI_DIR/dist/.build"
# Sửa cấu trúc staging: Bỏ bớt 1 cấp Applications dư thừa
STAGING="$BUILD_DIR/staging"
APP_BUNDLE="$STAGING/VClaw.app"
CONTENTS="$APP_BUNDLE/Contents"

rm -rf "$BUILD_DIR" 2>/dev/null || true
mkdir -p "$CONTENTS/MacOS"
mkdir -p "$CONTENTS/Resources/app"
mkdir -p "$CONTENTS/Resources/launcher"
mkdir -p "$UI_DIR/dist"

# ── 1. Install vclaw-ui deps ──────────────────────────────────────────────────
echo "▶ Installing vclaw-ui dependencies..."
cd "$UI_DIR"
pnpm install --frozen-lockfile

# ── 2. Next.js standalone build ───────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "0" ]]; then
  echo "▶ Cleaning and Building Next.js (standalone)..."
  # Dọn dẹp bằng user thường, không dùng sudo để tránh kẹt quyền
  rm -rf "$UI_DIR/.next" 2>/dev/null || true
  pnpm build
  echo "  ✓ .next/standalone/ ready"
else
  echo "  ↩ Skipping Next.js build (SKIP_BUILD=1)"
  [[ -d "$STANDALONE" ]] || { echo "  ✗ .next/standalone not found"; exit 1; }
fi

# ── 3. Stage static assets into standalone ────────────────────────────────────
# next build --output=standalone does NOT copy .next/static or public/ automatically
echo "▶ Staging static assets..."
rm -rf "$STANDALONE/.next/static" && cp -R "$UI_DIR/.next/static" "$STANDALONE/.next/static"
rm -rf "$STANDALONE/public"       && cp -R "$UI_DIR/public"       "$STANDALONE/public"
echo "  ✓ Static assets staged"

# ── 4. Install launcher deps ──────────────────────────────────────────────────
echo "▶ Installing launcher dependencies (electron)..."
cd "$UI_DIR/launcher"
npm install --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev
echo "  ✓ $(du -sh node_modules | cut -f1) launcher deps"
cd "$UI_DIR"

# ── 5. Assemble VClaw.app bundle ──────────────────────────────────────────────
echo "▶ Assembling VClaw.app..."

# MacOS executable
cp "$MACOS_DIR/vclaw"       "$CONTENTS/MacOS/vclaw"
chmod +x                    "$CONTENTS/MacOS/vclaw"

# Info.plist (inject current version)
sed "s/0\.1\.0/$VERSION/g"  "$MACOS_DIR/Info.plist" > "$CONTENTS/Info.plist"

# Next.js standalone server → Resources/app/
cp -R "$STANDALONE/."       "$CONTENTS/Resources/app/"

# Không đóng gói SQLite dev: schema lần đầu từ `prisma/migrations` khi user mở app (xem lib/db/prisma.ts).
# Trace production build desktop không gồm business.sqlite (next.config); bước này là lưới an toàn.
rm -f "$CONTENTS/Resources/app/prisma/business.sqlite" 2>/dev/null || true

# Launcher → Resources/launcher/
cp    "$UI_DIR/launcher/main.js"           "$CONTENTS/Resources/launcher/"
cp    "$UI_DIR/launcher/electron-main.cjs"   "$CONTENTS/Resources/launcher/"
cp    "$UI_DIR/launcher/electron-preload.cjs" "$CONTENTS/Resources/launcher/"
cp -R "$UI_DIR/launcher/node_modules"       "$CONTENTS/Resources/launcher/node_modules"

# Default openclaw config (no personal tokens, wizard pre-done)
cp "$UI_DIR/resources/openclaw.default.json" "$CONTENTS/Resources/openclaw.default.json"

# OpenClaw CLI từ source local (core/openclaw) — postinstall cài từ tarball này, không dùng openclaw@latest trên npm
OPENCLAW_DIR="$ROOT_DIR/core/openclaw"
SKIP_OPENCLAW_BUILD="${SKIP_OPENCLAW_BUILD:-0}"
if [[ "$SKIP_OPENCLAW_BUILD" == "0" ]]; then
  echo "▶ Building and packing OpenClaw from core/openclaw (for bundled installer)..."
  ( cd "$OPENCLAW_DIR" && pnpm install --frozen-lockfile && pnpm build ) || {
    echo "  ✗ OpenClaw build failed (core/openclaw). Fix errors or set SKIP_OPENCLAW_BUILD=1 after a successful build."
    exit 1
  }
else
  echo "  ↩ Skipping OpenClaw build (SKIP_OPENCLAW_BUILD=1); packing existing dist/ only"
  [[ -d "$OPENCLAW_DIR/dist" ]] || { echo "  ✗ core/openclaw/dist not found"; exit 1; }
fi
rm -f "$BUILD_DIR"/openclaw-*.tgz 2>/dev/null || true
( cd "$OPENCLAW_DIR" && npm pack --pack-destination "$BUILD_DIR" ) || {
  echo "  ✗ npm pack failed in $OPENCLAW_DIR"
  exit 1
}
shopt -s nullglob
OPENCLAW_PACKED=( "$BUILD_DIR"/openclaw-*.tgz )
shopt -u nullglob
if [[ ${#OPENCLAW_PACKED[@]} -ne 1 ]]; then
  echo "  ✗ expected exactly one openclaw-*.tgz in $BUILD_DIR, got ${#OPENCLAW_PACKED[@]}"
  exit 1
fi
cp "${OPENCLAW_PACKED[0]}" "$CONTENTS/Resources/openclaw-bundled.tgz"
echo "  ✓ OpenClaw packed → Contents/Resources/openclaw-bundled.tgz"

# Zalo personal plugin (local extension) → đóng gói .tgz để postinstall cài từ file archive
ZALOUSER_DIR="$ROOT_DIR/core/extensions/zalouser"
[[ -d "$ZALOUSER_DIR" ]] || {
  echo "  ✗ core/extensions/zalouser not found"
  exit 1
}
echo "▶ Packing zalouser extension from local source..."
rm -f "$BUILD_DIR"/openclaw-zalouser-*.tgz 2>/dev/null || true
( cd "$ZALOUSER_DIR" && npm pack --pack-destination "$BUILD_DIR" ) || {
  echo "  ✗ npm pack failed in $ZALOUSER_DIR"
  exit 1
}
shopt -s nullglob
ZALOUSER_PACKED=( "$BUILD_DIR"/openclaw-zalouser-*.tgz )
shopt -u nullglob
if [[ ${#ZALOUSER_PACKED[@]} -ne 1 ]]; then
  echo "  ✗ expected exactly one openclaw-zalouser-*.tgz in $BUILD_DIR, got ${#ZALOUSER_PACKED[@]}"
  exit 1
fi
cp "${ZALOUSER_PACKED[0]}" "$CONTENTS/Resources/zalouser-bundled.tgz"
echo "  ✓ zalouser packed → Contents/Resources/zalouser-bundled.tgz"

# Uninstall script
cp "$ROOT_DIR/scripts/uninstall-vclaw.sh"      "$CONTENTS/Resources/uninstall-vclaw.sh"
chmod +x                                     "$CONTENTS/Resources/uninstall-vclaw.sh"

# App icon
if [[ -f "$VCLAW_LOGO_PNG" ]] && command -v iconutil &>/dev/null; then
  ICONSET="$BUILD_DIR/AppIcon.iconset"
  mkdir -p "$ICONSET"
  CLEAN_PNG="$BUILD_DIR/vclaw-logo-clean.png"
  sips -s format png "$VCLAW_LOGO_PNG" --out "$CLEAN_PNG" &>/dev/null || cp "$VCLAW_LOGO_PNG" "$CLEAN_PNG"
  for size in 16 32 64 128 256 512 1024; do
    sips -z "$size" "$size" "$CLEAN_PNG" --out "$ICONSET/icon_${size}x${size}.png" &>/dev/null || true
  done
  iconutil -c icns "$ICONSET" -o "$CONTENTS/Resources/AppIcon.icns" 2>/dev/null || true
fi

# Icon PNG cho Electron (Dock / About / cửa sổ) — AppIcon.icns vẫn dùng cho .app bundle
mkdir -p "$CONTENTS/Resources/launcher/branding"
if [[ -f "$VCLAW_LOGO_PNG" ]]; then
  cp "$VCLAW_LOGO_PNG" "$CONTENTS/Resources/launcher/branding/app-icon.png"
  echo "  ✓ Electron shell branding icon"
fi

echo "  ✓ VClaw.app assembled"
du -sh "$APP_BUNDLE" | awk '{print "  ✓ Bundle size: " $1}'

# ── 7. Make installer scripts executable ─────────────────────────────────────
chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

# ── 8. Build component package (Force /Applications, NO RELOCATION) ─────────
echo "▶ Running pkgbuild..."
COMPONENT_PKG="$BUILD_DIR/VClaw-component.pkg"
COMPONENT_PLIST="$BUILD_DIR/Component.plist"

# Generate component plist to disable relocation
pkgbuild --analyze --root "$STAGING" "$COMPONENT_PLIST"
sed -i '' "s/<key>BundleIsRelocatable<\/key>.*<true\/>/<key>BundleIsRelocatable<\/key><false\/>/g" "$COMPONENT_PLIST"

pkgbuild \
  --root              "$STAGING" \
  --component-plist   "$COMPONENT_PLIST" \
  --scripts           "$SCRIPTS_DIR" \
  --identifier        "com.solana8800.vclaw" \
  --version           "$VERSION" \
  --install-location  "/Applications" \
  --ownership         recommended \
  "$COMPONENT_PKG"

echo "  ✓ Component pkg created"

# ── 9. Build distribution installer ─────────────────────────────────────────
echo "▶ Running productbuild..."
DIST_XML="$BUILD_DIR/Distribution.xml"
FINAL_PKG="$UI_DIR/dist/VClawInstaller-${VERSION}-${ARCH_LABEL}.pkg"

cat > "$DIST_XML" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>VClaw</title>
    <readme file="ReadMe.html" mime-type="text/html"/>
    <conclusion file="Conclusion.html" mime-type="text/html"/>
    <pkg-ref id="com.solana8800.vclaw"/>
    <options customize="never" require-scripts="false" hostArchitectures="${ARCH/x86_64/x64}"/>
    <choices-outline>
        <line choice="default"/>
    </choices-outline>
    <choice id="default" visible="false">
        <pkg-ref id="com.solana8800.vclaw"/>
    </choice>
    <pkg-ref id="com.solana8800.vclaw" version="$VERSION" onConclusion="none">VClaw-component.pkg</pkg-ref>
</installer-gui-script>
EOF

productbuild \
  --distribution "$DIST_XML" \
  --package-path "$BUILD_DIR" \
  --resources    "$SCRIPTS_DIR" \
  "$FINAL_PKG"

echo ""
echo "✅  VClaw Desktop ready (One-file Installer):"
ls -lh "$UI_DIR/dist/"*.pkg 2>/dev/null || true
echo ""
echo "   Installer : $FINAL_PKG"
echo "   (Mẹo: Bạn có thể gửi duy nhất file .pkg này cho người dùng của mình)"
echo ""
echo "   Shell Electron (branding VClaw):"
echo "   - userData (cookie/session): ~/Library/Application Support/VClaw/ShellElectron (macOS)"
echo "   - Ghi đè: VCLAW_ELECTRON_USER_DATA=/đường/dẫn"
echo "   - Tiêu đề cửa sổ: VCLAW_WINDOW_TITLE (mặc định VClaw)"
echo "   - Phiên bản About: VCLAW_APP_VERSION (mặc định đọc package.json app)"
echo "   - Icon Dock/About: branding/app-icon.png khi build; dev: VCLAW_ICON_PATH=/path/to.png"
echo "   - Binary Electron: VCLAW_ELECTRON_PATH (mặc định require('electron') trong launcher)"
echo ""
