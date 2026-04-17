#!/usr/bin/env bash
set -euo pipefail

# VClaw Desktop Packaging Script (Isolated Build)
# This script bundles VClaw UI into an isolated OpenClaw core build.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:$PATH"
BUILD_DIR="$ROOT_DIR/build/vclaw-desktop"
CORE_DIR="$ROOT_DIR/core/openclaw"
UI_DIR="$ROOT_DIR/vclaw-ui"

# Branding Configuration
APP_NAME="VClaw"
APP_ICON_SRC="$ROOT_DIR/assets/vclaw-logo.png"
BUNDLE_ID="com.solana8800.vclaw"

echo "🚀 Starting VClaw Desktop Packaging..."

# 1. Prepare Build Directory
echo "📂 Preparing isolated build directory: $BUILD_DIR"
mkdir -p "$ROOT_DIR/build"
rm -rf "$BUILD_DIR"
# Copy core to build dir, excluding node_modules to keep it fast if possible, 
# but we need it for build. Better to copy and then pnpm install.
rsync -av --exclude 'node_modules' --exclude 'dist' --exclude '.git' "$CORE_DIR/" "$BUILD_DIR/"

# 2. Build VClaw UI (Static Export)
echo "🖥️  Building VClaw UI (Next.js Static Export)..."
cd "$UI_DIR"
pnpm install
NEXT_PUBLIC_EXPORT="true" pnpm build
cd "$ROOT_DIR"

# 3. Inject UI into Build directory
echo "💉 Injecting VClaw UI into build core..."
mkdir -p "$BUILD_DIR/dist/control-ui"
cp -R "$UI_DIR/out/"* "$BUILD_DIR/dist/control-ui/"

# 4. Patch Branding in Build directory
echo "🎨 Patching Branding (Branding: VClaw)..."

# Path to files in build dir
INFO_PLIST="$BUILD_DIR/apps/macos/Sources/OpenClaw/Resources/Info.plist"
PKG_SCRIPT="$BUILD_DIR/scripts/package-mac-app.sh"
PACKAGE_SWIFT="$BUILD_DIR/apps/macos/Package.swift"

# Patch Info.plist
if [[ -f "$INFO_PLIST" ]]; then
    sed -i '' 's/ai.openclaw.mac/com.solana8800.vclaw/g' "$INFO_PLIST"
    sed -i '' 's/OpenClaw/VClaw/g' "$INFO_PLIST"
    sed -i '' 's/<string>openclaw<\/string>/<string>vclaw<\/string>/g' "$INFO_PLIST"
fi

# Patch Package.swift using Python for robust string replacement
if [[ -f "$PACKAGE_SWIFT" ]]; then
    python3 -c "
import sys
path = sys.argv[1]
with open(path, 'r') as f: content = f.read()
# Only rename the product, keep target as OpenClaw
content = content.replace('.executable(name: \"OpenClaw\", targets: [\"OpenClaw\"])', '.executable(name: \"VClaw\", targets: [\"OpenClaw\"])')
with open(path, 'w') as f: f.write(content)
" "$PACKAGE_SWIFT"
fi

# Patch package-mac-app.sh
if [[ -f "$PKG_SCRIPT" ]]; then
    sed -i '' "s/PRODUCT=\"OpenClaw\"/PRODUCT=\"$APP_NAME\"/g" "$PKG_SCRIPT"
    sed -i '' "s|APP_ICON_SRC=\"\${APP_ICON_SRC:-.*}\"|APP_ICON_SRC=\"$APP_ICON_SRC\"|g" "$PKG_SCRIPT"
    sed -i '' "s/BUNDLE_ID=\"\${BUNDLE_ID:-.*}\"/BUNDLE_ID=\"$BUNDLE_ID\"/g" "$PKG_SCRIPT"
    sed -i '' "s/dist\/OpenClaw.app/dist\/$APP_NAME.app/g" "$PKG_SCRIPT"
    # Ensure binary copy uses the new PRODUCT name
    sed -i '' "s|Contents/MacOS/OpenClaw|Contents/MacOS/$APP_NAME|g" "$PKG_SCRIPT"
fi

# 5. Build and Package inside Build directory
echo "🛠️  Building and Packaging VClaw Desktop in build dir..."
cd "$BUILD_DIR"
pnpm install --no-frozen-lockfile

# Run the core build first (this might clean the dist/ folder)
pnpm build

echo "💉 Injecting VClaw UI into build core (after core build)..."
mkdir -p "$BUILD_DIR/dist/control-ui"
cp -R "$UI_DIR/out/"* "$BUILD_DIR/dist/control-ui/"

# Run the packaging script with SKIP_UI_BUILD=1 and SKIP_TSC=1 to use our injected UI and built JS
export SKIP_UI_BUILD=1
export SKIP_PNPM_INSTALL=1
export SKIP_TSC=1 # Skip core JS rebuild to preserve our dist/ folder patches if any
export BUNDLE_ID="com.solana8800.vclaw"
export ALLOW_ADHOC_SIGNING=1

chmod +x scripts/package-mac-app.sh
chmod +x scripts/create-dmg.sh

./scripts/package-mac-app.sh
./scripts/create-dmg.sh ./dist/VClaw.app ./dist/VClawInstaller.dmg

echo "✅ Success! VClaw Desktop is ready at:"
echo "👉 $BUILD_DIR/dist/VClaw.app"
echo "👉 $BUILD_DIR/dist/VClaw.dmg" (assuming create-dmg named it so)
