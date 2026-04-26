# Zero Token VClaw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện khả năng dùng OpenClaw Zero Token trong VClaw theo hướng vận hành được, dễ debug, và không bắt người dùng SMB hiểu token/CDP/OpenClaw internals.

**Architecture:** Giữ Zero Token là một biến thể gateway/OpenClaw chạy ngoài VClaw; VClaw chỉ tích hợp qua env, proxy, WebSocket và admin UX. Ưu tiên hoàn thiện ở `vclaw-ui` và docs/runbook; chỉ chạm `core/openclaw` hoặc fork `openclaw-zero-token` khi phát hiện lệch giao thức hoặc thiếu capability thật sự chặn sản phẩm.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/SQLite, OpenClaw Gateway WS/REST proxy, local env config, docs/runbooks.

---

## 1. Kết luận phân tích

### 1.1 Những gì đã có trong VClaw

- Tài liệu VClaw đã có mục Zero Token trong [docs/13-Technical-Integration-Reference.vi.md](../docs/13-Technical-Integration-Reference.vi.md) và ma trận tương thích ở [docs/14-OpenClaw-Zero-Token-Compatibility.vi.md](../docs/14-OpenClaw-Zero-Token-Compatibility.vi.md).
- Có sample config cho fork ở [vclaw-ui/resources/openclaw.zero-token.sample.json](../vclaw-ui/resources/openclaw.zero-token.sample.json).
- Có health route server-side ở [vclaw-ui/app/api/openclaw-health/route.ts](../vclaw-ui/app/api/openclaw-health/route.ts).
- Browser client hiện đã có:
  - REST proxy qua `/api/gateway/*`
  - WebSocket trực tiếp tới gateway
  - token env `OPENCLAW_GATEWAY_TOKEN` / `NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN`

### 1.2 Những gì repo openclaw-zero-token xác nhận

- Zero Token là fork OpenClaw dùng **browser session / web login** thay cho API key.
- Họ chủ ý gom phần khác biệt vào `src/zero-token/` + các bridge mỏng để giảm xung đột khi sync upstream.
- Họ coi bề mặt tích hợp ổn định là:
  - CLI onboarding / webauth
  - Gateway HTTP/WS
  - Có thể thêm thin HTTP layer sau, nhưng không coi đó là trọng tâm
- Browser mode hiện tại chủ đạo vẫn là **Chrome CDP attach**; “reuse browser thật” chỉ là hướng tối ưu, chưa phải mặc định ổn định.

### 1.3 Khoảng trống hiện tại của VClaw

- Chưa có “surface sản phẩm” riêng cho Zero Token trong admin:
  - chưa có status chi tiết theo mode upstream vs zero-token
  - chưa có checklist env/config ngay trong UI
  - chưa có kiểm tra tương thích handshake WS / health / model list
  - chưa có cảnh báo session web hết hạn / cần onboard lại
  - chưa có chọn model web hoặc xác nhận gateway đang dùng model `*-web/*`
- Chưa có runbook tích hợp khép kín theo góc nhìn VClaw operator.
- Chưa có test matrix riêng cho “gateway thường” vs “zero-token gateway”.

### 1.4 Quyết định phạm vi

- **P1:** hoàn thiện lớp VClaw product/integration trước.
- **P2:** chỉ mở nhánh công việc sang fork `openclaw-zero-token` nếu trong P1 phát hiện:
  - handshake WS không tương thích với client hiện tại
  - `/health` hoặc capability discovery không đủ để VClaw phân biệt mode
  - thiếu endpoint/metadata để biết model web đang active hoặc auth web đã hết hạn

---

## 2. Target State

Sau khi hoàn tất plan này, VClaw phải đạt:

1. Admin biết rõ đang nói chuyện với gateway upstream hay gateway Zero Token.
2. Admin thấy gateway có reachable không, WS có authenticate được không, model active là gì.
3. Khi Zero Token chưa sẵn sàng, UI chỉ ra đúng lỗi: sai URL, sai token gateway, WS URL sai, chưa onboard webauth, session web expired, model web chưa được cấu hình.
4. Runbook nội bộ đủ để dựng môi trường dev/test không cần đọc rải rác nhiều file.
5. Có smoke test tối thiểu cho cả đường REST health, proxy auth header, WS connect, và detection mode.

---

## 3. Phased Plan

### Phase A: Chuẩn hoá detection + health cho Zero Token trong VClaw

**Mục tiêu:** VClaw đọc được trạng thái gateway theo ngôn ngữ sản phẩm, không chỉ `{ ok, status, baseUrl }`.

