# Document Update Policy

## Khi nào được sửa tài liệu

Codex được sửa tài liệu khi:

1. Code thật mâu thuẫn với docs cũ.
2. Plan cũ chỉ tới file/path không còn tồn tại.
3. Tính năng trong docs không còn hợp lý với kiến trúc hiện tại.
4. Verification cho thấy hướng cũ không chạy được.
5. Người dùng yêu cầu cập nhật tài liệu hoặc muốn Codex tự vận hành theo tài liệu.

## Thứ tự ưu tiên nguồn sự thật

1. Code đang chạy và schema/build script hiện tại.
2. `KNOWLEDGE_INDEX.md`.
3. Public product docs trong `vclaw-ui/docs/`.
4. Private technical docs trong `docs/`.
5. Specs/plans trong `superpowers/`.
6. Memory daily files.

Nếu nguồn thấp hơn mâu thuẫn nguồn cao hơn, cập nhật nguồn thấp hơn hoặc ghi rõ nó là lịch sử.

## Cách sửa

- Giữ nội dung ngắn, cụ thể, có đường dẫn file thật.
- Không ghi secrets/token.
- Không che giấu phần chưa verify live; ghi rõ “cần manual verification”.
- Nếu đổi quyết định kiến trúc, thêm entry vào `superpowers/DECISIONS.md`.
- Nếu đổi thứ tự ưu tiên, cập nhật `superpowers/ROADMAP.md` và backlog tương ứng.

## Không được làm

- Không đổi docs để hợp thức hóa code lỗi.
- Không xóa yêu cầu sản phẩm quan trọng chỉ vì chưa làm được.
- Không sửa public docs theo nội dung private nhạy cảm.
- Không biến docs thành log dài; log raw nằm ở `memory/YYYY-MM-DD.md`.
