# Zalouser Inbound DB Sync Implementation Plan

**Status:** Completed  
**Owner:** Codex  
**Last reviewed:** 2026-04-25  
**Reference spec:** `superpowers/backlog/P0.md` and Zalo requirements in `docs/16-OpenClaw-Gateway-Transport-And-Zalouser-Admin.vi.md`  
**Use for:** Lịch sử triển khai sync hội thoại zalouser vào DB; các bước live verify còn lại nằm trong `superpowers/backlog/P0.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lấy tin nhắn nhận từ kênh `zalouser`, lưu vào `Conversation`/`ConversationMessage`, và cho UI admin load lại từ database.

**Architecture:** Thêm helper ingest riêng cho `zalouser` để chuẩn hóa payload/session message thành conversation row ổn định. Server actions sẽ gọi helper này khi gửi/nhận/sync, còn UI Zalo subscribe Gateway WS để đẩy tin nhận về server action lưu DB khi panel đang mở.

**Tech Stack:** Next.js 16 App Router, Server Actions, Prisma SQLite, OpenClaw Gateway WebSocket, Vitest.

---

### Task 1: Zalouser ingest helper

**Files:**
- Create: `vclaw-ui/lib/zalouser/zalouser-conversation-sync.ts`
- Test: `vclaw-ui/lib/zalouser/zalouser-conversation-sync.test.ts`

- [x] **Step 1: Write failing tests for payload normalization and inbound upsert.**
- [x] **Step 2: Run targeted test and confirm it fails before implementation.**
- [x] **Step 3: Implement minimal helper to normalize target/session payload and upsert inbound/outbound messages.**
- [x] **Step 4: Run targeted test and confirm it passes.**

### Task 2: Server actions and UI bridge

**Files:**
- Modify: `vclaw-ui/lib/zalouser/zalouser-cli-actions.ts`
- Modify: `vclaw-ui/components/admin/zalouser-panel.tsx`
- Modify: `vclaw-ui/lib/channel/conversations-db.ts` if needed

- [x] **Step 1: Use the helper in `sendZalouserMessage` so outbound writes share the same title/session key behavior.**
- [x] **Step 2: Add server action for saving inbound Gateway `session.message` payloads.**
- [x] **Step 3: Subscribe selected Zalo thread to Gateway messages in the panel and call the save action for inbound payloads.**
- [x] **Step 4: Reload message rows from DB after saving inbound/outbound messages.**

### Task 3: Verification

**Files:**
- Existing tests under `vclaw-ui/lib/zalouser`

- [x] **Step 1: Run targeted Vitest for zalouser sync.**
- [x] **Step 2: Run existing zalouser tests.**
- [x] **Step 3: Run broader project tests if feasible.**
- [x] **Step 4: Record any remaining manual verification needed for live Gateway/Zalo.**
