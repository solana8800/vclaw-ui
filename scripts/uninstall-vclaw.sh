#!/usr/bin/env bash
# VClaw Uninstall Script
# Dọn dẹp sạch sẽ VClaw app, OpenClaw core và cấu hình.

set -uo pipefail

BOLD='\033[1m'; ERROR='\033[38;2;230;57;70m'; SUCCESS='\033[38;2;0;229;204m'; WARN='\033[38;2;255;176;32m'; MUTED='\033[38;2;90;100;128m'; NC='\033[0m'
ok()   { echo -e "${SUCCESS}✓${NC} $*"; }
warn() { echo -e "${WARN}!${NC}  $*"; }
err()  { echo -e "${ERROR}✗${NC}  $*" >&2; }
info() { echo -e "${MUTED}·${NC}  $*"; }

echo -e "\n${BOLD}  🦞 Trình gỡ bỏ VClaw (Uninstall)${NC}"
echo -e "${MUTED}  Ngắt kết nối trợ lý AI và dọn dẹp hệ thống${NC}\n"

# Kiểm tra tham số
FORCE_CLEAN="no"
for arg in "$@"; do
    if [[ "$arg" == "--clean" ]]; then FORCE_CLEAN="yes"; fi
done

# Kiểm tra quyền root (nếu cần xóa app trong /Applications)
if [[ $EUID -ne 0 ]]; then
   err "Vui lòng chạy script với sudo để gỡ bỏ ứng dụng hệ thống."
   echo "Sử dụng: sudo bash $0"
   exit 1
fi

CONSOLE_USER="$(stat -f%Su /dev/console 2>/dev/null || echo "${SUDO_USER:-}")"
USER_HOME="$(eval echo ~"$CONSOLE_USER")"

# ── 0. Dừng toàn bộ tiến trình VClaw đang chạy ────────────────────────────────
echo -e "${BOLD}[0/3] Dừng các tiến trình đang hoạt động${NC}"
info "Đang kết thúc ứng dụng và các dịch vụ nền..."

# Dừng app Electron
pkill -9 -i VClaw 2>/dev/null || true

# Dừng Gateway (theo port)
PORT="${OPENCLAW_GATEWAY_PORT:-3001}"
PID_PORT=$(lsof -t -i:"$PORT" 2>/dev/null || true)
if [[ -n "$PID_PORT" ]]; then
    # shellcheck disable=SC2086
    kill -9 $PID_PORT 2>/dev/null || true
fi

# Dừng theo PID file nếu còn (đường dẫn mới + tương thích bản cũ)
PID_FILES=(
    "$USER_HOME/.openclaw/.vclaw-zero-gateway.pid"
    "$USER_HOME/.openclaw/workspace/.vclaw-zero-gateway.pid"
)
for PID_FILE in "${PID_FILES[@]}"; do
    if [[ -f "$PID_FILE" ]]; then
        OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
        if [[ -n "$OLD_PID" ]]; then
            kill -9 "$OLD_PID" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
done

# Dừng các tiến trình Node phụ trợ (dùng pattern cụ thể để không tự kill script uninstall đang chạy)
pkill -9 -f "VClaw.app/Contents/Resources/launcher" 2>/dev/null || true
pkill -9 -f "VClaw.app/Contents/Resources/app/" 2>/dev/null || true
ok "Đã dừng toàn bộ tiến trình liên quan."

# ── 1. Gỡ bỏ OpenClaw Gateway & Runtime ──────────────────────────────────────
echo -e "${BOLD}[1/3] Gỡ bỏ OpenClaw Gateway & Runtime${NC}"
info "Đang dọn dẹp binary và runtime..."

# Xóa binary (Bao quát các đường dẫn symlink phổ biến)
rm -f "/usr/local/bin/openclaw"
rm -f "/opt/homebrew/bin/openclaw"
rm -f "$USER_HOME/.local/bin/openclaw"

# Xóa các thành phần runtime nhưng giữ lại workspace (nếu không chọn xóa hết ở bước 3)
rm -rf "$USER_HOME/.openclaw/runtime"
rm -rf "$USER_HOME/.openclaw/bundled-packages"
rm -rf "$USER_HOME/.openclaw/bundled-plugins"
rm -rf "$USER_HOME/.openclaw/logs"

ok "OpenClaw binary và runtime đã được gỡ bỏ."

