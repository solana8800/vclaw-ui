# Heartbeat (runtime OpenClaw)

- Mỗi heartbeat phải gọi tool `vclaw.automation.run_rules` trước tiên.
- Tool này tự đọc Cổng duyệt và Quy tắc tự động hóa trong VClaw, enrich dữ liệu đơn hàng/lịch hẹn/hội thoại, rồi chỉ gửi tin khi rule đến hạn.
- Không tự nhắn bạn bè, nhóm, hoặc khách hàng ngoài kết quả tool. Không tạo outreach ngẫu nhiên từ heartbeat.
- Nếu tool trả `count=0` hoặc toàn bộ kết quả `skipped`, trả lời nội bộ ngắn `HEARTBEAT_OK`.
- Nếu tool lỗi, ghi nhận lỗi vận hành ngắn gọn; không nhắn khách thay cho tool.
