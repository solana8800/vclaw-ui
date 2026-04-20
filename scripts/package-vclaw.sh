#!/usr/bin/env bash
set -euo pipefail

# VClaw Desktop Packaging Script
#
# Builds vclaw-ui as a Next.js STANDALONE server (preserves middleware, API routes,
# WebSocket, Server Actions, MCP proxy) then wraps it in a thin macOS .app shell
# that uses Playwright Chromium as the window renderer (no Electron).
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

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT_DIR/vclaw-ui"
ASSETS_DIR="$ROOT_DIR/assets"
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
STAGING="$BUILD_DIR/staging"           # mirrors / for pkgbuild
APP_BUNDLE="$STAGING/Applications/VClaw.app"
CONTENTS="$APP_BUNDLE/Contents"

rm -rf "$BUILD_DIR"
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
  echo "▶ Building Next.js (standalone)..."
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
echo "▶ Installing launcher dependencies (playwright-chromium)..."
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

# Launcher → Resources/launcher/
cp    "$UI_DIR/launcher/main.js"        "$CONTENTS/Resources/launcher/"
cp -R "$UI_DIR/launcher/node_modules"   "$CONTENTS/Resources/launcher/node_modules"

# Default openclaw config (no personal tokens, wizard pre-done)
cp "$UI_DIR/resources/openclaw.default.json" "$CONTENTS/Resources/openclaw.default.json"

# Uninstall script
cp "$ROOT_DIR/scripts/uninstall-vclaw.sh"      "$CONTENTS/Resources/uninstall-vclaw.sh"
chmod +x                                     "$CONTENTS/Resources/uninstall-vclaw.sh"

# App icon
if [[ -f "$ASSETS_DIR/vclaw-logo.png" ]] && command -v iconutil &>/dev/null; then
  ICONSET="$BUILD_DIR/AppIcon.iconset"
  mkdir -p "$ICONSET"
  CLEAN_PNG="$BUILD_DIR/vclaw-logo-clean.png"
  sips -s format png "$ASSETS_DIR/vclaw-logo.png" --out "$CLEAN_PNG" &>/dev/null || cp "$ASSETS_DIR/vclaw-logo.png" "$CLEAN_PNG"
  for size in 16 32 64 128 256 512 1024; do
    sips -z "$size" "$size" "$CLEAN_PNG" --out "$ICONSET/icon_${size}x${size}.png" &>/dev/null || true
  done
  iconutil -c icns "$ICONSET" -o "$CONTENTS/Resources/AppIcon.icns" 2>/dev/null || true
fi

echo "  ✓ VClaw.app assembled"
du -sh "$APP_BUNDLE" | awk '{print "  ✓ Bundle size: " $1}'

# ── 6. Copy .app to dist/ for drag-to-test ───────────────────────────────────
rm -rf "$UI_DIR/dist/VClaw.app"
cp -R "$APP_BUNDLE" "$UI_DIR/dist/VClaw.app"

# ── 7. Make installer scripts executable ─────────────────────────────────────
chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

# ── 8. Build component package ───────────────────────────────────────────────
echo "▶ Running pkgbuild..."
COMPONENT_PKG="$BUILD_DIR/VClaw-component.pkg"

pkgbuild \
  --root              "$STAGING" \
  --scripts           "$SCRIPTS_DIR" \
  --identifier        "com.solana8800.vclaw" \
  --version           "$VERSION" \
  --install-location  "/" \
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
echo "✅  VClaw Desktop ready:"
ls -lh "$UI_DIR/dist/"*.pkg 2>/dev/null || true
echo ""
echo "   Installer    : $FINAL_PKG"
echo "   Drag to test : $UI_DIR/dist/VClaw.app"