**Files dự kiến:**

- Modify: `vclaw-ui/app/api/openclaw-health/route.ts`
- Create: `vclaw-ui/lib/openclaw/zero-token-health.ts`
- Create: `vclaw-ui/lib/openclaw/zero-token-health.test.ts`
- Modify: `vclaw-ui/lib/gateway/server.ts`
- Modify: `vclaw-ui/lib/gateway/client.ts`

**Việc cần làm:**

- [x] Bổ sung parser/normalizer cho health response, cố gắng phân loại:
  - `mode: "upstream" | "zero-token" | "unknown"`
  - `reachable`
  - `authConfigured`
  - `wsExpectedUrl`
  - `restBaseUrl`
- [x] Nếu `/health` không đủ thông tin, thử thêm non-invasive capability probe:
  - một request read-only để biết gateway có trả metadata model/provider không
  - không dựa vào behavior mong manh của HTML hay endpoint private
- [x] Trả về JSON chi tiết hơn từ `/api/openclaw-health` để admin UI dùng trực tiếp.
- [x] Viết unit test cho normalization và failure classification:
  - gateway down
  - 401/403 do token sai
  - 200 OK nhưng mode unknown
  - zero-token-looking model/provider ids

**Tiêu chí xong:**

- `/api/openclaw-health` không chỉ báo “sống/chết” mà báo được “sống nhưng chưa usable cho Zero Token”.

---

### Phase B: Admin UX cho Zero Token readiness

**Mục tiêu:** Có một vùng admin hiển thị readiness Zero Token rõ ràng, không bắt user đọc docs trước.

**Files dự kiến:**

- Modify: `vclaw-ui/components/admin/ai-chat-assistant.tsx`
- Modify: `vclaw-ui/components/admin/admin-page-view.tsx`
- Create: `vclaw-ui/components/admin/openclaw-zero-token-status.tsx`
- Create: `vclaw-ui/components/admin/openclaw-zero-token-status.test.tsx`
- Modify: `vclaw-ui/lib/admin/content.ts`
- Modify: `vclaw-ui/messages/vi/admin.json`
- Modify: `vclaw-ui/messages/en/admin.json`

**Việc cần làm:**

- [x] Thêm card/banner “OpenClaw / Zero Token readiness” vào admin surface phù hợp.
- [x] Hiển thị tối thiểu:
  - REST base URL
  - WS URL thực tế
  - mode phát hiện được
  - token env có/không
  - health status
  - model/provider hiện tại nếu đọc được
- [x] Thêm thông điệp hành động rõ:
  - “Gateway chưa chạy”
  - “Sai token gateway”
  - “Chưa onboard webauth”
  - “Model mặc định chưa là `*-web/*`”
- [x] Không lộ secret/token thật ra UI; chỉ hiển thị presence + masked info nếu cần.
- [x] Viết test render cho các state quan trọng.

**Tiêu chí xong:**

- Một operator mở admin là biết ngay Zero Token fail ở lớp nào.

---

### Phase C: Cấu hình và runbook khép kín cho dev/operator

**Mục tiêu:** Một người mới có thể bật Zero Token cho VClaw bằng một checklist duy nhất.

**Files dự kiến:**

- Modify: `docs/13-Technical-Integration-Reference.vi.md`
- Modify: `docs/14-OpenClaw-Zero-Token-Compatibility.vi.md`
- Create: `docs/17-VClaw-Zero-Token-Onboarding.vi.md`
- Modify: `vclaw-ui/resources/openclaw.zero-token.sample.json`
- Modify: `README.md` hoặc `superpowers/PROJECT_STATE.md` nếu cần link

**Việc cần làm:**

- [x] Viết runbook riêng cho VClaw + Zero Token:
  - chuẩn bị Chrome debug
  - chạy `webauth`
  - set env cho VClaw
  - verify REST health
  - verify WS
  - verify model
  - verify chat admin
- [x] Tách rõ:
  - việc làm ở máy chạy `openclaw-zero-token`
  - việc làm ở VClaw `.env.local`
  - dấu hiệu session web hết hạn
- [x] Cập nhật sample config để có nhiều provider web mẫu hơn, không chỉ `deepseek-web`.
- [x] Thêm mục “không commit auth/token/cookies”.

**Tiêu chí xong:**

- Không cần đọc cả repo ngoài để vận hành Zero Token với VClaw.

---

### Phase D: Model/config verification cho chat

**Mục tiêu:** Chat admin không silently dùng sai model hoặc sai gateway mode.

**Files dự kiến:**

