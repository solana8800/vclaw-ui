# VClaw UI I18n Design Spec

## Goal

Refactor `vclaw-ui` into a clearly structured bilingual website, where:

1. Vietnamese is the default language at `/`.
2. English is served at `/en/...`.
3. Landing page, docs UI, admin shell, and navigation all support both languages.
4. Docs markdown has clear fallback mechanisms when an English translation is missing.

## Product Intent

This refactor is not just about changing text in the UI. The goal is to turn `vclaw-ui` into an app with a proper i18n foundation to:

1. Serve Vietnamese users immediately without a route prefix.
2. Support international customers or partners through a dedicated English route system and metadata.
3. Keep product messaging, docs, and the admin shell consistent by language.
4. Create a foundation for adding more locales in the future if needed.

## Scope

### In Scope

1. Add a default `vi` route and a prefixed `en` route.
2. Refactor hardcoded text in the landing page, app shell, docs shell, and admin shell into message dictionaries.
3. Support a language switcher to toggle between `/...` and `/en/...` on the same type of page.
4. Refactor the docs loader to read markdown files by locale.
5. Define a fallback for docs missing English translations.
6. Update metadata, `html lang`, and labels to reflect the active locale.

### Out of Scope

1. Automatic browser language detection and redirection at this stage.
2. Complex CMS or translation management systems.
3. Locales other than `vi` and `en`.
4. Translating all product doc content in the same refactor cycle if the source content is not yet available.
5. Backend i18n API or persisted user locale preferences.

## Architectural Decision

The chosen direction is to move `vclaw-ui` to an i18n architecture with route-based locales using `next-intl`.

Reason for this direction:

1. The app has been separated into an independent root in `vclaw-ui`, so this is the right time to lay a proper i18n foundation.
2. `/` and `/en/...` routes are clearer than just changing text with state on the client.
3. `next-intl` fits well with the Next.js App Router and reduces the risk of writing a custom i18n framework.
4. Metadata, routing, and locale-specific rendering require a solution that works well with server components.

## Information Architecture

### Route Model

Vietnamese is the default route:

1. `/`
2. `/docs`
3. `/docs/[slug]`
4. `/admin`
5. `/admin/...`

English uses a route prefix:

1. `/en`
2. `/en/docs`
3. `/en/docs/[slug]`
4. `/en/admin`
5. `/en/admin/...`

### Route Equivalence

The language switcher must switch between the two corresponding routes instead of taking the user back to the home page.

Example:

1. `/admin/orders` <-> `/en/admin/orders`
2. `/docs/00-Business-Requirements` <-> `/en/docs/00-Business-Requirements`
3. `/` <-> `/en`

If the current route does not have a valid mapping, the language switcher will fallback to the home page of that locale.

## File and Data Layout

### Docs Directory

`vclaw-ui/docs/` is the source of truth for the app's documentation. Locale-specific markdown docs will have filenames:

1. `00-Business-Requirements.vi.md`
2. `00-Business-Requirements.en.md`

The slug is still derived from the base name:

1. `00-Business-Requirements`
2. `01-System-Architecture`

### Messages Directory

Add message dictionaries in the app:

1. `vclaw-ui/messages/vi/common.json`
2. `vclaw-ui/messages/vi/navigation.json`
3. `vclaw-ui/messages/vi/landing.json`
4. `vclaw-ui/messages/vi/admin.json`
5. `vclaw-ui/messages/vi/docs.json`
6. `vclaw-ui/messages/en/...` with a similar structure.

Separating namespaces this way helps reduce file size and keeps component boundaries clear.

## Translation Strategy

### UI Translation

All UI chrome must be moved into dictionaries:

1. Header, footer (if any), and nav labels.
2. Landing page hero, sections, CTAs, and card copy.
3. Admin shell titles, descriptions, labels, and helper text.
4. Docs layout labels like `Documentation`, `Previous`, `Next`, `Open documentation page`.
5. Metadata titles and descriptions by locale.
6. Empty states, fallback notices, and not-found copy if any.

### Docs Translation

Markdown content is handled separately from the UI chrome:

