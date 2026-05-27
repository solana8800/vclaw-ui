#!/usr/bin/env bash
# VClaw Uninstall Script for Ubuntu/Debian
# Hỗ trợ cả giao diện đồ họa (Zenity) và dòng lệnh (CLI).
set -uo pipefail

BOLD='\033[1m'; ERROR='\033[38;2;230;57;70m'; SUCCESS='\033[38;2;0;229;204m'; WARN='\033[38;2;255;176;32m'; MUTED='\033[38;2;90;100;128m'; NC='\033[0m'
ok()   { echo -e "${SUCCESS}✓${NC} $*"; }
warn() { echo -e "${WARN}!${NC}  $*"; }
err()  { echo -e "${ERROR}✗${NC}  $*" >&2; }
info() { echo -e "${MUTED}·${NC}  $*"; }

echo -e "\n${BOLD}  🦞 Trình gỡ bỏ VClaw trên Ubuntu (Uninstall)${NC}"
echo -e "${MUTED}  Ngắt kết nối trợ lý AI và dọn dẹp hệ thống${NC}\n"

# Đọc tham số đầu vào
USE_GUI="no"
for arg in "$@"; do
    if [[ "$arg" == "--gui" ]]; then USE_GUI="yes"; fi
done

# Kiểm tra xem có Zenity để hiển thị UI không
if [[ "$USE_GUI" == "yes" ]] && ! command -v zenity &>/dev/null; then
    USE_GUI="no"
    warn "Không tìm thấy công cụ 'zenity', tự động chuyển sang chế độ dòng lệnh (Terminal)."
fi

# Hàm thực hiện gỡ cài đặt hệ thống thực tế bằng quyền root
run_package_removal() {
    info "Đang gọi trình quản lý gói hệ thống để gỡ bỏ VClaw..."
    # pkexec sẽ hiện popup nhập mật khẩu sudo thân thiện trên giao diện GUI Ubuntu
    if [[ "$USE_GUI" == "yes" ]]; then
        pkexec dpkg -P vclaw 2>&1
        return $?
    else
        # Hỏi sudo trong terminal
        if [[ $EUID -ne 0 ]]; then
            sudo dpkg -P vclaw
            return $?
        else
            dpkg -P vclaw
            return $?
        fi
    fi
}

# ── 1. Trường hợp: Chạy với Giao Diện Đồ Họa (Zenity GUI) ─────────────────────
if [[ "$USE_GUI" == "yes" ]]; then
    MSG="Bạn muốn gỡ bỏ VClaw như thế nào?\nGiữ lại dữ liệu giúp bạn dễ dàng phục hồi lịch sử và cấu hình khi cài đặt lại."
    
    # Hiển thị hộp thoại lựa chọn
    ANSWER=$(zenity --list --radiolist --title="🦞 VClaw — Gỡ cài đặt" \
        --text="$MSG" --column="Chọn" --column="Phương án" \
        TRUE "Giữ lại dữ liệu cấu hình và lịch sử chat" \
        FALSE "Xóa SẠCH dữ liệu cấu hình, lịch sử và database" \
        --ok-label="Tiếp tục" --cancel-label="Hủy bỏ" --width=450 --height=250 2>/dev/null)
        
    if [[ -z "$ANSWER" ]]; then
        info "Đã hủy gỡ cài đặt."
        exit 0
    fi
    
    # Tiến hành gỡ gói hệ thống
    if ! run_package_removal; then
        zenity --error --text="Quá trình gỡ bỏ gói cài đặt hệ thống thất bại. Vui lòng thử lại bằng Terminal." --title="Lỗi gỡ cài đặt" 2>/dev/null
        exit 1
    fi
    
    # Xử lý dữ liệu cá nhân ~/.openclaw
    REAL_USER="${SUDO_USER:-$USER}"
    USER_HOME="/home/$REAL_USER"
    CONFIG_DIR="$USER_HOME/.openclaw"
    
    if [[ "$ANSWER" == *"Xóa SẠCH"* ]]; then
        rm -rf "$CONFIG_DIR" 2>/dev/null || true
        rm -f "$USER_HOME/Library/Logs/vclaw-setup.log" 2>/dev/null || true
        rm -f "/tmp/vclaw-preinst.log" "/tmp/vclaw-postinst.log" "/tmp/vclaw-npm-install-ubuntu.log" 2>/dev/null || true
        zenity --info --text="VClaw và toàn bộ dữ liệu cấu hình đã được gỡ bỏ hoàn toàn khỏi máy tính." --title="Hoàn tất" 2>/dev/null
    else
        zenity --info --text="VClaw đã được gỡ bỏ. Dữ liệu cấu hình cá nhân của bạn vẫn được giữ lại an toàn tại ~/.openclaw." --title="Hoàn tất" 2>/dev/null
    fi
    
    exit 0
fi

# ── 2. Trường hợp: Chạy bằng Dòng Lệnh (CLI Terminal) ────────────────────────
if [[ $EUID -ne 0 ]]; then
   err "Vui lòng chạy script với sudo hoặc có quyền quản trị viên."
   echo "Sử dụng: sudo bash $0"
   exit 1
fi

# Gọi gỡ gói
if ! dpkg -P vclaw; then
    err "Lỗi khi gỡ gói vclaw thông qua dpkg."
    exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
USER_HOME="/home/$REAL_USER"
CONFIG_DIR="$USER_HOME/.openclaw"

warn "Nếu bạn giữ lại thư mục này, các cài đặt và lịch sử chat sẽ được tự động phục hồi khi bạn cài đặt lại VClaw."
read -p "  Bạn có muốn xóa SẠCH lịch sử chat và cấu hình tại ~/.openclaw không? (y/N) " confirm

if [[ "$confirm" =~ ^[Yy]$ ]]; then
    rm -rf "$CONFIG_DIR" 2>/dev/null || true
    rm -f "/tmp/vclaw-preinst.log" "/tmp/vclaw-postinst.log" "/tmp/vclaw-npm-install-ubuntu.log" 2>/dev/null || true
    ok "Toàn bộ dữ liệu cấu hình đã được dọn dẹp sạch sẽ khỏi máy tính."
else
    info "Đã giữ lại dữ liệu cấu hình người dùng tại ~/.openclaw."
fi

ok "Gỡ bỏ VClaw hoàn tất."
exit 0
