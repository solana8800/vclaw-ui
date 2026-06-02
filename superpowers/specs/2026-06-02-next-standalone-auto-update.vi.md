# Thiết kế Auto-update Payload Next.js Standalone

## Mục tiêu

VClaw Desktop tự tải bản cập nhật Next.js standalone ở nền, xác minh SHA-256 và chỉ
khởi động lại để áp dụng sau khi người dùng đồng ý. OpenClaw runtime tự cập nhật riêng
bằng tarball `openclaw-bundled.tgz`. Native app chỉ cập nhật qua installer khi Electron
launcher hoặc installer hook thay đổi.

## Phạm vi

- Một kênh phát hành `stable`.
- Payload và manifest nằm trong GitHub Releases public `solana8800/vclaw`.
- Manifest có thể đánh dấu `required: true`.
- Payload có thể kèm Prisma migration cộng thêm bảng hoặc cột. Không tự động rollback database.
- Không dùng Firebase Remote Config trong MVP.
- Không cập nhật Electron, launcher, OpenClaw hoặc installer hook bằng payload UI.
- OpenClaw runtime tải tarball riêng từ GitHub Release, xác minh SHA-256, cài vào staging
  rồi swap thư mục runtime có backup.
- Manifest có thể thông báo native installer mới theo OS/arch. Launcher chỉ mở URL tải
  installer; không tự thực thi installer.

## Kiến trúc

Launcher đọc payload active trong thư mục dữ liệu user trước khi khởi động Next.js.
Nếu payload active không hợp lệ hoặc không start được, launcher đánh dấu payload lỗi
và fallback về bản Next.js bundle trong installer.

Sau khi UI và Electron đã mở, launcher tải manifest stable từ GitHub Releases. Khi có
phiên bản mới tương thích với launcher, launcher tải ZIP vào staging, xác minh SHA-256,
giải nén và kiểm tra có `server.js`. Launcher gửi yêu cầu xác nhận sang Electron shell.
Khi người dùng đồng ý, launcher ghi `active.json` theo kiểu atomic rồi restart app.

## Dữ liệu User-space

```text
<VClaw data>/
  updates/
    ui/
      active.json
      downloads/
      versions/
        0.2.1/
          server.js
          package.json
          ...
```

`active.json` giữ phiên bản active, phiên bản bundle và payload lỗi gần nhất. Database
nghiệp vụ nằm ngoài cây payload nên không bị ghi đè khi update hoặc rollback code.

Migration UI nằm trong `prisma/ui-additive-migrations/`, có ledger riêng và chỉ chấp
nhận `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX`, `ALTER TABLE ... ADD COLUMN`.
Rollback code không đảo ngược database.

## Manifest

```json
{
  "schemaVersion": 1,
  "channel": "stable",
  "uiVersion": "0.2.1",
  "required": false,
  "minimumLauncherVersion": "0.1.0",
  "payload": {
    "url": "https://github.com/solana8800/vclaw/releases/download/v0.2.1/vclaw-ui-0.2.1-darwin-arm64.zip",
    "sha256": "<hex>",
    "platform": "darwin",
    "arch": "arm64"
  }
}
```

Mỗi release có manifest riêng theo nền tảng và kiến trúc để launcher không tải nhầm
payload. SHA-256 phát hiện file hỏng hoặc tải thiếu; chữ ký số là bước hardening sau MVP.

## UX

- Update thường: `Khởi động lại để cập nhật` hoặc `Để sau`.
- Update bắt buộc: chỉ có `Khởi động lại để cập nhật`.
- Download hoặc checksum lỗi: giữ nguyên bản đang chạy, ghi log, không làm gián đoạn user.
- Payload active lỗi startup: fallback bundle installer và ghi log rõ phiên bản lỗi.
- Native installer thường: `Tải installer mới` hoặc `Để sau`.
- Native installer bắt buộc: chỉ có `Tải installer mới`; nhắc lại khi mở app tới lúc cài
  native version mới.

## Phát hành

Script release tạo ZIP từ `.next/standalone`, copy `.next/static` và `public`, tính
SHA-256 rồi sinh manifest. Người phát hành upload ZIP và manifest lên cùng GitHub Release.

Script runtime chạy `npm pack --ignore-scripts` từ `core/openclaw-zero-token`, đổi tên
tarball theo version phát hành, tính SHA-256 và ghép field `openclawRuntime` vào manifest.
Helper release Node.js có prompt ngắn và hỗ trợ flags để build/upload UI, runtime hoặc
native installer trên macOS và Windows.

## Kiểm chứng

- Unit test module updater: semver, manifest compatibility, checksum, extract staging,
  active state và payload fallback.
- Contract test launcher: resolve active payload và fallback bundle.
- Smoke test script phát hành: tạo ZIP và manifest từ standalone fixture.
