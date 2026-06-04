#!/usr/bin/env bash

# Pipeline kiểm chứng project: build, test, CVE, Docker, secrets và PII.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
PROJECT_DIR=""
DOCKERFILE_PATH=""
SCAN_DIRS="src tests"

# Custom commands from project context
CMD_RESTORE=""
CMD_BUILD=""
CMD_TEST=""
CMD_FORMAT=""
CMD_AUDIT=""
CMD_MIGRATION_CREATE=""


while [ "$#" -gt 0 ]; do
  case "$1" in
    --project-dir)
      PROJECT_DIR="$2"
      shift 2
      ;;
    --cmd-restore)
      CMD_RESTORE="$2"
      shift 2
      ;;
    --cmd-build)
      CMD_BUILD="$2"
      shift 2
      ;;
    --cmd-test)
      CMD_TEST="$2"
      shift 2
      ;;
    --cmd-format)
      CMD_FORMAT="$2"
      shift 2
      ;;
    --cmd-audit)
      CMD_AUDIT="$2"
      shift 2
      ;;
    --cmd-migration-create)
      CMD_MIGRATION_CREATE="$2"
      shift 2
      ;;
    *)
      echo "Tham số không hỗ trợ: $1"
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT_DIR" ]; then
  echo "Thiếu --project-dir. Hãy lấy giá trị từ .agents/project-contexts/<service-or-app>.context.md."
  exit 1
fi


