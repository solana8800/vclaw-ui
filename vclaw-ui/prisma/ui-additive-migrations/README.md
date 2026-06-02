# UI additive migrations

Payload auto-update Next.js chỉ được đặt migration cộng thêm schema tại đây.

Cho phép:

- `CREATE TABLE`
- `CREATE INDEX`
- `CREATE UNIQUE INDEX`
- `ALTER TABLE ... ADD COLUMN`

Không dùng `DROP`, `DELETE`, `UPDATE`, đổi tên bảng hoặc đổi tên cột trong payload UI.
Các thay đổi phá vỡ tương thích phải phát hành bằng native installer.
