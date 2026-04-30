# Template workspace OpenClaw (VClaw)

Các file Markdown này là **bản gốc đóng gói**; bản chạy thật nằm tại `~/.openclaw/workspace/` sau khi:

- Cài **VClaw.pkg** (postinstall gọi `sync-openclaw-workspace.sh --if-missing`), hoặc
- Chạy `bash scripts/sync-openclaw-workspace.sh --if-missing --template "$(pwd)/scripts/packaging/openclaw-workspace"` từ repo, hoặc
- Chạy `vclaw-zero.sh` (dev hoặc app) — đồng bộ thiếu file trước khi mở Chrome / gateway.

Ghi đè toàn bộ file seed (mất chỉnh sửa tay trên máy):  
`bash scripts/sync-openclaw-workspace.sh --force --template .../openclaw-workspace`

Không đặt secret thật trong template; token MCP và `.env.local` do người dùng cấu hình khớp nhau.