if [[ "$PROJECT_DIR" != /* ]]; then
  PROJECT_DIR="$ROOT_DIR/$PROJECT_DIR"
fi
if [ -z "$DOCKERFILE_PATH" ]; then
  DOCKERFILE_PATH="$PROJECT_DIR/Dockerfile"
elif [[ "$DOCKERFILE_PATH" != /* ]]; then
  DOCKERFILE_PATH="$PROJECT_DIR/$DOCKERFILE_PATH"
fi

BUILD_LOG="$PROJECT_DIR/build_log.tmp"
TEST_LOG="$PROJECT_DIR/test_log.tmp"
VULN_LOG="$PROJECT_DIR/vulnerable_report.tmp"
RESTORE_LOG="$PROJECT_DIR/restore_log.tmp"
FORMAT_LOG="$PROJECT_DIR/format_log.tmp"

cleanup() {
  rm -f "$BUILD_LOG" "$TEST_LOG" "$VULN_LOG" "$RESTORE_LOG" "$FORMAT_LOG"
}
trap cleanup EXIT

print_step() {
  echo
  echo "================================================================================"
  echo "$1"
  echo "================================================================================"
}

fail() {
  echo "❌ $1"
  exit 1
}

print_step "BẮT ĐẦU PIPELINE KIỂM CHỨNG PROJECT"

cd "$PROJECT_DIR"

print_step "[BƯỚC 1] Restore dependency"
if [ -n "$CMD_RESTORE" ]; then
  echo "Running: $CMD_RESTORE"
  if ! eval "$CMD_RESTORE" > "$RESTORE_LOG" 2>&1; then
    echo "❌ Restore thất bại. Các dòng lỗi chính:"
    tail -n 40 "$RESTORE_LOG"
    exit 1
  fi
  echo "✅ Restore thành công."
else
  echo "⏭️ Bỏ qua (không có --cmd-restore)."
fi

print_step "[BƯỚC 2] Biên dịch project"
if [ -n "$CMD_BUILD" ]; then
  echo "Running: $CMD_BUILD"
  if ! eval "$CMD_BUILD" > "$BUILD_LOG" 2>&1; then
    echo "❌ Build thất bại. Các dòng lỗi chính:"
    tail -n 40 "$BUILD_LOG"
    exit 1
  fi
  echo "✅ Build thành công."

  warning_count="$(grep -c -i "warning " "$BUILD_LOG" || true)"
  if [ "$warning_count" -gt 0 ]; then
    echo "⚠️ Phát hiện $warning_count cảnh báo biên dịch. Cần xử lý trước release chính thức."
    grep -i "warning " "$BUILD_LOG" | head -n 20 || true
  else
    echo "✅ Không phát hiện cảnh báo biên dịch."
  fi
else
  echo "⏭️ Bỏ qua (không có --cmd-build)."
fi

print_step "[BƯỚC 3] Chạy test tự động"
if [ -n "$CMD_TEST" ]; then
  echo "Running: $CMD_TEST"
  if ! eval "$CMD_TEST" > "$TEST_LOG" 2>&1; then
    echo "❌ Test thất bại. Các dòng lỗi chính:"
    tail -n 60 "$TEST_LOG"
    exit 1
  fi
  echo "✅ Toàn bộ test đã chạy thành công."
else
  echo "⏭️ Bỏ qua (không có --cmd-test)."
fi

print_step "[BƯỚC 4] Kiểm tra định dạng code"
if [ -n "$CMD_FORMAT" ]; then
  echo "Running: $CMD_FORMAT"
  if eval "$CMD_FORMAT" > "$FORMAT_LOG" 2>&1; then
    echo "✅ Định dạng code đạt yêu cầu."
  else
    echo "⚠️ Công cụ định dạng code phát hiện khác biệt. Các dòng chính:"
    tail -n 40 "$FORMAT_LOG"
  fi
else
  echo "⏭️ Bỏ qua (không có --cmd-format)."
fi

print_step "[BƯỚC 5] Quét lỗ hổng dependency"
if [ -n "$CMD_AUDIT" ]; then
  echo "Running: $CMD_AUDIT"
  eval "$CMD_AUDIT" > "$VULN_LOG" 2>&1 || true
  if grep -Eiq "\b(high|critical)\b" "$VULN_LOG"; then
    echo "❌ Phát hiện dependency có lỗ hổng High/Critical:"
    grep -Ei "\b(high|critical)\b" "$VULN_LOG" || true
    exit 1
  fi
  echo "✅ Không phát hiện lỗ hổng cấp High/Critical."
else
  echo "⏭️ Bỏ qua (không có --cmd-audit)."
fi

print_step "[BƯỚC 6] Kiểm tra Dockerfile non-root"
if [ -f "$DOCKERFILE_PATH" ]; then
  if grep -Eiq "^[[:space:]]*USER[[:space:]]+(root|0)([[:space:]]|$)" "$DOCKERFILE_PATH"; then
    fail "Dockerfile đang chạy bằng root."
  elif grep -Eq "^[[:space:]]*USER[[:space:]]+[^[:space:]]+" "$DOCKERFILE_PATH"; then
    echo "✅ Dockerfile có khai báo USER non-root."
  else
    fail "Dockerfile chưa khai báo USER non-root."
  fi
else
  echo "⚠️ Không tìm thấy Dockerfile tại: $DOCKERFILE_PATH"
fi

print_step "[BƯỚC 7] Quét secrets và PII rõ ràng"
secret_pattern='(password|passwd|pwd|api[_-]?key|secret|client_secret|connectionstring|connection string|bearer token|private[_-]?key)[[:space:]]*[:=]'
secret_hits="$(rg -n -i "$secret_pattern" $SCAN_DIRS --glob '!**/bin/**' --glob '!**/obj/**' \
  | rg -v 'config\["|Configuration\["|GetSection\("|Test credentials|Mock OTP' || true)"
if [ -n "$secret_hits" ]; then
  echo "$secret_hits"
  fail "Phát hiện dấu hiệu hardcode secret. Hãy kiểm tra các dòng ở trên."
fi

pii_log_pattern='Log\.(Information|Warning|Error|Debug)|Console\.WriteLine'
if rg -n "$pii_log_pattern" $SCAN_DIRS --glob '!**/bin/**' --glob '!**/obj/**' | rg -i 'cccd|citizen|password|medical|token|payment|card'; then
  fail "Phát hiện log có thể chứa PII hoặc dữ liệu nhạy cảm."
fi
echo "✅ Không phát hiện secret/PII rõ ràng qua mẫu quét nhanh."

print_step "[BƯỚC 8] Migration readiness"
if [ -n "$CMD_MIGRATION_CREATE" ]; then
  echo "Running: $CMD_MIGRATION_CREATE"
  if eval "$CMD_MIGRATION_CREATE"; then
    echo "✅ Đã chạy lệnh tạo migration thành công."
  else
    echo "⚠️ Lệnh tạo migration thất bại."
  fi
else
  if rg -n -i "class .* : BaseEntity|DbSet<|OnModelCreating|IEntityTypeConfiguration|CREATE TABLE|ALTER TABLE" $SCAN_DIRS --glob '!**/bin/**' --glob '!**/obj/**' >/dev/null 2>&1; then
    echo "ℹ️ Có model/persistence trong thư mục quét. Hãy dùng --cmd-migration-create nếu cần tạo migration."
  else
    echo "ℹ️ Không phát hiện thay đổi migration qua mẫu quét nhanh."
  fi
fi

print_step "PIPELINE HOÀN TẤT"
echo "✅ Build, test và các cổng bảo mật chính đã vượt qua."
