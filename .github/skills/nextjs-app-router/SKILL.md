---
name: nextjs-app-router
description: Fix and evolve Next.js App Router pages/layouts with TypeScript-safe, minimal UI-impact changes.
---
## When to Use

Use for:
- `app/` route/layout errors
- Metadata typing issues
- client/server boundary mistakes
- hydration and App Router compile failures

Keywords: nextjs, app router, layout, metadata, use client, hydration, route segment.

## Workflow

1. Identify Scope
- Isolate failing page/layout/module from diagnostics.
- Confirm if file should be client or server component.

2. Apply Minimal Fix
- Correct typing/import patterns first.
- Preserve existing UX and component structure.
- Keep changes localized to affected route segment.

3. Validate
- Run app typecheck:
  - `npm run check:types`
- If needed, run build:
  - `npm run build`

## Repo-Specific Notes

- Metadata often comes from `src/app/metadata.ts`; guard nullable values.
- Prefer not to introduce new route groups or file moves unless required.
- `src/app/layout.tsx` is `'use client'` (it uses hooks for auth/premium-gating state). Next's automatic
  Metadata API (`metadataBase`, `alternates.canonical`, `openGraph`, etc. exported from `metadata.ts`) does
  **not** apply to a client-component root layout. `metadata.ts`'s `title`/`description` are manually spliced
  into a hand-written `<head>` — any new metadata (canonical link, `og:url`, Twitter card tags) must be added
  the same way, as literal `<link>`/`<meta>` tags in that `<head>`, not by adding fields to the `metadata.ts`
  export (they would be silently inert).

## Done Criteria

- Route/layout compiles without type errors.
- No behavior/UI drift outside requested scope.