# ── 2. Xóa VClaw.app ───────────────────────────────────────────────────────────
echo -e "\n${BOLD}[2/3] Xóa ứng dụng VClaw${NC}"
if [[ -d "/Applications/VClaw.app" ]]; then
    rm -rf "/Applications/VClaw.app"
    ok "/Applications/VClaw.app đã xóa"
fi

# Xóa wrapper gỡ cài đặt
if [[ -d "/Applications/Uninstall-VClaw.app" ]]; then
    rm -rf "/Applications/Uninstall-VClaw.app"
    ok "Ứng dụng gỡ cài đặt đã tự dọn dẹp"
fi

if [[ -d "/Applications/Uninstall VClaw.app" ]]; then
    rm -rf "/Applications/Uninstall VClaw.app"
fi

# Xóa bản cài lỗi do thư mục lồng (Double Applications)
if [[ -d "/Applications/Applications/VClaw.app" ]]; then
    rm -rf "/Applications/Applications/VClaw.app"
    rmdir "/Applications/Applications" 2>/dev/null || true
    ok "Đã xóa bản cài lỗi tại /Applications/Applications/"
fi

# Xóa các bản copy "đi lạc" ở Desktop hoặc Downloads (Nếu có)
[[ -d "$USER_HOME/Desktop/VClaw.app" ]] && { rm -rf "$USER_HOME/Desktop/VClaw.app"; ok "Đã dọn dẹp VClaw.app trên Desktop"; }
[[ -d "$USER_HOME/Downloads/VClaw.app" ]] && { rm -rf "$USER_HOME/Downloads/VClaw.app"; ok "Đã dọn dẹp VClaw.app trong Downloads"; }

# ── 3. Xóa cấu hình và dữ liệu ─────────────────────────────────────────────────
echo -e "\n${BOLD}[3/3] Xóa cấu hình và dữ liệu người dùng (~/.openclaw)${NC}"

DATA_REMOVED="no"
if [[ "$FORCE_CLEAN" == "yes" ]]; then
    rm -rf "$USER_HOME/.openclaw"
    rm -f "$USER_HOME/Library/Logs/vclaw-setup.log"
    rm -f "/tmp/vclaw-preinstall.log"
    rm -f "/tmp/vclaw-postinstall.log"
    rm -f "/tmp/vclaw-zero-gateway.log"
    DATA_REMOVED="yes"
    ok "Toàn bộ dữ liệu đã được dọn dẹp sạch sẽ."
else
    # Nếu chạy từ Terminal và không có flag --clean, mới hỏi
    if [[ -t 0 ]]; then
        warn "Nếu bạn giữ lại thư mục này, các cài đặt và lịch sử chat sẽ được tự động phục hồi khi bạn cài đặt lại VClaw."
        read -p "  Bạn có muốn xóa SẠCH lịch sử chat và cấu hình không? (y/N) " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            rm -rf "$USER_HOME/.openclaw"
            rm -f "$USER_HOME/Library/Logs/vclaw-setup.log"
            rm -f "/tmp/vclaw-preinstall.log"
            rm -f "/tmp/vclaw-postinstall.log"
            rm -f "/tmp/vclaw-zero-gateway.log"
            DATA_REMOVED="yes"
            ok "Toàn bộ dữ liệu đã được dọn dẹp sạch sẽ."
        else
            info "Đã giữ lại dữ liệu người dùng tại ~/.openclaw (Có thể phục hồi khi cài lại)."
        fi
    else
        info "Đã giữ lại dữ liệu người dùng tại ~/.openclaw (Mặc định)."
    fi
fi

# ── 4. Hoàn tất ───────────────────────────────────────────────────────────────
if [[ "$DATA_REMOVED" == "yes" ]]; then
    FINAL_MESSAGE="VClaw đã được gỡ bỏ hoàn toàn khỏi máy tính của bạn."
else
    FINAL_MESSAGE="VClaw đã được gỡ bỏ. Dữ liệu người dùng được giữ lại để phục hồi khi cài lại."
fi

echo -e "\n${SUCCESS}${BOLD}🦞 $FINAL_MESSAGE${NC}\n"

if [[ ! -t 0 ]]; then
    osascript -e "display dialog \"$FINAL_MESSAGE\" buttons {\"Đóng\"} default button \"Đóng\" with icon note"
fi
