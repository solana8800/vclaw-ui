#!/usr/bin/env bash
set -euo pipefail

# Bộ cài đặt VClaw
# - Kiểm tra và cài Node.js ≥ 20
# - Force install/update OpenClaw (luôn cài mới nhất)
# - Force install/update Ollama (luôn cài mới nhất)
# - Seed cấu hình mặc định (~/.openclaw/openclaw.json) nếu chưa có
# - Khởi động gateway và mở VClaw.app
#
# Usage:
#   curl -fsSL https://vclaw.ai/install.sh | bash
#
# Options:
#   SKIP_OLLAMA=1   Bỏ qua Ollama
#   NO_START=1      Không khởi động gateway
#   VCLAW_APP_PATH  Override đường dẫn VClaw.app

BOLD='\033[1m'; SUCCESS='\033[38;2;0;229;204m'; WARN='\033[38;2;255;176;32m'
ERROR='\033[38;2;230;57;70m'; MUTED='\033[38;2;90;100;128m'; NC='\033[0m'
ok()   { echo -e "${SUCCESS}✓${NC} $*"; }
warn() { echo -e "${WARN}!${NC}  $*"; }
err()  { echo -e "${ERROR}✗${NC}  $*" >&2; }
info() { echo -e "${MUTED}·${NC}  $*"; }
step() { echo -e "\n${BOLD}$*${NC}"; }

SKIP_OLLAMA="${SKIP_OLLAMA:-0}"
NO_START="${NO_START:-0}"
VCLAW_CONFIG_DIR="${VCLAW_CONFIG_DIR:-$HOME/.openclaw}"
VCLAW_APP_PATH="${VCLAW_APP_PATH:-/Applications/VClaw.app}"

detect_os() {
  case "$OSTYPE" in darwin*) echo "macos";; linux-gnu*) echo "linux";; *) echo "unknown";; esac
}
OS="$(detect_os)"
[[ "$OS" == "unknown" ]] && { err "Hệ điều hành không hỗ trợ."; exit 1; }

echo ""
echo -e "${BOLD}  🦞 Bộ cài đặt VClaw${NC}"
echo -e "${MUTED}  Trình điều khiển vận hành doanh nghiệp bằng AI${NC}"
echo ""

# ── Bước 0: Node.js ────────────────────────────────────────────────────────────
step "[0/3] Node.js"
NODE_OK=false
if command -v node &>/dev/null; then
  VER="$(node -e 'process.stdout.write(process.version)' 2>/dev/null || echo v0)"
  MAJ="$(echo "$VER" | sed 's/v//' | cut -d. -f1)"
  if [[ "$MAJ" -ge 20 ]]; then
    ok "Node.js $VER đã cài đặt"
    NODE_OK=true
  else
    warn "Node.js $VER — cần ≥ v20, sẽ nâng cấp"
  fi
fi

if [[ "$NODE_OK" == "false" ]]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64)  A="arm64" ;;
    x86_64) A="x64"   ;;
    *) err "Kiến trúc $ARCH không hỗ trợ tự động cài Node.js. Vui lòng cài tại https://nodejs.org"; exit 1 ;;
  esac

  if [[ "$OS" == "macos" ]]; then
    info "Downloading Node.js v22.14.0 ($A)..."
    curl -fsSL "https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-${A}.tar.gz" -o /tmp/vclaw-node.tar.gz
    sudo tar -xzf /tmp/vclaw-node.tar.gz -C /usr/local --strip-components=1
    rm -f /tmp/vclaw-node.tar.gz
    ok "Node.js v22.14.0 đã cài đặt"
  elif [[ "$OS" == "linux" ]]; then
    info "Cài Node.js qua NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null \
      || curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - 2>/dev/null \
      || { err "Không thể tự động cài Node.js."; exit 1; }
    sudo apt-get install -y nodejs 2>/dev/null || sudo dnf install -y nodejs 2>/dev/null || true
    ok "Node.js đã cài đặt"
  fi
  command -v node &>/dev/null || { err "Cài Node.js thất bại."; exit 1; }
fi

# ── Bước 1: OpenClaw — Local install (User-space) ──────────────────────────────
step "[1/3] OpenClaw (cài đặt cục bộ - không cần sudo)"
info "Đang cài đặt OpenClaw vào $VCLAW_CONFIG_DIR/runtime..."
mkdir -p "$VCLAW_CONFIG_DIR/runtime"
pushd "$VCLAW_CONFIG_DIR/runtime" > /dev/null
[[ ! -f package.json ]] && npm init -y > /dev/null
if npm install openclaw@latest --no-fund --no-audit > /dev/null 2>&1; then
  ok "OpenClaw đã được cài đặt cục bộ thành công."
else
  err "Cài đặt OpenClaw thất bại."; popd > /dev/null; exit 1
fi
popd > /dev/null

# Tạo symlink vào ~/.local/bin để user dễ dùng CLI
mkdir -p "$HOME/.local/bin"
ln -sf "$VCLAW_CONFIG_DIR/runtime/node_modules/.bin/openclaw" "$HOME/.local/bin/openclaw"
export PATH="$HOME/.local/bin:$PATH"
OPENCLAW_BIN="$HOME/.local/bin/openclaw"