- Modify: `vclaw-ui/components/admin/ai-chat-assistant.tsx`
- Create: `vclaw-ui/lib/openclaw/zero-token-model-detection.ts`
- Create: `vclaw-ui/lib/openclaw/zero-token-model-detection.test.ts`
- Modify: `vclaw-ui/app/api/openclaw-health/route.ts`

**Việc cần làm:**

- [x] Tìm bề mặt read-only ổn định để xác nhận model/provider hiện tại.
- [x] Nếu model không phải `*-web/*`, hiển thị warning “gateway đang chạy nhưng chưa ở mode zero-token model”.
- [x] Nếu chat admin đang mở mà gateway health degrade, banner chuyển sang trạng thái warning thay vì chỉ fail lúc gửi message.
- [x] Nếu có thể đọc supported model list, gợi ý model id chuẩn trong UI/runbook.

**Tiêu chí xong:**

- Operator không còn nhầm “gateway chạy được” với “Zero Token sẵn sàng thật”.

---

### Phase E: Smoke/integration matrix

**Mục tiêu:** Có kiểm tra hồi quy cho hai mode gateway chính.

**Files dự kiến:**

- Create: `vclaw-ui/app/api/openclaw-health/route.test.ts`
- Create: `vclaw-ui/lib/gateway/env.test.ts`
- Create: `superpowers/runbooks/zero-token-verification-matrix.md`

**Việc cần làm:**

- [x] Viết test cho:
  - inject `X-Gateway-Token` server-side
  - fallback env logic
  - health route classification
- [x] Viết verification matrix thủ công:
  - upstream gateway on default port
  - zero-token gateway on custom port
  - wrong token
  - wrong WS URL
  - webauth chưa chạy
  - web session expired

**Tiêu chí xong:**

- Mỗi lần nâng `core/openclaw` hoặc đổi fork zero-token đều có checklist xác minh cụ thể.

---

## 4. Risks và cách xử lý

### Risk 1: Giao thức WS giữa fork và client hiện tại lệch nhau

**Dấu hiệu:** `/health` ok nhưng `connect.challenge/connect` fail, hoặc subscribe/sessions không hoạt động.

**Xử lý:** Tách riêng một task điều tra giao thức; chỉ khi xác nhận lệch thực sự mới sửa `vclaw-ui/lib/gateway/client.ts` hoặc fork.

### Risk 2: Fork không expose đủ metadata để detect mode/model

**Dấu hiệu:** chỉ biết gateway sống, không biết có phải Zero Token hay model web không.

**Xử lý:** ưu tiên heuristic an toàn từ config/model ids; nếu vẫn không đủ, đề xuất thêm endpoint/capability nhỏ ở fork thay vì hack bằng parsing UI.

### Risk 3: Session web hết hạn nhưng health vẫn xanh

**Dấu hiệu:** health ok, WS ok, nhưng khi chat thì provider trả auth expired.

**Xử lý:** trong Phase B/D phải map lỗi provider sang message vận hành: “cần chạy lại webauth / đăng nhập lại browser”.

### Risk 4: Lệch trách nhiệm giữa VClaw và fork

**Dấu hiệu:** định nhét onboarding Chrome vào VClaw UI.

**Xử lý:** không làm ở giai đoạn này. VClaw chỉ hướng dẫn, verify, và chẩn đoán; onboarding browser vẫn thuộc tiến trình/fork Zero Token.

---

## 5. Explicit Non-Goals

- Không đưa Chrome/CDP/onboard browser automation trực tiếp vào `vclaw-ui`.
- Không thay thế Gateway WS bằng một API mới nếu chưa bị chặn kỹ thuật.
- Không deep fork `core/openclaw` chỉ để “trông native hơn”.
- Không hiển thị secrets/token thật trong UI.

---

## 6. Recommended Execution Order

1. Phase A
2. Phase B
3. Phase C
4. Phase D
5. Phase E
6. Chỉ sau đó mới mở spike cho patch bên `openclaw-zero-token` nếu còn blocker thực

---

## 7. Source Notes

- VClaw docs nội bộ:
  - `docs/13-Technical-Integration-Reference.vi.md`
  - `docs/14-OpenClaw-Zero-Token-Compatibility.vi.md`
  - `vclaw-ui/resources/openclaw.zero-token.sample.json`
  - `vclaw-ui/app/api/openclaw-health/route.ts`
- openclaw-zero-token:
  - README
  - `docs/zero-token/zero-token-requirements.md`
  - `docs/zero-token/upstream-sync.md`
  - `docs/zero-token/web-models-browser-modes.md`
  - `docs/zero-token/web-models-support.md`
