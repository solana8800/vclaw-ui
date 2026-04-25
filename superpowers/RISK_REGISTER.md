# Risk Register

Cập nhật file này khi Codex gặp rủi ro lặp lại, blocker môi trường, hoặc quyết định có thể gây sai hướng.

## R-001 — Docs cũ lệch runtime hiện tại

**Status:** Open  
**Impact:** Codex có thể code theo static export hoặc path cũ.  
**Mitigation:** Ưu tiên `superpowers/PROJECT_STATE.md`, `superpowers/DECISIONS.md`, `scripts/package-vclaw.sh` và code hiện tại. Dùng `DOC_UPDATE_POLICY.md` khi sửa docs.

## R-002 — Full lint đang có lỗi tồn tại sẵn

**Status:** Open  
**Impact:** `pnpm lint` không thể dùng làm blocker chung cho mọi task nhỏ.  
**Mitigation:** Với task nhỏ, chạy targeted ESLint trên file đã sửa + TypeScript. Khi task là lint cleanup, đặt mục tiêu giảm số lỗi hoặc pass full lint.

## R-003 — Zalo live verification cần Gateway và tài khoản thật

**Status:** Open  
**Impact:** Test unit/type-check không chứng minh được login QR, nhận tin thật, hoặc Gateway session history hoạt động live.  
**Mitigation:** Backlog P0 giữ các bước manual verify riêng. Nếu live fail, tạo plan sửa theo log lỗi thật.

## R-004 — Gateway build có thể thiếu method `web.login.*`

**Status:** Open  
**Impact:** UI đăng nhập QR không hoạt động dù VClaw UI đúng.  
**Mitigation:** Kiểm tra method availability, đồng bộ `core/openclaw`/plugin `zalouser`, hoặc dùng fallback CLI trên máy chạy Gateway.

## R-005 — Packaging cần máy sạch để xác nhận installer

**Status:** Open  
**Impact:** Build `.pkg` trên máy dev chưa chứng minh postinstall/user-space runtime sạch.  
**Mitigation:** Giữ manual verification trong P0/P1; không tuyên bố release-ready nếu chưa cài thử trên môi trường sạch.

## R-006 — Worktree có thể có thay đổi người dùng

**Status:** Open  
**Impact:** Codex có thể vô tình ghi đè hoặc nhầm lẫn thay đổi không phải của mình.  
**Mitigation:** Luôn chạy `git status --short` trước task. Không revert file không thuộc scope. Nếu file trong scope có thay đổi lạ, đọc kỹ và làm việc cùng thay đổi đó.
