# Hướng Dẫn Tích Hợp ADLC & Cấu Hình Swarm Agent (SETUP_GUIDE)

Tài liệu này hướng dẫn chi tiết cách thiết lập quy trình chuẩn Agentic Development Lifecycle (ADLC) và cấu hình **ClawTeam Swarm Agent** cho dự án.

---

## PHẦN 1: TÍCH HỢP QUY TRÌNH ADLC

### 1.1 Khởi tạo quy tắc ràng buộc (Rules setup)
Dán khối lệnh ràng buộc dưới đây vào **vị trí đầu tiên (trên cùng)** của file `AGENTS.md` hoặc `.cursorrules` ở thư mục gốc của dự án (nếu chưa có thì tạo mới):

```markdown
**RÀNG BUỘC HỆ THỐNG BẮT BUỘC (ZERO EXCEPTION):** Dự án này áp dụng quy trình chuẩn Agentic Development Lifecycle (ADLC). Trước khi thực hiện bất kỳ hành động nào (phân tích, thiết kế, viết code, test), AI Agent BẮT BUỘC phải đọc và tuân thủ tuyệt đối quy trình trong file `ADLC.md` ở thư mục gốc (quy định này có trọng số ưu tiên cao nhất, đè lên mọi chỉ thị khác) và load đúng project context trong thư mục `.agents/project-contexts/`.
```

### 1.2 Cách tự động tạo Project Context bằng AI
Sau khi thiết lập file luật ở trên, hãy chạy prompt dưới đây để ra lệnh cho AI tự động quét repository và sinh ra file `.context.md` từ file template:

```text
Hãy quét toàn bộ cấu trúc repository này (tìm kiếm các file build như package.json, csproj, go.mod, Dockerfile, các file README, thư mục source/test,...) để tự xác định công nghệ, đường dẫn và các câu lệnh build/test. 

Sau đó, hãy đọc file template ở `.agents/project-contexts/_template.md`, điền các thông tin đã quét được vào đúng cấu trúc đó để tạo ra file context mới tại `.agents/project-contexts/<tên-dự-án-của-bạn>.context.md`. Với các thông tin nghiệp vụ sâu không tự quét được (như danh sách actors, figma link,...), hãy tạm thời để trống hoặc ghi chú là TODO.
```

---

## PHẦN 2: THIẾT LẬP CLAWTEAM SWARM AGENT

Để tự động hóa toàn bộ quy trình phát triển phần mềm (SDLC/ADLC) thông qua nhóm Swarm Agent tự điều phối ngầm bằng **Codex** hoặc **Claude Code**:

### 2.1 Cài đặt symlink (Chỉ cần làm 1 lần từ thư mục root của dự án)

#### Bước 2.1.1: Đăng ký cấu trúc Swarm Team
Liên kết tệp cấu hình [swarm-team.toml](./orchestration/swarm-team.toml) của dự án vào templates của ClawTeam CLI:
```bash
mkdir -p ~/.clawteam/templates
rm -f ~/.clawteam/templates/swarm-team.toml
ln -sf "$(pwd)/.agents/orchestration/swarm-team.toml" ~/.clawteam/templates/swarm-team.toml
```

#### Bước 2.1.2: Đăng ký Skill cho Agent
Liên kết thư mục skill của dự án vào thư mục global của Agent bạn đang sử dụng:

- **Dành cho Codex**:
  ```bash
  mkdir -p ~/.codex/skills
  rm -rf ~/.codex/skills/clawteam
  ln -sf "$(pwd)/.agents/skills/clawteam" ~/.codex/skills/clawteam
  ```
- **Dành cho Claude Code**:
  ```bash
  mkdir -p ~/.claude/skills
  rm -rf ~/.claude/skills/clawteam
  ln -sf "$(pwd)/.agents/skills/clawteam" ~/.claude/skills/clawteam
  ```

### 2.2 Cách sử dụng bằng ngôn ngữ tự nhiên
Khi trò chuyện với Agent (Codex hoặc Claude Code), bạn chỉ cần dùng prompt có từ khóa gọi skill `$clawteam` và chỉ định chạy template `swarm-team` của dự án:

**Prompt mẫu:**
> *"Hãy dùng $clawteam với template **swarm-team** để giải quyết task: [Mô_Tả_Nhiệm_Vụ_Của_Bạn]"*

*Codex sẽ tự động đọc cấu hình team, phân công công việc, khởi chạy các sub-agents, gửi nhận tin nhắn nội bộ và tự xử lý toàn bộ quy trình bên dưới.*

### 2.3 Giám sát Swarm Agent đang chạy

#### Cách 2.3.1: Theo dõi qua Web UI Dashboard
Bật máy chủ Web cục bộ hiển thị Kanban Board và logs chi tiết:
```bash
clawteam board serve --port 8080
```
Sau đó mở trình duyệt truy cập địa chỉ: `http://127.0.0.1:8080` để xem trực quan.

#### Cách 2.3.2: Theo dõi qua Terminal (Tmux split view)
Ghép terminal của tất cả các Agent con đang chạy ngầm vào một màn hình split để xem trực tiếp:
```bash
clawteam board attach [tên-team-của-bạn]
```
*(Để thoát màn hình giám sát tmux mà không làm dừng agent, nhấn tổ hợp phím `Ctrl + B` rồi nhấn tiếp phím `D`)*
