# @openclaw/zalouser

OpenClaw extension for Zalo Personal Account messaging via native `zca-js` integration.

> **Warning:** Using Zalo automation may result in account suspension or ban. Use at your own risk. This is an unofficial integration.

## Features

- Channel plugin integration with setup wizard + QR login
- In-process listener/sender via `zca-js` (no external CLI)
- Multi-account support
- Agent tool integration (`zalouser`)
- DM/group policy support

## Prerequisites

- OpenClaw Gateway
- Zalo mobile app (for QR login)

No external `zca`, `openzca`, or `zca-cli` binary is required.

## Debugging OA / kênh (payload thô)

Mặc định gateway bật debug/replay cho tin từ Page/OA/kênh để dễ kiểm tra Techcombank. Có thể tắt raw log bằng `OPENCLAW_ZALOUSER_LOG_RAW_INBOUND=0` hoặc tắt replay batch lịch sử đầu bằng `OPENCLAW_ZALOUSER_REPLAY_OLD_MESSAGES_BASELINE=0`.

Trên **stderr** của gateway bạn sẽ thấy:

- `[zalouser][raw-inbound]` — payload `message.data` (tối đa ~8000 ký tự) mỗi khi socket nhận tin (không phải tin gửi đi từ chính bạn).
- `[zalouser][skip-self]` — tin bị coi là `isSelf` (bỏ qua).
- `[zalouser][drop-null]` — tin vào listener nhưng **không parse được** (thiếu `threadId`/`senderId` trong payload); dòng kèm JSON gợi ý field thô.

Listener cũng gọi `old_messages` của `zca-js` mỗi 15 giây sau khi WebSocket `connected` để bắt các tin cá nhân/kênh bị rơi vào lịch sử nhưng không emit realtime. Có thể chỉnh bằng `OPENCLAW_ZALOUSER_OLD_MESSAGES_SYNC_MS` hoặc đặt `0` để tắt.

Khi raw debug bật, mỗi tin lịch sử sẽ có dòng `[zalouser][old-messages-item]` với `senderName`, `msgType`, `msgId`, `threadId` và `preview`. Batch lịch sử đầu tiên mặc định replay vào pipeline để dễ xác nhận hệ thống có đọc được tin kênh; khi vận hành ổn định có thể đặt `OPENCLAW_ZALOUSER_REPLAY_OLD_MESSAGES_BASELINE=0`.

Trường `conversationKind` trong log phân loại tin: `friend`, `group`, hoặc `channel_candidate` (không có trong danh bạ bạn bè/nhóm, có khả năng là kênh/Page/OA). Grep nhanh: `grep 'conversationKind":"channel_candidate' <gateway.log>`.

Nếu **đã bật** biến mà khi ngân hàng trả lời **không có bất kỳ dòng nào** `[zalouser][...]`: tin đó **không đi qua** sự kiện `listener.on("message")` của `zca-js` (ví dụ chỉ hiện sau khi mở hội thoại / tải lịch sử) — khi đó không thể bắt bằng listener realtime trong plugin này.

**Sau khi sửa mã trong `extensions/zalouser/src`:** gateway chạy từ bản **build** (`dist/`). Phải chạy **`pnpm build`** ở thư mục gốc `openclaw-zero-token`, rồi `./server.sh restart`. Khi build đúng, ngay sau start sẽ có một dòng **`[zalouser][diag]`** trong log (ghi trực tiếp `stderr`).

## Install

### Option A: npm

```bash
openclaw plugins install @openclaw/zalouser
```

### Option B: local source checkout

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

Restart the Gateway after install.

## Quick start

### Login (QR)

```bash
openclaw channels login --channel zalouser
```

Scan the QR code with the Zalo app on your phone.

### Enable channel

```yaml
channels:
  zalouser:
    enabled: true
    dmPolicy: pairing # pairing | allowlist | open | disabled
```

### Send a message

```bash
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
```

## Configuration

Basic:

```yaml
channels:
  zalouser:
    enabled: true
    dmPolicy: pairing
```

Multi-account:

```yaml
channels:
  zalouser:
    enabled: true
    defaultAccount: default
    accounts:
      default:
        enabled: true
        profile: default
      work:
        enabled: true
        profile: work
```

## Useful commands

```bash
openclaw channels login --channel zalouser
openclaw channels login --channel zalouser --account work
openclaw channels status --probe
openclaw channels logout --channel zalouser

openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

## Agent tool

The extension registers a `zalouser` tool for AI agents.

Available actions: `send`, `image`, `link`, `friends`, `groups`, `me`, `status`

## Troubleshooting

- Login not persisted: `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`
- Probe status: `openclaw channels status --probe`
- Name resolution issues (allowlist/groups): use numeric IDs or exact Zalo names

## Credits

Built on [zca-js](https://github.com/RFS-ADRENO/zca-js).
