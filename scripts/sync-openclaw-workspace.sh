#!/usr/bin/env bash
# Đồng bộ template workspace OpenClaw → ~/.openclaw/workspace
# Dùng bởi: VClaw.pkg postinstall, vclaw.sh, hoặc chạy tay khi dev.
set -euo pipefail

MODE="if-missing"
TEMPLATE=""

usage() {
  echo "Cách dùng: $0 --template <thư_mục> [--if-missing | --force]" >&2
  echo "  --if-missing  (mặc định) chỉ copy nếu file đích chưa có" >&2
  echo "  --force       ghi đè AGENTS.md, IDENTITY.md, ..." >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --template)
      TEMPLATE="${2:-}"
      shift 2
      ;;
    --if-missing)
      MODE="if-missing"
      shift
      ;;
    --force)
      MODE="force"
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Tham số không hợp lệ: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$TEMPLATE" || ! -d "$TEMPLATE" ]]; then
  echo "Cần --template trỏ tới thư mục có AGENTS.md (vd: .../openclaw-workspace)." >&2
  exit 1
fi

HOME="${HOME:-$(eval echo "~${USER:-}")}"
DEST="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
mkdir -p "$DEST"

SEED_FILES=(
  openclaw.json
  workspace/AGENTS.md
  workspace/IDENTITY.md
  workspace/SOUL.md
  workspace/USER.md
  workspace/TOOLS.md
  workspace/HEARTBEAT.md
  cron/jobs.json
)
synced=0
for f in "${SEED_FILES[@]}"; do
  src="$TEMPLATE/$f"
  [[ -f "$src" ]] || continue
  
  # Đảm bảo thư mục cha của file đích tồn tại (ví dụ: ~/.openclaw/workspace hoặc ~/.openclaw/cron)
  mkdir -p "$(dirname "$DEST/$f")"
  
  if [[ "$MODE" == "force" ]] || [[ ! -f "$DEST/$f" ]]; then
    cp "$src" "$DEST/$f"
    echo "[sync-openclaw-workspace] $([[ "$MODE" == "force" ]] && echo GHI ĐÈ || echo tạo mới) → $DEST/$f"
    synced=$((synced + 1))
  fi
done

if [[ "$synced" -eq 0 ]]; then
  echo "[sync-openclaw-workspace] Không thay đổi (đã có file và mode=if-missing): $DEST"
else
  echo "[sync-openclaw-workspace] Hoàn tất ($synced file) → $DEST"
fi
