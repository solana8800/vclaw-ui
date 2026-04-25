# Task / Plan Template

Dùng template này khi tạo plan mới trong `superpowers/plans/`.

```md
# <Task Name> Implementation Plan

**Status:** Active
**Owner:** Codex
**Last reviewed:** YYYY-MM-DD
**Reference spec:** `<path>` hoặc `None`
**Backlog task:** `<P0/P1/P2-ID>`
**Use for:** Mô tả ngắn plan này dùng để làm gì.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một câu mô tả kết quả cần đạt.

**Architecture:** 2-3 câu mô tả cách làm.

**Tech Stack:** Công nghệ/thư viện liên quan.

---

## Scope

### In scope

- ...

### Out of scope

- ...

## Files

- Create: `path/to/new-file`
- Modify: `path/to/existing-file`
- Test: `path/to/test-file`

## Tasks

### Task 1: ...

- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...

## Verification

```bash
cd vclaw-ui
pnpm tsc --noEmit --ignoreDeprecations 6.0
```

Expected: exit code 0.

## Manual verification

- [ ] ...

## Done criteria

- [ ] Code/docs thay đổi đúng scope.
- [ ] Checklist trong plan đã tick.
- [ ] Backlog task đã tick hoặc ghi rõ blocker.
- [ ] `memory/YYYY-MM-DD.md` đã cập nhật.
- [ ] `superpowers/CURRENT_TASK.md` đã đưa về `Idle` hoặc `Blocked`.
```
