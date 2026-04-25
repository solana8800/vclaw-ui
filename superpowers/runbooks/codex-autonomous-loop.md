# Codex Autonomous Loop

Runbook này dùng khi người dùng yêu cầu Codex tự chạy dài hơi để hoàn thiện dự án.

## Vòng lặp

1. Đọc `AGENTS.md`, `KNOWLEDGE_INDEX.md`, `superpowers/README.md`.
2. Đọc `superpowers/CURRENT_TASK.md`.
3. Nếu có task `In Progress`, tiếp tục task đó; nếu `Blocked`, ghi rõ blocker và chọn task khác có thể làm.
4. Đọc `superpowers/PROJECT_STATE.md`, `superpowers/ROADMAP.md` và `superpowers/RISK_REGISTER.md`.
5. Mở `git status --short`; không revert thay đổi không phải của mình.
6. Chọn task P0 đầu tiên có thể làm từ `superpowers/backlog/P0.md`.
7. Cập nhật `superpowers/CURRENT_TASK.md` sang `In Progress`.
8. Đọc docs liên quan trong `vclaw-ui/docs/` hoặc `docs/`.
9. Nếu docs lệch code thật, cập nhật docs theo `superpowers/DOC_UPDATE_POLICY.md`.
10. Tạo hoặc cập nhật plan trong `superpowers/plans/`; dùng `superpowers/TASK_TEMPLATE.md` nếu tạo mới.
11. Nếu task là code behavior, dùng TDD: test đỏ → code → test xanh.
12. Chạy verification theo `superpowers/runbooks/verification-matrix.md`.
13. Tick checklist trong plan và backlog.
14. Ghi nhật ký ngắn vào `memory/YYYY-MM-DD.md`.
15. Cập nhật `superpowers/CURRENT_TASK.md` về `Idle`, `Blocked`, hoặc `Needs Review`.
16. Lặp lại nếu còn thời gian và không có blocker.

## Dừng lại và hỏi người dùng khi

- Cần token/credential/secrets.
- Cần gửi dữ liệu ra ngoài.
- Cần destructive command.
- Cần phát hành public release.
- Cần chọn trade-off sản phẩm có rủi ro cao.
- Verification live cần thiết nhưng môi trường không có Gateway/Zalo/app đang chạy.

Khi dừng vì blocker, cập nhật `CURRENT_TASK.md`:

```md
**Status:** Blocked
**Task ID:** <id>
...
## Blocker

- ...
```

## Mẫu báo cáo sau mỗi vòng

```text
Đã làm:
- ...

Đã verify:
- ...

Còn lại / blocker:
- ...

Task tiếp theo đề xuất:
- ...
```
