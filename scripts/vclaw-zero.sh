#!/usr/bin/env bash
# Luồng Zero Token VClaw: Chrome CDP (profile ShellElectron) → onboard webauth → Gateway.
# - Cài từ .pkg: chạy từ /Applications/VClaw.app/Contents/Resources/ (dùng ~/.openclaw + lệnh openclaw).
# - Dev: chạy từ repo (bash scripts/vclaw-zero.sh) — dùng core/openclaw-zero-token và onboard.sh/server.sh.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
OT="$REPO_ROOT/core/openclaw-zero-token"
PORT="${OPENCLAW_GATEWAY_PORT:-3001}"

export PATH="${HOME:+$HOME/.local/bin:}/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

is_packaged() {
  [[ "$HERE" == *"/VClaw.app/Contents/Resources" ]]
}

detect_os() {
  case "${OSTYPE:-}" in
    darwin*) echo "mac" ;;
    *)       echo "other" ;;
  esac
}

read_gateway_token() {
  local cfg="${1:-}"
  [[ -f "$cfg" ]] || { echo ""; return; }
  if command -v jq &>/dev/null; then
    jq -r '.gateway.auth.token // empty' "$cfg" 2>/dev/null || true
  else
    echo ""
  fi
}

open_browser_url() {
  local url="$1"
  case "$(detect_os)" in
    mac) open "$url" 2>/dev/null || true ;;
    *)   echo "Mở trình duyệt tại: $url" ;;
  esac
}

port_pids() {
  command -v lsof &>/dev/null && lsof -ti:"$PORT" 2>/dev/null | tr '\n' ' ' || true
}

stop_gateway_packaged() {
  local pid_file="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/.vclaw-zero-gateway.pid"
  if [[ -f "$pid_file" ]]; then
    local old
    old="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
      echo "Đang dừng Gateway cũ (PID $old)..."
      kill "$old" 2>/dev/null || true
      sleep 1
      kill -9 "$old" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
  local p
  p="$(port_pids)"
  if [[ -n "${p// }" ]]; then
    echo "Đang giải phóng cổng $PORT..."
    # shellcheck disable=SC2086
    kill $p 2>/dev/null || true
    sleep 1
  fi
}

start_gateway_packaged() {
  local cfg="$OPENCLAW_CONFIG_PATH"
  local token
  token="$(read_gateway_token "$cfg")"
  local tmp_log="/tmp/vclaw-zero-gateway.log"
  local pid_file="${OPENCLAW_STATE_DIR}/.vclaw-zero-gateway.pid"

  stop_gateway_packaged

  echo ""
  echo "Đang khởi động Gateway (nền, cổng $PORT)..."
  nohup openclaw gateway run --port "$PORT" --force >"$tmp_log" 2>&1 &
  local gpid=$!
  echo "$gpid" >"$pid_file"
  echo "Nhật ký Gateway: $tmp_log"

  local i=0
  local ready=0
  while [[ $i -lt 30 ]]; do
    i=$((i + 1))
    if curl -s -o /dev/null --connect-timeout 1 "http://127.0.0.1:$PORT/" 2>/dev/null; then
      echo "Gateway đã sẵn sàng (${i}s)."
      ready=1
      break
    fi
    if ! kill -0 "$gpid" 2>/dev/null; then
      echo "✗ Gateway thoát sớm. Nhật ký:"
      cat "$tmp_log" 2>/dev/null || true
      rm -f "$pid_file"
      exit 1
    fi
    sleep 1
  done

  local web_url="http://127.0.0.1:$PORT/"
  [[ -n "$token" ]] && web_url="http://127.0.0.1:$PORT/#token=${token}"

  echo "Gateway (PID $gpid). Web UI: $web_url"
  if [[ "$ready" -eq 1 ]]; then
    echo "Đang mở trình duyệt..."
    open_browser_url "$web_url"
  else
    echo "⚠ Không xác nhận được bằng curl; hãy mở URL trên thủ công."
  fi
  echo ""
  echo "Bạn có thể đóng cửa sổ Terminal này; Gateway vẫn chạy nền."
  echo "Để dừng: kill $gpid hoặc xóa tiến trình trên cổng $PORT."
}

# ─── Cài app (.pkg) ───────────────────────────────────────────
run_packaged() {
  export HOME="${HOME:-$(eval echo "~$USER")}"
  export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
  export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$OPENCLAW_STATE_DIR/openclaw.json}"
  export OPENCLAW_GATEWAY_PORT="$PORT"

  local chrome_script="$HERE/start-chrome-debug.sh"
  if [[ ! -f "$chrome_script" ]]; then
    echo "✗ Không tìm thấy start-chrome-debug.sh cạnh script (đường dẫn kỳ vọng: $chrome_script)."
    exit 1
  fi

  echo "=== VClaw Zero Token (bản cài app) ==="
  echo "Cấu hình: $OPENCLAW_CONFIG_PATH"
  echo "State:    $OPENCLAW_STATE_DIR"
  echo ""

  bash "$chrome_script"

  if ! command -v openclaw &>/dev/null; then
    echo "✗ Không tìm thấy lệnh openclaw trong PATH."
    echo "  Hãy cài VClaw.pkg (postinstall cài runtime vào ~/.openclaw/runtime và symlink /usr/local/bin/openclaw)."
    exit 1
  fi

  echo ""
  echo "Đang chạy ủy quyền mô hình web (openclaw onboard webauth)..."
  openclaw onboard webauth

  start_gateway_packaged
}

# ─── Dev (repo) ─────────────────────────────────────────────────
run_dev() {
  if [[ ! -d "$OT" ]]; then
    echo "✗ Không thấy thư mục $OT."
    echo "  Chạy: git submodule update --init --recursive core/openclaw-zero-token"
    exit 1
  fi

  export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-$OT/.openclaw-upstream-state}"
  export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$OPENCLAW_STATE_DIR/openclaw.json}"
  export OPENCLAW_GATEWAY_PORT="$PORT"

  echo "=== VClaw Zero Token (dev — $OT) ==="
  echo "Cấu hình: $OPENCLAW_CONFIG_PATH"
  echo ""

  bash "$OT/start-chrome-debug.sh"
  bash "$OT/onboard.sh" webauth
  bash "$OT/server.sh" start
}

if is_packaged; then
  run_packaged
else
  run_dev
fi