1. If the locale is `vi`, the docs loader prioritizes `.vi.md` files.
2. If the locale is `en`, the docs loader prioritizes `.en.md` files.
3. If `.en.md` does not exist, the system falls back to `.vi.md`.
4. When a fallback occurs, the docs page must show a clear notice that you are viewing the default content because an English translation is not yet ready.

The fallback notice must be honest and easy to understand, avoiding the impression that it is an official translation.

## Runtime Behavior

### Locale Resolution

Locale is determined from the route:

1. No prefix -> `vi`
2. Prefix `/en` -> `en`

Do not add redirection based on browser language in this cycle to avoid unpredictable and hard-to-test behaviors.

### Layout Behavior

The root layout and locale layout must ensure:

1. `html lang` matches the current locale.
2. Metadata by locale.
3. Navigation labels by locale.
4. The language switcher shows the current locale and routes to the other locale.

### Docs Behavior

The docs index should show:

1. Title and description by locale.
2. Document list by locale shell.
3. File titles derived from the base name to maintain consistency between `vi` and `en`.

If docs content falls back from `vi` in an `/en/...` route, the shell remains in English, but the notice must clearly inform that the current content has not been translated.

## Component Boundaries

### I18n Infrastructure

Add a dedicated i18n infrastructure layer responsible for:

1. Managing the list of valid locales.
2. Loading messages by locale.
3. Creating helpers to get localized routes.
4. Reading the locale from route params.

### Docs Utilities

`lib/docs.ts` should have clearly separated responsibilities:

1. Scanning base doc identifiers.
2. Resolving files by locale and fallback.
3. Returning metadata about the requested locale, the actual served locale, and whether a fallback occurred.
4. Maintaining safe slug validation.

### UI Components

Current components should not arbitrarily read message files directly. Instead:

1. Pages/layouts will fetch translations and pass them down as props where appropriate.
2. Shared helpers or hooks will be used where needed to reduce excessive prop drilling.
3. Shared components like `DocsLayout` and `AdminShell` only receive already localized text or from clear namespaces.

## Refactor Targets

Areas requiring refactor in this cycle:

1. `app/layout.tsx`
2. `app/page.tsx`
3. `components/marketing/landing-page.tsx`
4. `components/admin/admin-shell.tsx`
5. Entire `app/admin/**`
6. `app/docs/[[...slug]]/page.tsx`
7. `components/docs/docs-layout.tsx`
8. `lib/docs.ts`
9. Test files related to the docs loader and docs rendering.

## Testing and Verification

Minimum verification required for this refactor cycle:

1. Unit tests for the docs loader with `vi`, `en`, and fallback from `en` to `vi`.
2. Unit tests for the route mapping helper between `/...` and `/en/...`.
3. Successful app build with the new route model.
4. Lint pass.
5. Manual verification:
   - Landing page at `/` and `/en`.
   - Docs index and doc detail at both locales.
   - Admin overview and at least one sub-page at both locales.
   - Language switcher maintains correct route context.

## Risks and Mitigations

### Risk 1: Fallback Docs Misleading Users

Mitigation:

1. Show a clear notice when `en` falls back to `vi`.
2. Do not silently hide fallback behavior.

### Risk 2: Wide Text Refactor Missing Hardcoded Copy

Mitigation:

1. Group text by namespace.
2. Refactor by surface: app shell -> landing -> docs -> admin.
3. Use systematic search to reduce missed text.

### Risk 3: New Route Model Breaking Existing Links

Mitigation:

1. Keep the `vi` route without a prefix to avoid breaking default links.
2. Add route mapping helpers instead of manual string concatenation in multiple places.

## Acceptance Criteria

This design is considered successful when the implementation produces:

1. `vclaw-ui` supports Vietnamese by default at `/`.
2. `vclaw-ui` supports English at `/en/...`.
3. Landing page, docs shell, and admin shell all display correctly by locale.
4. Language switcher changes locale while maintaining the corresponding route.
5. Docs loader reads `.vi.md` and `.en.md` files.
6. If the `.en.md` file is missing, the `/en/docs/...` route still works, the shell remains in English, and there is a clear fallback notice.
7. `npm test`, `npm run lint`, and `npm run build` all pass in `vclaw-ui`.
