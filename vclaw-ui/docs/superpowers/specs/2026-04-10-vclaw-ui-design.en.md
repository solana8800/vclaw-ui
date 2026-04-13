# VClaw UI Design Spec

## Goal

Build `vclaw-ui` into a complete product website that can be deployed to Vercel, including:

1. A marketing landing page for VClaw.
2. A documentation page rendering markdown UI from existing project docs.
3. An admin/onboarding shell ready for real API integration in future iterations.

## Product Intent

`vclaw-ui` must accurately reflect the product positioning described in `docs/`:

1. VClaw is a local-first operations and commerce assistant for Vietnamese SMBs.
2. OpenClaw is the execution substrate at the foundation layer.
3. The web admin is the primary surface for non-technical operators.
4. Docs are the public surface for reading BRDs, architecture, implementation plans, and technical blueprints.

## Scope

### In Scope

1. Create a new `vclaw-ui` app, independent of `langeval-ui`.
2. Use the `docs/` directory as the source of truth for product documentation.
3. A complete landing page with product narrative, sections, CTAs, and links to docs/admin.
4. Docs viewer routes `/docs` and `/docs/[...slug]`, rendering markdown with a custom UI.
5. Admin shell routes under `/admin` and core sub-routes using mock/local state.
6. Successful build in the Vercel environment.

### Out of Scope

1. Real backend API.
2. Production authentication.
3. Server-side data persistence.
4. Real integration with the OpenClaw runtime.
5. Complex CMS or documentation pipelines.

## Architectural Decision

The chosen direction is to create a new Next.js app in `vclaw-ui`, selectively referencing good patterns from `langeval-ui`:

1. Marketing page structure.
2. Markdown rendering and docs route.
3. Dashboard shell pattern.

Do not copy the entire `langeval-ui` app, as it would bring too many unrelated screens and logic. Instead:

1. Only take ideas for routes, components, and visual rhythm.
2. Organize the new app under the `VClaw` brand.
3. Optimize for a clean build, easy deployment, and future backend integration.

## Information Architecture

### Public Surface

1. `/`
2. `/docs`
3. `/docs/[...slug]`

### Product Surface

1. `/admin`
2. `/admin/onboarding`
3. `/admin/inbox`
4. `/admin/customers`
5. `/admin/orders`
6. `/admin/payments`
7. `/admin/bookings`
8. `/admin/integrations`
9. `/admin/automation`
10. `/admin/settings`

## File and Data Layout

### Repository Layout

1. `docs/`: Source of truth for all markdown documentation.
2. `vclaw-ui/`: New Next.js app.
3. `langeval-ui/`: For code reference only, not a runtime for VClaw UI.

### VClaw UI Internal Layout

Inside `vclaw-ui`, divide into the following groups:

1. `app/`: Landing, docs, and admin routes.
2. `components/marketing/`: Landing page sections.
3. `components/docs/`: Docs sidebar, TOC, and markdown wrappers.
4. `components/admin/`: Admin layout, cards, widgets, tables, and workflow blocks.
5. `lib/docs/`: Docs scanning, slug parsing, navigation grouping, and markdown reading.
6. `lib/mock/`: Mock data for admin pages.
7. `lib/types/`: Type definitions for docs and admin entities.

## Docs Strategy

### Source of Truth

The `docs/` directory is the canonical source for documentation. `vclaw-ui` reads markdown files directly from `../docs`.

### Docs Rendering

The docs viewer must support:

1. Sidebar navigation.
2. Docs index page.
3. Breadcrumbs.
4. Previous/next navigation.
5. Markdown renderer with `table`, `code`, `blockquote`, and `links`.
6. `mermaid` support if used in the documentation.

### Grouping

In the initial phase, docs will be grouped simply:

1. Product docs.
2. Architecture and implementation docs.

Metadata like `frontmatter` will not be added in this cycle; navigation will be generated from filenames and folder structure. If metadata is needed, it will be handled in a separate expansion cycle.

## Landing Page Content Model

The landing page must read like a real product site, not just a mockup. Sections should include:

1. Hero section:
   - VClaw as a local-first operations and commerce assistant.
   - CTA to docs.
   - CTA to admin demo shell.
