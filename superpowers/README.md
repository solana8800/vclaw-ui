# VClaw Superpowers

Thư mục này là điểm vào cho Codex khi cần tự phân tích dự án và tiếp tục phát triển dài hơi.

## Thứ tự đọc bắt buộc

1. `AGENTS.md` ở root repo.
2. `KNOWLEDGE_INDEX.md`.
3. `superpowers/CURRENT_TASK.md`.
4. `superpowers/PROJECT_STATE.md`.
5. `superpowers/ROADMAP.md`.
6. `superpowers/RISK_REGISTER.md`.
7. Backlog theo thứ tự `superpowers/backlog/P0.md` → `P1.md` → `P2.md`.
8. Plan liên quan trong `superpowers/plans/`.
9. Runbook kiểm chứng trong `superpowers/runbooks/verification-matrix.md`.

## Cách chọn việc

1. Nếu `CURRENT_TASK.md` có `Status: In Progress`, tiếp tục task đó trước.
2. Nếu `CURRENT_TASK.md` có `Status: Blocked`, đọc blocker rồi chọn task P0 khác có thể làm.
3. Chọn task P0 chưa hoàn thành trước.
4. Nếu P0 bị chặn bởi thiếu thông tin hoặc cần thao tác live, ghi rõ blocker vào plan và chuyển sang P0 kế tiếp.
5. Không tự ý mở rộng scope sang P1/P2 khi P0 vẫn còn việc có thể làm.
6. Mỗi task code phải có plan checklist trong `superpowers/plans/`.
7. Khi tạo plan mới, dùng `superpowers/TASK_TEMPLATE.md`.
8. Khi xong một bước, cập nhật checkbox trong plan ngay.
9. Khi bắt đầu/kết thúc task, cập nhật `superpowers/CURRENT_TASK.md`.

## Quy ước specs/plans

Mọi file trong `superpowers/specs/` và `superpowers/plans/` phải có header:

```md
**Status:** Active | Completed | Historical | Superseded
**Owner:** Codex
**Last reviewed:** YYYY-MM-DD
**Use for:** ...
```

Với plan, thêm `Reference spec` khi có. Không xóa plan đã hoàn thành nếu nó giúp giữ lịch sử thực thi; đặt `Status: Completed` và chuyển việc còn lại sang backlog P0/P1/P2.

## Quy tắc sửa tài liệu

Nếu tài liệu mâu thuẫn với code thật, ưu tiên code đang chạy và tài liệu mới hơn. Cập nhật theo `superpowers/DOC_UPDATE_POLICY.md`, rồi ghi quyết định vào `superpowers/DECISIONS.md` nếu thay đổi ảnh hưởng kiến trúc, packaging, bảo mật hoặc UX chính.

## Vòng lặp tự động

Khi người dùng yêu cầu “tự chạy”, “treo máy”, “tiếp tục hoàn thiện dự án”, dùng `superpowers/runbooks/codex-autonomous-loop.md`.

## Ranh giới an toàn

- Không chạy destructive command.
- Không phát hành public release khi chưa được yêu cầu.
- Không gửi email/tin nhắn/post ra ngoài.
- Không sửa sâu `core/openclaw` nếu làm được ở `vclaw-ui` hoặc `core/extensions/zalouser`.
- Không lưu token/secrets vào docs.

## File vận hành nhanh

- `CURRENT_TASK.md`: task đang làm hoặc blocker hiện tại.
- `TASK_TEMPLATE.md`: mẫu plan/task mới.
- `RISK_REGISTER.md`: rủi ro đã biết để tránh lặp lỗi.
