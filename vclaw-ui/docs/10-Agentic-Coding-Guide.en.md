# Agentic Coding Guide with OpenClaw

This document provides instructions on using the OpenClaw CLI to automate your development workflow for the VClaw project.

---

## 1. Verify Status
To ensure OpenClaw has correctly identified the VClaw project, run the following command in your terminal:

```bash
# Use the latest build within the project
node core/openclaw/openclaw.mjs agents list
```

You should see the workspace `~/Documents/projects/vclaw/` active.

---

## 2. Issuing Coding Commands (Agentic Commands)

There are two primary ways to request AI-driven coding:

### Option A: Via Terminal (Developer-focused)
Use the `agent` command to send requests directly from your shell.

**Example 1: Adding a new feature**
```bash
node core/openclaw/openclaw.mjs agent --message "VClaw, please add an 'Export Report' button to the Admin Overview Header. This button should log 'Exporting...' to the console."
```

**Example 2: Bug fixes or Refactoring**
```bash
node core/openclaw/openclaw.mjs agent --message "Please check app/[locale]/admin/page.tsx and ensure all console.log statements are translated to Vietnamese according to project rules."
```

### Option B: Via Telegram (Operations-focused)
If the Gateway is running, simply message your configured Telegram Bot.
1. Open Telegram.
2. Find your VClaw Bot.
3. Type: `VClaw, please create a new page at /admin/reports that shows a list of invoices.`

---

## 3. VClaw Coding Rules for AI
OpenClaw is configured to follow VClaw-specific standards:
- **Language**: Comments and Logs must always be in **Vietnamese**.
- **Tech Stack**: Next.js 16, Tailwind CSS, Shadcn/UI, Lucide Icons.
- **i18n**: Always use `next-intl` instead of hardcoded text strings.

---

## 4. Safety Guardrails
Every source code change performed by the AI will:
1. Be executed in a safe workspace context.
2. Send an approval request to the **Task Inbox** on the Admin Console (if configured).
3. Be reviewable via `git diff` before committing any changes.

---

> [!IMPORTANT]  
> If OpenClaw reports a missing API Key error, ensure the `GOOGLE_API_KEY` environment variable is set or you have logged in via `openclaw configure`.