2. Problem section:
   - Fragmented chat.
   - Manual bill verification.
   - Time-consuming QR generation and reminders.
3. Core capability section:
   - VietQR.
   - Bill verification.
   - Address normalization.
   - Bookings/reminders.
   - Commerce support.
4. Product surfaces section:
   - Local Web Admin.
   - Remote Access.
   - Chat-native Admin.
5. Workflow section:
   - Lead -> Chat -> Payment -> Order/Booking -> Follow-up.
6. Trust and architecture section:
   - Built on OpenClaw.
   - Controlled product fork.
   - Local-first safety.
7. Final CTA section:
   - Read docs.
   - Open admin shell.

## Admin Shell Design

The admin shell in this cycle is `frontend-ready`, meaning:

1. Complete routing.
2. Production-friendly layout.
3. Mock data for demoing and testing flows.
4. Clear component boundaries so future API integration does not require rewrites.

### Admin Sections

1. Dashboard overview:
   - KPIs.
   - Pending tasks.
   - Recent activities.
2. Onboarding wizard:
   - Channel selection.
   - Payment setup.
   - Delivery setup.
   - Service/booking setup.
   - Review.
3. Inbox:
   - Incoming conversations.
   - Lead status.
4. Customers:
   - Customer records.
   - Tags.
   - Activity history.
5. Orders:
   - Order-like workflow states.
6. Payments:
   - QR generation.
   - Bill verification review.
7. Bookings:
   - Appointment list.
   - Reminders.
8. Integrations:
   - Channels.
   - Payment.
   - Delivery.
9. Automation:
   - Templates.
   - Rules.
   - Follow-up policies.
10. Settings:
    - Workspace-level preferences.

## Design System Direction

Visual direction should:

1. Reference the modern rhythm of `langeval-ui`.
2. Use the same design language for landing, docs, and admin.
3. Use a dark marketing surface for the landing page and a clean, readable surface for docs/admin.
4. Emphasize clarity, trust, and operator UX.

A pixel-perfect product dashboard is not required, but it must look like a real product.

## Vercel Deployment Requirements

To ensure deployment on Vercel:

1. `vclaw-ui` must be a standalone building Next.js app.
2. No dependency on separate local runtimes or custom servers.
3. Read markdown using the file system on the Next.js server-side runtime.
4. No dependency on binaries or build steps outside Vercel's capabilities.
5. A clear `package.json` with `dev`, `build`, `start`, and `lint` scripts.

If Vercel does not allow reading files outside the app root in a specific configuration, fallback by copying `docs/` into the app during the build step. However, the default plan remains reading directly from repo-level docs to maintain a single source of truth.

## Testing and Verification

Minimum verification required:

1. Successful app build.
2. Docs routing works with real markdown files.
3. Landing page renders correctly.
4. Admin shell routes render correctly with mock data.
5. No broken doc links after consolidating documents into `docs/`.

## Implementation Order

A logical order to reduce risk:

1. Ensure the `docs/` directory contains the complete VClaw documentation set.
2. Scaffold `vclaw-ui`.
3. Create docs loading and docs routes.
4. Create core design system and app shell.
5. Build the landing page.
6. Build the admin shell and onboarding.
7. Run build, lint, and fix deployment issues.

## Risks and Mitigations

### Risk 1: Unstable Docs Loading on Vercel

Mitigation:

1. Organize the docs reader into a clear server utility.
2. If needed, add a build-time copy step from the repo `docs/` to the app docs cache folder.

### Risk 2: UI Scope Creep

Mitigation:

1. Use a mock-first approach for the admin shell.
2. Do not add real auth/backend in this cycle.
3. Prioritize route completeness over full business logic.

### Risk 3: Excessive Legacy from `langeval-ui`

Mitigation:

1. Do not clone the entire structure.
2. Only reference patterns, and do not reuse unrelated business screens.

## Acceptance Criteria

This design is considered passed if the implementation produces:

1. A `docs/` directory containing the VClaw documentation set.
2. A `vclaw-ui/` directory containing the new Next.js app.
3. A complete and coherent VClaw landing page.
4. A Docs markdown viewer that works with sidebar navigation and stable routes.
5. An Admin shell with all the primary routes listed.
6. A project that can be built for Vercel deployment.
