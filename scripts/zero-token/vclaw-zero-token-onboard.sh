#!/usr/bin/env bash
set -euo pipefail

export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
export OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-3001}"

if ! command -v openclaw >/dev/null 2>&1; then
  echo "Khong tim thay lenh openclaw. Hay cai VClaw xong roi chay lai script nay."
  exit 1
fi

echo "Cau hinh: $OPENCLAW_CONFIG_PATH"
echo "State dir: $OPENCLAW_STATE_DIR"
echo "Gateway port: $OPENCLAW_GATEWAY_PORT"
echo ""
echo "Hay dam bao Chrome debug dang chay tren http://127.0.0.1:9222 truoc khi onboard."
echo ""

openclaw onboard webauth "$@"
