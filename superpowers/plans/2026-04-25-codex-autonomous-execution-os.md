# Codex Autonomous Execution OS Implementation Plan

**Status:** Completed  
**Owner:** Codex  
**Last reviewed:** 2026-04-25  
**Reference spec:** `superpowers/specs/2026-04-25-codex-autonomous-execution-os.vi.md`  
**Use for:** Lịch sử triển khai bộ điều phối `superpowers/`; không dùng làm backlog active.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tổ chức lại `superpowers/` thành entrypoint rõ ràng để Codex có thể tự phân tích, chọn việc, cập nhật docs hợp lý, triển khai và verify theo vòng lặp dài hơi.

**Architecture:** Thêm một lớp tài liệu vận hành trong `superpowers/` gồm project state, roadmap, backlog, decisions, doc update policy và runbooks. Các docs này tham chiếu tài liệu public/private hiện có thay vì nhân bản toàn bộ nội dung.

**Tech Stack:** Markdown, Codex skills, Next.js/Vitest/TypeScript verification commands.

---

### Task 1: Agentic entrypoint

**Files:**
- Create: `superpowers/README.md`
- Create: `superpowers/PROJECT_STATE.md`
- Create: `superpowers/ROADMAP.md`
- Create: `superpowers/DECISIONS.md`
- Create: `superpowers/DOC_UPDATE_POLICY.md`

- [x] **Step 1: Create a README that tells Codex what to read and how to choose work.**
- [x] **Step 2: Capture the current code state in PROJECT_STATE.**
- [x] **Step 3: Define roadmap order and decision log.**
- [x] **Step 4: Define document update policy for stale or unreasonable docs.**

### Task 2: Backlog and runbooks

**Files:**
- Create: `superpowers/backlog/P0.md`
- Create: `superpowers/backlog/P1.md`
- Create: `superpowers/backlog/P2.md`
- Create: `superpowers/runbooks/codex-autonomous-loop.md`
- Create: `superpowers/runbooks/verification-matrix.md`

- [x] **Step 1: Create priority backlog files with concrete tasks.**
- [x] **Step 2: Create the Codex autonomous loop runbook.**
- [x] **Step 3: Create verification matrix for docs, UI, gateway, packaging and DB tasks.**

### Task 3: Align existing plan and index

**Files:**
- Modify: `superpowers/plans/2026-04-16-vclaw-packaging-web-adapters.md`
- Modify: `KNOWLEDGE_INDEX.md`
- Modify: `memory/2026-04-25.md`

- [x] **Step 1: Update old packaging plan so it matches Next standalone + macOS pkg.**
- [x] **Step 2: Add new superpowers files to knowledge index.**
- [x] **Step 3: Record this maintenance in daily memory.**

### Task 4: Verification

**Files:**
- All files under `superpowers/`

- [x] **Step 1: List the resulting `superpowers/` tree.**
- [x] **Step 2: Scan for stale terms that would mislead future Codex runs.**
- [x] **Step 3: Confirm no runtime code was modified by this task.**
