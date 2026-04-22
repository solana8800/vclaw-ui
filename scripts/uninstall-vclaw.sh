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

# Kiểm tra quyền root (nếu cần xóa app trong /Applications)
if [[ $EUID -ne 0 ]]; then
   err "Vui lòng chạy script với sudo để gỡ bỏ ứng dụng hệ thống."
   echo "Sử dụng: sudo bash $0"
   exit 1
fi

CONSOLE_USER="$(stat -f%Su /dev/console 2>/dev/null || echo $SUDO_USER)"
USER_HOME="$(eval echo ~"$CONSOLE_USER")"

# ── 0. Dừng toàn bộ tiến trình VClaw đang chạy ────────────────────────────────
echo -e "${BOLD}[0/4] Dừng các tiến trình đang hoạt động${NC}"
info "Đang kết thúc ứng dụng và server..."
pkill -9 -i VClaw 2>/dev/null || true
# Tìm và giết các tiến trình Node đang chạy launcher hoặc server cổng 12687
PID_PORT=$(lsof -t -i:12687 2>/dev/null || true)
if [[ -n "$PID_PORT" ]]; then
    kill -9 $PID_PORT 2>/dev/null || true
fi
pkill -9 -f "VClaw.app/Contents/Resources" 2>/dev/null || true
ok "Đã dừng toàn bộ tiến trình liên quan."

# ── 1. Dừng và gỡ bỏ OpenClaw Gateway ─────────────────────────────────────────
echo -e "${BOLD}[1/4] Gỡ bỏ OpenClaw Gateway${NC}"
OPENCLAW_BIN="$USER_HOME/.openclaw/runtime/node_modules/.bin/openclaw"

if [[ -x "$OPENCLAW_BIN" ]]; then
    info "Đang dừng gateway cục bộ..."
    sudo -u "$CONSOLE_USER" "$OPENCLAW_BIN" gateway stop &>/dev/null || true
    info "Đang gỡ bỏ LaunchAgent cục bộ..."
    sudo -u "$CONSOLE_USER" "$OPENCLAW_BIN" gateway uninstall --force &>/dev/null || true
    
    rm -rf "$USER_HOME/.openclaw/runtime"
    rm -f "$USER_HOME/.local/bin/openclaw"
    ok "OpenClaw cục bộ và service đã gỡ bỏ"
elif sudo -u "$CONSOLE_USER" command -v openclaw &>/dev/null; then
    info "Đang dừng gateway (global)..."
    sudo -u "$CONSOLE_USER" openclaw gateway stop &>/dev/null || true
    info "Đang gỡ bỏ LaunchAgent (global)..."
    sudo -u "$CONSOLE_USER" openclaw gateway uninstall --force &>/dev/null || true
    
    # Xóa binary (Bao quát cả /usr/local/bin và Homebrew /opt/homebrew/bin)
    FINAL_BIN="$(sudo -u "$CONSOLE_USER" which openclaw 2>/dev/null || true)"
    [[ -n "$FINAL_BIN" ]] && rm -f "$FINAL_BIN"
    rm -f "/usr/local/bin/openclaw"
    rm -f "/opt/homebrew/bin/openclaw"
    rm -rf "$USER_HOME/.local/bin/openclaw"
    ok "OpenClaw global binary và service đã gỡ bỏ"
else
    info "Không tìm thấy OpenClaw."
fi

# ── 2. Xóa VClaw.app ───────────────────────────────────────────────────────────
echo -e "\n${BOLD}[2/4] Xóa ứng dụng VClaw${NC}"
if [[ -d "/Applications/VClaw.app" ]]; then
    rm -rf "/Applications/VClaw.app"
    ok "/Applications/VClaw.app đã xóa"
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
echo -e "\n${BOLD}[3/4] Xóa cấu hình (~/.openclaw)${NC}"
read -p "  Bạn có muốn xóa TOÀN BỘ cấu hình và lịch sử chat không? (y/N) " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    rm -rf "$USER_HOME/.openclaw"
    rm -f "$USER_HOME/Library/Logs/vclaw-setup.log"
    rm -f "/tmp/vclaw-preinstall.log"
    rm -f "/tmp/vclaw-postinstall.log"
    ok "Thư mục cấu hình và nhật ký cài đặt đã xóa sạch"
else
    info "Đã giữ lại thư mục cấu hình."
fi

# ── 4. Xóa Ollama (Optional) ───────────────────────────────────────────────────
echo -e "\n${BOLD}[4/4] Xóa Ollama (AI Engine)${NC}"
warn "Lưu ý: Ollama có thể được sử dụng bởi các ứng dụng khác trên máy."
read -p "  Bạn có CHẮC CHẮN muốn gỡ bỏ Ollama không? (y/N) " confirm_ollama
if [[ "$confirm_ollama" =~ ^[Yy]$ ]]; then
    # Dừng app Ollama nếu đang chạy
    pkill Ollama || true
    rm -rf "/Applications/Ollama.app"
    rm -f "/usr/local/bin/ollama"
    # Dữ liệu model của Ollama thường rất lớn (~/.ollama)
    read -p "    Bạn có muốn xóa cả các Model đã tải (~/.ollama - nặng vài GB)? (y/N) " confirm_models
    if [[ "$confirm_models" =~ ^[Yy]$ ]]; then
        rm -rf "$USER_HOME/.ollama"
        ok "Đã xóa toàn bộ dữ liệu Ollama"
    fi
    ok "Ollama đã được gỡ bỏ"
else
    info "Đã giữ lại Ollama."
fi

# ── 5. Hoàn tất ───────────────────────────────────────────────────────────────
echo -e "\n${SUCCESS}${BOLD}🦞 VClaw đã được gỡ bỏ hoàn toàn khỏi máy tính của bạn.${NC}\n"