# ── Bước 2: Cấu hình mặc định ──────────────────────────────────────────────────
step "[2/3] Cấu hình VClaw"
mkdir -p "$VCLAW_CONFIG_DIR"
CONFIG_FILE="$VCLAW_CONFIG_DIR/openclaw.json"

if [[ -f "$CONFIG_FILE" ]]; then
  info "Cấu hình hiện có ở $CONFIG_FILE — giữ nguyên"
else
  # Ưu tiên lấy từ App đã cài hoặc từ mã nguồn dự án
  APP_CFG="/Applications/VClaw.app/Contents/Resources/openclaw.default.json"
  REPO_CFG="$(dirname "$0")/../vclaw-ui/resources/openclaw.default.json"

  if [[ -f "$APP_CFG" ]]; then
    cp "$APP_CFG" "$CONFIG_FILE"
    ok "Đã sao chép cấu hình từ VClaw.app → $CONFIG_FILE"
  elif [[ -f "$REPO_CFG" ]]; then
    cp "$REPO_CFG" "$CONFIG_FILE"
    ok "Đã sao chép cấu hình từ mã nguồn → $CONFIG_FILE"
  else
    error "Không tìm thấy file cấu hình mẫu (openclaw.default.json)!"
    info "Vui lòng đảm bảo bạn đang chạy script từ thư mục dự án hoặc đã cài VClaw.app."
    exit 1
  fi
fi

# ── Bước 3: Cài đặt OpenClaw Core ─────────────────────────────────────────────
step "[3/3] Cài đặt OpenClaw Core"

if [[ -x "$OPENCLAW_BIN" ]]; then
  info "OpenClaw đã có sẵn tại $OPENCLAW_BIN — đang kiểm tra cập nhật..."
fi

mkdir -p "$VCLAW_RUNTIME_DIR"
info "Đang cài đặt OpenClaw vào $VCLAW_RUNTIME_DIR..."

# Chạy npm install trong thư mục runtime
(
  cd "$VCLAW_RUNTIME_DIR" || exit 1
  if [[ ! -f "package.json" ]]; then
    npm init -y >/dev/null
  fi
  npm install openclaw@latest --no-save >/dev/null 2>&1
)

if [[ $? -eq 0 ]]; then
  # Tạo symlink vào ~/.local/bin
  mkdir -p "$(dirname "$OPENCLAW_BIN")"
  ln -sf "$VCLAW_RUNTIME_DIR/node_modules/.bin/openclaw" "$OPENCLAW_BIN"
  ok "Đã cài đặt OpenClaw thành công!"
else
  error "Cài đặt OpenClaw thất bại. Vui lòng kiểm tra kết nối internet hoặc npm."
  exit 1
fi


# ── Bước 3: Ollama — force install/update ──────────────────────────────────────
step "[3/3] Ollama (cài đặt / cập nhật)"
if [[ "$SKIP_OLLAMA" == "1" ]]; then
  info "Bỏ qua Ollama (SKIP_OLLAMA=1)"
else
  info "Đang cài đặt/cập nhật Ollama..."
  if curl -fsSL https://ollama.com/install.sh | sh; then
    ok "Ollama đã cài đặt (phiên bản mới nhất)"
  else
    warn "Cài đặt Ollama thất bại. Cài sau tại: https://ollama.com"
  fi
fi

# ── Khởi động gateway ──────────────────────────────────────────────────────────
if [[ "$NO_START" != "1" ]] && [[ -x "$OPENCLAW_BIN" ]]; then
  echo ""
  info "Đang khởi động OpenClaw gateway..."
  if "$OPENCLAW_BIN" gateway install --force &>/dev/null && "$OPENCLAW_BIN" gateway start &>/dev/null; then
    ok "Gateway đang chạy tại http://localhost:18789"
  else
    warn "Không thể tự khởi động. Chạy: $OPENCLAW_BIN gateway start"
  fi
fi

echo ""
echo -e "${SUCCESS}${BOLD}🦞 VClaw đã sẵn sàng!${NC}"
echo ""
[[ "$OS" == "macos" ]] && [[ -d "$VCLAW_APP_PATH" ]] && echo -e "${MUTED}  Mở VClaw :${NC}  open -a VClaw"
echo -e "${MUTED}  Node.js  :${NC}  $(node --version)"
echo -e "${MUTED}  Gateway  :${NC}  http://localhost:18789"
echo -e "${MUTED}  Config   :${NC}  $CONFIG_FILE"
echo -e "${MUTED}  Logs     :${NC}  $OPENCLAW_BIN gateway logs"
echo ""
echo -e "${WARN}Lưu ý:${NC} Hãy đảm bảo ${BOLD}$HOME/.local/bin${NC} có trong PATH của bạn để dùng lệnh 'openclaw' trực tiếp."
echo ""
[[ "$OS" == "macos" ]] && [[ -d "$VCLAW_APP_PATH" ]] && open -a VClaw 2>/dev/null || true
