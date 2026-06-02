# Gateway Version Tooltip and Status Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all three release versions in the sidebar help tooltip and surface gateway/WebAuth state transitions as user-facing notifications.

**Architecture:** Keep the version display logic local to the admin sidebar so the footer remains compact while hover reveals the full release matrix. Add a lightweight gateway status transition detector inside the admin status card so success and failure changes emit toast notifications without changing gateway execution semantics.

**Tech Stack:** Next.js App Router, React client components, `sonner` toast wrapper, existing notification store, existing gateway action APIs.

---

### Task 1: Expand the sidebar tooltip to show the full version matrix

**Files:**
- Create: `vclaw-ui/lib/release/version-labels.ts`
- Modify: `vclaw-ui/components/admin/admin-sidebar-nav.tsx`
- Create: `vclaw-ui/lib/release/version-labels.test.ts`

- [ ] **Step 1: Review the current footer tooltip and version label rendering**

```tsx
// Tooltip hiện tại chỉ hiển thị một dòng version.
// Mục tiêu là thay bằng một khối gọn gồm Native, UI và OpenClaw runtime.
```

- [ ] **Step 2: Update the tooltip content to render three explicit rows**

```tsx
<TooltipContent side="right" sideOffset={12}>
  <div className="space-y-1 text-left">
    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
      Phiên bản
    </div>
    <div className="text-xs">
      <div>Native · {nativeVersionLabel}</div>
      <div>UI · {uiVersionLabel}</div>
      <div>OpenClaw · {runtimeVersionLabel}</div>
    </div>
  </div>
</TooltipContent>
```

- [ ] **Step 3: Keep the compact footer label unchanged when the sidebar is expanded**

```tsx
{(!collapsed || !mounted) && (
  <span className="text-[10px] text-[color:var(--muted)]/45">
    {UI_VERSION_LABEL}
  </span>
)}
```

- [ ] **Step 4: Verify the tooltip helper returns the exact three version rows**

Run: `pnpm exec vitest run vclaw-ui/lib/release/version-labels.test.ts`
Expected: the helper returns Native, UI, and OpenClaw runtime labels in that order.

### Task 2: Emit Gateway Status transition notifications

**Files:**
- Create: `vclaw-ui/lib/openclaw/gateway-status-notifications.ts`
- Modify: `vclaw-ui/components/admin/openclaw-zero-token-status.tsx`
- Create: `vclaw-ui/lib/openclaw/gateway-status-notifications.test.ts`

- [ ] **Step 1: Add a small state transition tracker for the last known gateway status**

```tsx
// Dùng useRef để nhớ trạng thái trước đó và chỉ phát toast khi state đổi thật.
```

- [ ] **Step 2: Fire a warning toast when the gateway moves from success to error**

```tsx
toast.warning("Gateway không ổn định", {
  description:
    "Kết nối vừa chuyển sang lỗi. Mở Gateway Status để onboard WebAuth hoặc restart thủ công.",
});
```

- [ ] **Step 3: Fire a success toast when the gateway recovers from error to success**

```tsx
toast.success("Gateway đã hoạt động trở lại", {
  description: "Kết nối và WebAuth đã sẵn sàng.",
});
```

- [ ] **Step 4: Do not emit notifications for unchanged states**

```tsx
if (prevStatus === nextStatus) return;
```

- [ ] **Step 5: Keep manual refresh and onboarding actions intact**

```tsx
// Không đổi logic restart/onboard hiện có; chỉ thêm lớp thông báo trạng thái.
```

- [ ] **Step 6: Verify the notification helper and status card behavior stay stable**

Run:
```bash
pnpm exec vitest run vclaw-ui/lib/openclaw/gateway-status-notifications.test.ts
pnpm lint
```
Expected: the helper test passes and lint stays green after the notification logic is added.
