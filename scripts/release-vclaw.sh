#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_SCRIPT="$ROOT_DIR/scripts/release-vclaw.mjs"

usage() {
  cat <<'EOF'
Dùng: bash scripts/release-vclaw.sh [--type ui|runtime|native] [--version X.Y.Z] [--platform darwin|win32] [--arch arm64|x64] [--upload] [--create-release]

Nếu không truyền tham số, script sẽ hỏi tương tác trong terminal.

Ví dụ:
  bash scripts/release-vclaw.sh
  bash scripts/release-vclaw.sh --type ui --version 0.1.1 --upload
  bash scripts/release-vclaw.sh --type runtime --version 0.1.1 --upload --create-release
EOF
}

TYPE=""
VERSION=""
PLATFORM=""
ARCH=""
UPLOAD="0"
CREATE_RELEASE="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="${2:-}"; shift 2 ;;
    --version) VERSION="${2:-}"; shift 2 ;;
    --platform) PLATFORM="${2:-}"; shift 2 ;;
    --arch) ARCH="${2:-}"; shift 2 ;;
    --upload) UPLOAD="1"; shift ;;
    --create-release) CREATE_RELEASE="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Tham số không hợp lệ: $1" >&2
      usage
      exit 1
      ;;
  esac
done

read_choice() {
  local prompt="$1"
  local default="$2"
  local value=""
  read -r -p "$prompt" value
  echo "${value:-$default}"
}

next_version_for_type() {
  local type="$1"
  local version="$2"
  node -e "const type='$type'; const version='$version'.trim(); const m=version.match(/^(\d+)\.(\d+)\.(\d+)$/); if (!m) process.exit(1); const major=Number(m[1]); const minor=Number(m[2]); const patch=Number(m[3]); let next; if (type==='ui') { next=[major, minor, patch + 1]; } else if (type==='runtime') { next = major === 0 ? [0, minor + 1, 0] : [major, minor, patch + 1]; } else if (type==='native') { next = major === 0 ? [1, 0, 0] : [major + 1, 0, 0]; } else { next=[major, minor, patch + 1]; } process.stdout.write(next.join('.'));"
}

if [[ -z "$TYPE" ]]; then
  echo "Chọn loại release:"
  echo "  1) ui        - Gói cập nhật giao diện Next.js"
  echo "  2) runtime   - Gói OpenClaw runtime"
  echo "  3) native    - Bộ cài Electron/native"
  choice="$(read_choice "Chọn [1-3] (mặc định 1): " "1")"
  case "$choice" in
    1|ui) TYPE="ui" ;;
    2|runtime) TYPE="runtime" ;;
    3|native) TYPE="native" ;;
    *) TYPE="ui" ;;
  esac
fi

if [[ -z "$VERSION" ]]; then
  CURRENT_VERSION="$(node -e "const v=require('$ROOT_DIR/vclaw-ui/release-versions.json'); const map={ui:v.uiVersion,runtime:v.openclawRuntime.version,native:v.nativeVersion}; process.stdout.write(map['$TYPE'] || v.uiVersion)")"
  DEFAULT_VERSION="$(next_version_for_type "$TYPE" "$CURRENT_VERSION")"
  VERSION="$(read_choice "Phiên bản release [${DEFAULT_VERSION}]: " "$DEFAULT_VERSION")"
fi

if [[ "$TYPE" != "native" ]]; then
  if [[ -z "$PLATFORM" ]]; then
    PLATFORM="$(read_choice "Nền tảng [darwin/win32] (mặc định darwin): " "darwin")"
  fi
  if [[ -z "$ARCH" ]]; then
    DEFAULT_ARCH="$(uname -m)"
    [[ "$DEFAULT_ARCH" == "arm64" || "$DEFAULT_ARCH" == "aarch64" ]] && DEFAULT_ARCH="arm64" || DEFAULT_ARCH="x64"
    ARCH="$(read_choice "Kiến trúc [arm64/x64] (mặc định ${DEFAULT_ARCH}): " "$DEFAULT_ARCH")"
  fi
fi

if [[ "${UPLOAD}" != "1" ]]; then
  ANSWER="$(read_choice "Upload lên GitHub Release? [y/N]: " "n")"
  [[ "$ANSWER" =~ ^[Yy]$ ]] && UPLOAD="1"
fi

if [[ "${CREATE_RELEASE}" != "1" ]]; then
  ANSWER="$(read_choice "Tạo release nếu chưa có tag? [y/N]: " "n")"
  [[ "$ANSWER" =~ ^[Yy]$ ]] && CREATE_RELEASE="1"
fi

args=(--type "$TYPE" --version "$VERSION")
if [[ -n "$PLATFORM" ]]; then args+=(--platform "$PLATFORM"); fi
if [[ -n "$ARCH" ]]; then args+=(--arch "$ARCH"); fi
if [[ "$UPLOAD" == "1" ]]; then args+=(--upload); fi
if [[ "$CREATE_RELEASE" == "1" ]]; then args+=(--create-release); fi

node "$NODE_SCRIPT" "${args[@]}"
