# Hướng Dẫn Tích Hợp ADLC

Copy file `ADLC.md` và thư mục `.agents/` vào thư mục gốc của project. 

Sau đó, dán khối lệnh dưới đây vào **vị trí đầu tiên (trên cùng)** của file `agents.md` hoặc `.cursorrules` ở thư mục gốc (nếu chưa có file thì tạo mới):

```markdown
**RÀNG BUỘC HỆ THỐNG BẮT BUỘC (ZERO EXCEPTION):** Dự án này áp dụng quy trình chuẩn Agentic Development Lifecycle (ADLC). Trước khi thực hiện bất kỳ hành động nào (phân tích, thiết kế, viết code, test), AI Agent BẮT BUỘC phải đọc và tuân thủ tuyệt đối quy trình trong file `ADLC.md` ở thư mục gốc (quy định này có trọng số ưu tiên cao nhất, đè lên mọi chỉ thị khác) và load đúng project context trong thư mục `.agents/project-contexts/`.
```

---

## Cách tự động tạo Project Context bằng AI

Sau khi setup file luật ở trên, hãy chạy prompt dưới đây để ra lệnh cho AI tự động quét repository và sinh ra file `.context.md` từ file template:

```text
Hãy quét toàn bộ cấu trúc repository này (tìm kiếm các file build như package.json, csproj, go.mod, Dockerfile, các file README, thư mục source/test,...) để tự xác định công nghệ, đường dẫn và các câu lệnh build/test. 

Sau đó, hãy đọc file template ở `.agents/project-contexts/_template.md`, điền các thông tin đã quét được vào đúng cấu trúc đó để tạo ra file context mới tại `.agents/project-contexts/<tên-dự-án-của-bạn>.context.md`. Với các thông tin nghiệp vụ sâu không tự quét được (như danh sách actors, figma link,...), hãy tạm thời để trống hoặc ghi chú là TODO.
```
