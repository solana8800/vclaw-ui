# Đặc tả: Codex Autonomous Execution OS cho VClaw

**Status:** Active  
**Owner:** Codex  
**Last reviewed:** 2026-04-25  
**Use for:** Quy trình agentic tổng thể, backlog, plan, verification và cập nhật tài liệu.

## Mục tiêu

Biến thư mục `superpowers/` thành hệ điều phối công việc cho Codex khi làm việc dài hơi trên VClaw: tự đọc dự án, chọn việc ưu tiên, cập nhật tài liệu sai, thực thi theo plan, kiểm chứng, và ghi lại trạng thái cho phiên sau.

## Phạm vi

Hệ này quản lý quy trình agentic, không thay thế source-of-truth nghiệp vụ trong `vclaw-ui/docs/` hoặc tài liệu kỹ thuật private trong `docs/`.

Nó phải trả lời được các câu hỏi sau cho một phiên Codex mới:

1. Dự án thật đang ở trạng thái nào?
2. Việc nào nên làm tiếp?
3. Tài liệu nào cần đọc trước khi sửa module đó?
4. Khi tài liệu lệch code thật thì được sửa theo luật nào?
5. Làm xong phải chạy lệnh kiểm chứng nào?
6. Ghi tiến độ ở đâu để phiên sau nối tiếp được?

## Kiến trúc thư mục

```text
superpowers/
  README.md
  PROJECT_STATE.md
  ROADMAP.md
  DECISIONS.md
  DOC_UPDATE_POLICY.md
  specs/
  plans/
  backlog/
    P0.md
    P1.md
    P2.md
  runbooks/
    codex-autonomous-loop.md
    verification-matrix.md
```

## Quy tắc vận hành

1. Codex phải đọc `superpowers/README.md` trước khi tự chọn việc.
2. `PROJECT_STATE.md` mô tả trạng thái thật của code hiện tại; nếu mâu thuẫn với tài liệu cũ, trạng thái thật và code đang chạy được ưu tiên.
3. `ROADMAP.md` chỉ định thứ tự ưu tiên cấp module; backlog chia P0/P1/P2 để tránh tự ý ôm scope quá rộng.
4. Mỗi việc lớn phải có plan trong `superpowers/plans/` với checkbox. Khi hoàn thành bước nào, đổi `- [ ]` thành `- [x]`.
5. Khi phát hiện tài liệu sai hoặc feature bất hợp lý, Codex được cập nhật tài liệu nếu có bằng chứng từ code, test hoặc tài liệu source-of-truth mới hơn. Mọi thay đổi chính sách/kiến trúc phải ghi vào `DECISIONS.md`.
6. Không phát hành public, gửi email, đăng bài, chạy destructive command, hoặc chỉnh sâu `core/openclaw` nếu có thể giải quyết ở product layer.
7. Mọi thay đổi code phải có kiểm chứng phù hợp trong `runbooks/verification-matrix.md`.

## Thành công

Một phiên Codex mới có thể bắt đầu từ `superpowers/README.md`, chọn một task P0, tạo hoặc cập nhật plan, sửa code/tài liệu, chạy kiểm chứng, và để lại checklist rõ ràng mà không cần hỏi lại các thông tin nền tảng đã có trong repo.
