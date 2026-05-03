#!/usr/bin/env bash
# Luồng Zero Token VClaw: Chrome CDP (profile ShellElectron) → onboard webauth → Gateway.
# - Cài từ .pkg: chạy từ /Applications/VClaw.app/Contents/Resources/ (dùng ~/.openclaw/runtime hoặc tự cài từ tarball kèm app).
# - Dev: chạy từ repo (bash scripts/vclaw-zero.sh) — dùng core/openclaw-zero-token và onboard.sh/server.sh.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
OT="$REPO_ROOT/core/openclaw-zero-token"
PORT="${OPENCLAW_GATEWAY_PORT:-3001}"

export PATH="${HOME:+$HOME/.local/bin:}/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
OPENCLAW_CMD=""

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

resolve_packaged_openclaw() {
  local candidates=(
    "$OPENCLAW_STATE_DIR/runtime/node_modules/.bin/openclaw"
    "$HOME/.local/bin/openclaw"
    "/usr/local/bin/openclaw"
    "/opt/homebrew/bin/openclaw"
  )
  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  if command -v openclaw &>/dev/null; then
    command -v openclaw
    return 0
  fi
  return 1
}

ensure_packaged_openclaw() {
  local resolved
  resolved="$(resolve_packaged_openclaw 2>/dev/null || true)"
  if [[ -n "$resolved" ]]; then
    OPENCLAW_CMD="$resolved"
    echo "OpenClaw runtime: $OPENCLAW_CMD"
    return 0
  fi

  local bundled_tgz="$HERE/openclaw-bundled.tgz"
  local runtime_dir="$OPENCLAW_STATE_DIR/runtime"
  if [[ ! -f "$bundled_tgz" ]]; then
    echo "✗ Không tìm thấy lệnh openclaw và cũng thiếu gói kèm app: $bundled_tgz"
    echo "  Hãy cài lại VClaw.pkg hoặc build installer bằng scripts/package-vclaw.sh."
    exit 1
  fi
  if ! command -v npm &>/dev/null; then
    echo "✗ Không tìm thấy npm trong PATH=$PATH."
    echo "  Cần Node.js/npm để bung OpenClaw runtime từ gói kèm VClaw."
    exit 127
  fi

  echo "Không thấy lệnh openclaw; đang cài runtime từ gói kèm VClaw..."
  mkdir -p "$runtime_dir/.npm-cache"
  if [[ ! -f "$runtime_dir/package.json" ]]; then
    printf '%s\n' '{"name":"openclaw-runtime","version":"1.0.0","private":true}' >"$runtime_dir/package.json"
  fi
  (
    cd "$runtime_dir"
    NPM_CONFIG_CACHE="$runtime_dir/.npm-cache" npm install "$bundled_tgz" --foreground-scripts --loglevel warn
  )

  resolved="$(resolve_packaged_openclaw 2>/dev/null || true)"
  if [[ -z "$resolved" ]]; then
    echo "✗ Đã cài từ $bundled_tgz nhưng vẫn chưa thấy OpenClaw tại $runtime_dir/node_modules/.bin/openclaw."
    exit 1
  fi
  OPENCLAW_CMD="$resolved"
  echo "OpenClaw runtime: $OPENCLAW_CMD"
}

repair_runtime_plugin_manifests() {
  local runtime_pkg="$OPENCLAW_STATE_DIR/runtime/node_modules/openclaw"
  local src_root="$runtime_pkg/extensions"
  local dist_root="$runtime_pkg/dist/extensions"
  local ext_dir
  local fixed_count=0

  [[ -d "$src_root" ]] || return 0

  for ext_dir in "$src_root"/*; do
    [[ -d "$ext_dir" ]] || continue
    [[ -f "$ext_dir/openclaw.plugin.json" ]] || continue
    local ext_name
    ext_name="$(basename "$ext_dir")"
    local dist_manifest="$dist_root/$ext_name/openclaw.plugin.json"
    if [[ ! -f "$dist_manifest" ]]; then
      mkdir -p "$dist_root/$ext_name"
      cp "$ext_dir/openclaw.plugin.json" "$dist_manifest"
      fixed_count=$((fixed_count + 1))
    fi
  done

  if [[ "$fixed_count" -gt 0 ]]; then
    echo "Đã tự sửa $fixed_count plugin manifest vào dist/extensions."
  fi
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
  nohup "$OPENCLAW_CMD" gateway run --port "$PORT" --force >"$tmp_log" 2>&1 &
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

  echo "=== VClaw Token (bản cài app) ==="
  echo "Cấu hình: $OPENCLAW_CONFIG_PATH"
  echo "State:    $OPENCLAW_STATE_DIR"
  echo ""

  mkdir -p "$OPENCLAW_STATE_DIR"
  local default_cfg="$HERE/openclaw.default.json"
  if [[ ! -f "$OPENCLAW_CONFIG_PATH" && -f "$default_cfg" ]]; then
    echo "Đang khởi tạo cấu hình OpenClaw mặc định..."
    cp "$default_cfg" "$OPENCLAW_CONFIG_PATH"
  fi

  local ws_tpl="$HERE/openclaw-workspace-template"
  local ws_sync="$HERE/sync-openclaw-workspace.sh"
  if [[ -d "$ws_tpl" && -f "$ws_sync" ]]; then
    chmod +x "$ws_sync" 2>/dev/null || true
    bash "$ws_sync" --if-missing --template "$ws_tpl" || true
  fi

  ensure_packaged_openclaw
  repair_runtime_plugin_manifests
  # Đã loại bỏ: bash "$chrome_script" (Giờ đây dùng Electron CDP 9222)
  echo ""
  echo "Đang chạy ủy quyền mô hình web (openclaw onboard webauth)..."
  "$OPENCLAW_CMD" onboard webauth

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

  echo "=== VClaw Token (dev — $OT) ==="
  echo "Cấu hình: $OPENCLAW_CONFIG_PATH"
  echo ""

  if [[ -f "$REPO_ROOT/scripts/sync-openclaw-workspace.sh" && -d "$REPO_ROOT/scripts/packaging/openclaw-workspace" ]]; then
    chmod +x "$REPO_ROOT/scripts/sync-openclaw-workspace.sh" 2>/dev/null || true
    bash "$REPO_ROOT/scripts/sync-openclaw-workspace.sh" --if-missing --template "$REPO_ROOT/scripts/packaging/openclaw-workspace" || true
  fi

  # Đã loại bỏ: bash "$OT/start-chrome-debug.sh"
  bash "$OT/onboard.sh" webauth
  bash "$OT/server.sh" start
}

if is_packaged; then
  run_packaged
else
  run_dev
fi
