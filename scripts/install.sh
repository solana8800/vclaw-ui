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

# ── Bước 1: OpenClaw — force install/update ────────────────────────────────────
step "[1/3] OpenClaw (cài đặt / cập nhật)"
info "Đang cài đặt/cập nhật OpenClaw core gateway..."
if curl -fsSL https://openclaw.ai/install.sh | bash; then
  ok "OpenClaw đã cài đặt (phiên bản mới nhất)"
else
  err "Cài đặt OpenClaw thất bại."; exit 1
fi

# ── Bước 2: Cấu hình mặc định ──────────────────────────────────────────────────
step "[2/3] Cấu hình VClaw"
mkdir -p "$VCLAW_CONFIG_DIR"
CONFIG_FILE="$VCLAW_CONFIG_DIR/openclaw.json"

if [[ -f "$CONFIG_FILE" ]]; then
  info "Cấu hình hiện có ở $CONFIG_FILE — giữ nguyên"
else
  DEFAULT_CFG="$VCLAW_APP_PATH/Contents/Resources/openclaw.default.json"
  if [[ -f "$DEFAULT_CFG" ]]; then
    cp "$DEFAULT_CFG" "$CONFIG_FILE"
    ok "Đã sao chép cấu hình mặc định → $CONFIG_FILE"
  else
    info "VClaw.app chưa có; tạo cấu hình khởi tạo tối giản"
    cat > "$CONFIG_FILE" << 'JSON'
{
  "env": {
    "vars": {
      "OLLAMA_CLOUD_DEEPSEEK": "deepseek-v3.1:671b-cloud",
      "OLLAMA_CLOUD_KIMI": "kimi-k2.5:cloud",
      "OLLAMA_BASE_URL": "http://127.0.0.1:11434",
      "OPENROUTER_API_KEY": "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",
      "OPENROUTER_AUTO": "openrouter/auto",
      "TELEGRAM_BOT_TOKEN": "8693815388:AAE6tgA4UYPEoZip1_CqcvIQCmjDOZMzilc"
    }
  },
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "15m"
      },
      "model": {
        "primary": "openrouter/${OPENROUTER_AUTO}",
        "fallbacks": [
          "ollama/${OLLAMA_CLOUD_DEEPSEEK}",
          "ollama/${OLLAMA_CLOUD_KIMI}"
        ]
      },
      "workspace": "~/Documents/projects/vclaw/",
      "models": {
        "openrouter/${OPENROUTER_AUTO}": {
          "alias": "Auto Router"
        },
        "ollama/${OLLAMA_CLOUD_KIMI}": {
          "alias": "Kimi"
        },
        "ollama/${OLLAMA_CLOUD_DEEPSEEK}": {
          "alias": "DeepSeek"
        }
      }
    }
  },
  "gateway": {
    "bind": "loopback",
    "mode": "local",
    "port": 18789,
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    },
    "controlUi": {
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "auth": {
      "mode": "token",
      "token": "479599535b450e8f4662e92562c4439f0633668c6caddd7d"
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "openrouter": {
        "api": "openai-responses",
        "apiKey": "${OPENROUTER_API_KEY}",
        "baseUrl": "https://openrouter.ai/api/v1",
        "models": [
          {
            "id": "${OPENROUTER_AUTO}",
            "name": "Auto Router",
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      },
      "ollama": {
        "api": "ollama",
        "apiKey": "OLLAMA_API_KEY",
        "baseUrl": "${OLLAMA_BASE_URL}",
        "models": [
          {
            "id": "${OLLAMA_CLOUD_KIMI}",
            "name": "Kimi (Cloud)",
            "contextWindow": 128000,
            "maxTokens": 8192
          },
          {
            "id": "${OLLAMA_CLOUD_DEEPSEEK}",
            "name": "DeepSeek V3 (Cloud)",
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "plugins": {
    "allow": [
      "ollama",
      "telegram",
      "memory-core",
      "browser",
      "openrouter"
    ],
    "entries": {
      "ollama": {
        "enabled": true
      },
      "browser": {
        "enabled": true
      },
      "telegram": {
        "enabled": true
      },
      "openrouter": {
        "enabled": true
      }
    }
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "pairing"
    }
  },
  "tools": {
    "profile": "coding",
    "web": {
      "fetch": {
        "enabled": true
      },
      "search": {
        "enabled": true
      }
    }
  },
  "wizard": {
    "lastRunAt": "2026-04-21T04:03:59.740Z",
    "lastRunCommand": "onboard",
    "lastRunMode": "local",
    "lastRunVersion": "2026.4.15"
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": {
          "enabled": true
        },
        "bootstrap-extra-files": {
          "enabled": true
        },
        "command-logger": {
          "enabled": true
        },
        "session-memory": {
          "enabled": true
        }
      }
    }
  },
  "browser": {
    "headless": true
  },
  "meta": {
    "lastTouchedVersion": "2026.4.15",
    "lastTouchedAt": "2026-04-21T04:03:59.754Z"
  }
}
JSON
    ok "Đã tạo cấu hình tối giản → $CONFIG_FILE"
  fi
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
if [[ "$NO_START" != "1" ]] && command -v openclaw &>/dev/null; then
  echo ""
  info "Đang khởi động OpenClaw gateway..."
  if openclaw gateway install --force &>/dev/null && openclaw gateway start &>/dev/null; then
    ok "Gateway đang chạy tại http://localhost:18789"
  else
    warn "Không thể tự khởi động. Chạy: openclaw gateway start"
  fi
fi

echo ""
echo -e "${SUCCESS}${BOLD}🦞 VClaw đã sẵn sàng!${NC}"
echo ""
[[ "$OS" == "macos" ]] && [[ -d "$VCLAW_APP_PATH" ]] && echo -e "${MUTED}  Mở VClaw :${NC}  open -a VClaw"
echo -e "${MUTED}  Node.js  :${NC}  $(node --version)"
echo -e "${MUTED}  Gateway  :${NC}  http://localhost:18789"
echo -e "${MUTED}  Config   :${NC}  $CONFIG_FILE"
echo -e "${MUTED}  Logs     :${NC}  openclaw gateway logs"
echo ""
[[ "$OS" == "macos" ]] && [[ -d "$VCLAW_APP_PATH" ]] && open -a VClaw 2>/dev/null || true
