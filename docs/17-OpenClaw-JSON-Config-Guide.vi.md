# Hướng dẫn cấu hình `~/.openclaw/openclaw.json` cho VClaw

Tài liệu này giải thích nhanh các nhóm cấu hình quan trọng trong file `~/.openclaw/openclaw.json`, tập trung vào nhu cầu vận hành bot bán hàng và an toàn khi chạy kênh Zalo cá nhân.

## 1) Mục tiêu bảo mật cho kênh Zalo cá nhân

Nếu muốn **chặn bot thực thi command hệ thống khi nhận tin từ Zalo**, cần áp dụng đồng thời:

1. Khóa quyền gửi DM vào bot (`dmPolicy` + `allowFrom`).
2. Tắt các command nguy hiểm ở mức global (`bash`, `config`, `mcp`, `plugins`, `debug`).
3. Không dùng chế độ mở (`open`) cho kênh Zalo cá nhân.

### Cấu hình khuyến nghị (hardened)

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      // Tránh match theo tên nhóm vì tên có thể đổi
      dangerouslyAllowNameMatching: false,
      // Chỉ user có trong allowFrom mới nhắn bot được
      dmPolicy: "allowlist",
      // Điền đúng userId Zalo được phép
      allowFrom: ["1234567890123456789"],
      // Tùy chọn: khóa luôn xử lý group
      groupPolicy: "disabled",
    },
  },
  commands: {
    // Chặn command shell host
    bash: false,
    // Chặn sửa openclaw.json qua chat
    config: false,
    // Chặn sửa cấu hình MCP qua chat
    mcp: false,
    // Chặn enable/disable plugin qua chat
    plugins: false,
    // Chặn runtime override debug qua chat
    debug: false,
  },
}
```

> Ghi chú: `dmPolicy: "open"` là chế độ rộng nhất, không phù hợp cho môi trường production.

### `groupPolicy: "disabled"` để làm gì?

- Dòng này nghĩa là: bot **không xử lý bất kỳ tin nhắn group nào** trên Zalo.
- Khi để `disabled`, chỉ các cuộc chat riêng (DM) mới đi vào luồng AI trả lời.
- Phù hợp khi bạn muốn bot tập trung tư vấn khách 1-1, tránh bị kéo vào hội nhóm nội bộ.

So sánh nhanh các mode:

- `groupPolicy: "disabled"`: chặn toàn bộ group (an toàn nhất cho vận hành bán hàng DM).
- `groupPolicy: "allowlist"`: chỉ xử lý các group có trong `groups`.
- `groupPolicy: "open"`: cho phép xử lý group rộng, cần guardrail kỹ hơn (`groupAllowFrom`, `requireMention`).

## 2) Giải thích nhanh các nhóm cấu hình trong file

## `env`
- Quản lý biến môi trường dùng cho model/provider/token.
- Khuyến nghị: không để key thật trong git; dùng secret manager hoặc file local.

## `agents`
- Cấu hình mặc định cho agent: model chính/phụ, heartbeat, workspace, compaction.

## `gateway`
- Thiết lập cổng chạy gateway, auth mode, token, network bind, control UI.
- Production nên bật auth chặt và tránh `dangerouslyDisableDeviceAuth` nếu không cần.

## `models`
- Danh sách provider + model khả dụng cho runtime.
- `mode: "merge"` cho phép gộp provider từ nhiều nguồn config.

## `plugins`
- `allow`: whitelist plugin được nạp.
- `entries`: bật/tắt từng plugin.
- `installs`: metadata plugin đã cài.

## `session`
- Điều khiển phạm vi session, ví dụ `dmScope`.

## `channels`
- Cấu hình theo từng kênh (Telegram, Zalouser, ...).
- Với `zalouser`, các khóa quan trọng:
  - `enabled`
  - `dmPolicy` (`pairing | allowlist | open | disabled`)
  - `allowFrom`
  - `groupPolicy` (`disabled | allowlist | open`)
  - `groupAllowFrom`
  - `groups`
  - `dangerouslyAllowNameMatching`

## `tools`
- Profile công cụ và khả năng web fetch/search.
- Nên tắt những nhóm tool không cần dùng trong vận hành hằng ngày.

## `hooks`
- Bật/tắt hook nội bộ phục vụ logging, memory, bootstrap.

## `browser`
- Điều khiển headless/headful cho các luồng automation trình duyệt.

## `meta` / `wizard`
- Metadata hệ thống và trạng thái chạy wizard lần gần nhất.

## 3) Checklist an toàn cho bot bán hàng

- Không dùng `channels.zalouser.dmPolicy = "open"` trên máy thật.
- Dùng `allowlist` rõ ràng cho người được phép điều khiển bot.
- Tắt command nguy hiểm (`bash`, `config`, `mcp`, `plugins`, `debug`).
- Chỉ bật plugin thực sự cần thiết cho vận hành.
- Định kỳ xoay token gateway và API key.

## 4) Nguồn tham chiếu kỹ thuật

- Submodule fork: [`core/openclaw-zero-token/docs/channels/zalouser.md`](../core/openclaw-zero-token/docs/channels/zalouser.md)
- Lệnh slash / tool surface: [`core/openclaw-zero-token/docs/tools/slash-commands.md`](../core/openclaw-zero-token/docs/tools/slash-commands.md)
