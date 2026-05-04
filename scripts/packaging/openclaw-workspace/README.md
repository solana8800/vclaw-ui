# Template workspace OpenClaw (VClaw)

Các file Markdown này là **bản gốc đóng gói**; bản chạy thật nằm tại `~/.openclaw/workspace/` sau khi:

- Cài **VClaw.pkg** (postinstall gọi `sync-openclaw-workspace.sh --if-missing`), hoặc
- Chạy `bash scripts/sync-openclaw-workspace.sh --if-missing --template "$(pwd)/scripts/packaging/openclaw-workspace"` từ repo, hoặc
- Chạy `vclaw.sh` (dev hoặc app) — đồng bộ thiếu file trước khi mở Chrome / gateway.

Ghi đè toàn bộ file seed (mất chỉnh sửa tay trên máy):  
`bash scripts/sync-openclaw-workspace.sh --force --template .../openclaw-workspace`

Sau khi repo cập nhật quy tắc VietQR / nội dung CK: chạy lệnh trên (hoặc `--if-missing` nếu máy chưa có `AGENTS.md`) để đồng bộ `~/.openclaw/workspace/`.

Không đặt secret thật trong template; token MCP và `.env.local` do người dùng cấu hình khớp nhau.
