# VClaw Roadmap cho Codex

## Nguyên tắc ưu tiên

1. Ưu tiên luồng tạo giá trị thật cho người bán: hội thoại, đơn, thanh toán, ship, lịch hẹn, task inbox.
2. Ưu tiên local-first và human-in-the-loop.
3. Ưu tiên sửa tài liệu lệch thực tế trước khi dựa vào nó để code.
4. Ưu tiên product layer (`vclaw-ui`, `core/extensions/zalouser`) trước khi chỉnh `core/openclaw`.

## P0: Chặn MVP

1. Zalo Personal end-to-end: đăng nhập, danh sách nhóm/peer, nhận/gửi tin, lưu DB, hiển thị hội thoại.
2. Task Inbox thật: tạo task từ hội thoại, duyệt/đóng task, liên kết với order/payment/booking.
3. Payment flow: VietQR, bill evidence, đối soát thủ công có trạng thái rõ.
4. Order flow: tạo đơn, đổi trạng thái, liên kết customer/payment/shipping note.
5. Verification baseline: test/type-check/lint target cho các module đã sửa.

## P1: Hoàn thiện sau P0

1. Shipping quotes GHN/GHTK ở mức cấu hình được và có fallback local.
2. Product/catalog flow dùng được cho shop nhỏ.
3. Customer profile và lịch sử hội thoại/đơn/lịch hẹn.
4. Automation queue có approval guardrail rõ.
5. Packaging installer ổn định và có runbook release.

## P2: Mở rộng

1. Campaign/content assistance.
2. Marketplace-aware workflows như Shopee SKU export/sync.
3. Báo cáo tài chính/hiệu suất nâng cao.
4. Auto-update và release cloud.

## Cách cập nhật roadmap

Khi một P0 hoàn tất, chuyển phần còn lại sang backlog phù hợp hoặc ghi rõ điều kiện live/manual verification còn thiếu.
