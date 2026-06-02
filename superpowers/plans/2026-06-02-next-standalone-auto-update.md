# Next Standalone Auto-update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tự tải và áp dụng payload Next.js standalone từ GitHub Releases mà không cần cài lại native app.

**Architecture:** Module updater CommonJS độc lập quản lý manifest, SHA-256, ZIP staging và active state. Launcher chọn payload active khi startup, fallback bundle khi lỗi và giao tiếp với Electron shell để hỏi restart.

**Tech Stack:** Node.js CommonJS, Electron IPC, GitHub Releases, SHA-256, ZIP, Node test runner.

---

### Task 1: Module updater

**Files:**
- Create: `vclaw-ui/launcher/ui-updater.cjs`
- Test: `vclaw-ui/launcher/ui-updater.node-test.cjs`

- [x] Viết test fail cho semver, manifest, checksum, staging và state.
- [x] Chạy `node --test launcher/ui-updater.node-test.cjs` để xác nhận RED.
- [x] Implement module updater tối thiểu.
- [x] Chạy lại test để xác nhận GREEN.

### Task 2: Launcher lifecycle

**Files:**
- Modify: `vclaw-ui/launcher/main.js`
- Modify: `vclaw-ui/launcher/electron-main.cjs`
- Modify: `vclaw-ui/launcher/electron-preload.cjs`
- Test: `vclaw-ui/launcher/ui-updater.node-test.cjs`

- [x] Thêm test fail cho resolve active payload và fallback.
- [x] Nối active payload vào `getServerScript()`.
- [x] Nối tải nền, prompt Electron và restart sau xác nhận.
- [x] Chạy test launcher.

### Task 3: Release payload script

**Files:**
- Create: `scripts/package-vclaw-ui-update.mjs`
- Create: `scripts/package-vclaw-ui-update.test.mjs`
- Modify: `scripts/PACKAGING.md`

- [x] Viết test fail cho ZIP, checksum và manifest.
- [x] Implement script release.
- [x] Chạy `node --test scripts/package-vclaw-ui-update.test.mjs`.
- [x] Cập nhật tài liệu release.

### Task 4: Verification

- [x] Chạy `node --test vclaw-ui/launcher/ui-updater.node-test.cjs scripts/package-vclaw-ui-update.test.mjs`.
- [x] Chạy `cd vclaw-ui && pnpm test` (suite baseline còn lỗi fixture/module cũ, ghi rõ trong báo cáo).
- [x] Chạy `cd vclaw-ui && pnpm lint`.
- [x] Chạy `cd vclaw-ui && pnpm build`.

### Task 5: Hiển thị phiên bản giao diện trong sidebar

**Files:**
- Create: `vclaw-ui/release-versions.json`
- Create: `vclaw-ui/lib/release/ui-version.ts`
- Test: `vclaw-ui/lib/release/ui-version.test.ts`
- Modify: `vclaw-ui/components/admin/admin-sidebar-nav.tsx`

- [x] Viết test fail cho nhãn `v0.1.1`.
- [x] Tạo nguồn version riêng và helper định dạng tối thiểu.
- [x] Hiển thị nhãn cạnh dấu hỏi, giữ version trong tooltip khi sidebar thu gọn.
- [x] Chạy focused test, lint và build.

### Task 6: OpenClaw runtime auto-update

**Files:**
- Create: `vclaw-ui/launcher/runtime-updater.cjs`
- Test: `vclaw-ui/launcher/runtime-updater.node-test.cjs`
- Modify: `vclaw-ui/launcher/main.js`

- [x] Viết test fail cho manifest runtime, SHA-256, staging swap và rollback.
- [x] Implement module runtime updater độc lập.
- [x] Nối launcher tải nền, dừng gateway, swap runtime và khởi động lại gateway.
- [x] Chạy focused test runtime.

### Task 7: Runtime release và helper upload đa nền tảng

**Files:**
- Create: `scripts/package-vclaw-openclaw-runtime.mjs`
- Test: `scripts/package-vclaw-openclaw-runtime.test.mjs`
- Create: `scripts/release-vclaw.mjs`
- Test: `scripts/release-vclaw.test.mjs`

- [x] Viết test fail cho tarball runtime, manifest SHA-256 và lệnh upload.
- [x] Implement script đóng gói runtime.
- [x] Implement helper prompt ngắn, hỗ trợ flags cho macOS và Windows.
- [x] Chạy focused test release.

### Task 8: Đồng bộ tài liệu và verification

**Files:**
- Modify: `scripts/PACKAGING.md`
- Modify: `docs/10-Product-Packaging-And-Release.vi.md`
- Modify: `docs/10-Product-Packaging-And-Release.en.md`

- [x] Chuẩn hóa policy `uiVersion`, `openclawRuntime.version`, `nativeVersion`.
- [x] Ghi lệnh helper cho UI-only, runtime-only và native release.
- [x] Chạy focused tests, lint, build và `git diff --check`.
