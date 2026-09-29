---
description: Project-specific guidance for code changes, reviews, and debugging in olsme-tv.
applyTo: '**/*.{ts,tsx,js,jsx,json,md}'
---
## Project Context

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui + Radix primitives, Firebase
  (Auth/Firestore/Functions/Hosting SSR), Genkit 1.42 + Google AI (Gemini), PayPal (live).
- Workspace includes two code targets:
	- Root app under `src/`
	- Cloud Functions under `functions/src/`
- Live URL: `https://studio-4615914296-4bd91.web.app` (Firebase Hosting + Cloud Run SSR). Product name is
  `olsme.tv` — the custom domain is not being renewed; only the hosting URL is canonical now. Keep `olsme.tv` as
  the product/portfolio name in headings and prose; only rewrite actual hrefs/canonical/sitemap references.
- `src/app/layout.tsx` is a client component (`'use client'`), so Next's Metadata API does not apply there —
  canonical/OG/twitter meta tags are hand-added as literal `<meta>`/`<link>` tags in its manually-rendered
  `<head>`, not via `export const metadata`.
- Cloudflare Turnstile bot protection: `src/components/GateOfProtection.tsx` (widget) +
  `src/app/api/verify-turnstile/route.ts` (server verification). Cloudflare's dummy test key pair always
  returns `success: true` but never includes an `action` field (flagged instead via
  `metadata.result_with_testing_key`) — never mix a dummy site key with a real secret key or vice versa.
  `TURNSTILE_SECRET_KEY` is a Firebase secret (see `apphosting.yaml`), never a plaintext env var in production.
- `@olsystem/lt-lh` 0.4.x: display `day.dayOfYear` directly (see `src/app/about/page.tsx`) — do not use the old
  `(day.day - 1) % 365` workaround, which is wrong since the package's epoch moved to `2025-12-23`.

## Coding Guidelines

- Prefer minimal, surgical fixes over broad refactors.
- Keep existing naming/style conventions in each file.
- Use modular Firestore APIs (`doc(collection(...))`, `addDoc`, `writeBatch`) and avoid legacy chained APIs.
- Preserve existing user-facing behavior unless explicitly asked to change UX.
- Avoid introducing `any`; prefer narrow interfaces, unions, or `unknown` with safe narrowing.
- Do not create additional documentation files unless explicitly requested; prefer updating existing docs in
  place — `docs/blueprint.md`, `docs/security.md`, `docs/DEPLOY.md`, `docs/PUBLIC_REPO.md`,
  `docs/RESTORE_SSR.md`. Do not create new dated "session summary" markdown files; fold findings into the
  relevant canonical doc instead.

## Documentation Accuracy

- For Markdown updates (`docs/*.md`, `README.md`, security/blueprint docs), verify claims against current code before writing.
- Do not mark features as done unless implementation is present in the repository. In particular, WebRTC
  session signaling and AI politeness scoring enforcement are **not** done — treat as In Progress/Stub unless
  you've verified otherwise directly in code.
- Distinguish clearly between:
	- implemented,
	- partially implemented/stubbed,
	- planned.
- For security docs, validate both code paths and rule/config coverage (for example claims checks, Firestore rules, callable auth checks).
- For project tree docs, regenerate from tracked files (`git ls-files | tree --fromfile`) instead of manually editing stale paths or scanning the raw filesystem (which includes untracked/gitignored clutter).

## Reliability & Safety

- Validate changes with the most specific command first, then broader checks.
- Use these checks when touching app logic:
	- `npm run check:lint`
	- `npm run check:types`
	- `npm run check:security`
	- `npm run build` (when changing routing, layout, or server-rendered page logic)
- Before any `firebase deploy`, run `npm ci` locally first — it's the same strict install Cloud Build runs
  against the SSR function bundle. If the generated SSR function's lockfile drifts from the root one (a
  `uuid`-style version mismatch), `rm -rf .firebase` and re-run `npm ci` before redeploying.
- If a command fails due unrelated pre-existing issues, do not rewrite unrelated modules; document scope clearly.
- When requested by the user, provide unified diffs (`git --no-pager diff -- <path>`) for changed files.

## Known Recurring Issues

**Non-blocking** (informational unless correlated with a user-facing regression):
- React DevTools suggestion in local dev.
- Google Analytics cookie overwrite messages.
- Firestore streaming `NS_BINDING_ABORTED` during navigation/unload or Fast Refresh.
- Font preload "not used within a few seconds" in hot-reload sessions.
- Framer Motion `opacity: undefined` console warning on `repeat: Infinity` animations missing an `exit` prop.
- Turnstile widget "Cannot find Widget" during Fast Refresh — caused by the widget ref not being nulled after
  removal; harmless during dev remounts.
- `esbuild "external" must be an array of strings` warning while bundling `next.config.mjs` during
  `firebase deploy` — an esbuild version mismatch pulled in transitively; deploy still succeeds.

**Blocking** (must be fixed, not worked around):
- Cloud Build `npm ci` failing with a `uuid@11.x` vs `uuid@9.x` lockfile mismatch when deploying the SSR
  function (`ssrstudio46159142964bd9`). Root cause: a root `package.json` `overrides` entry forcing `uuid`
  across genkit/google-gax parents, while `firebase-tools` generates its own SSR function lockfile
  independently. Fix by removing the `uuid` override(s) and letting npm resolve `uuid` naturally per-parent —
  **never** work around this by reintroducing static export (`output: 'export'`); that regresses SSR entirely
  and is unrelated to the actual cause. See `docs/RESTORE_SSR.md` and `docs/DEPLOY.md`.
- TypeScript compile errors, Next.js build/prerender errors, runtime exceptions in app/function code, and
  moderate/high/critical security findings are always actionable — never suppress or ignore.

## Dependency and Security Work

- Prefer non-breaking upgrades first.
- For audit remediation, prioritize:
	1. direct dependencies with known advisories,
	2. high/critical findings,
	3. transitive updates that do not destabilize runtime.
- Do not use force upgrades unless explicitly approved. Never run `npm audit fix --force` here — it downgrades
  `genkit`/`genkit-cli` to unacceptable versions. The Genkit CLI's bundled OpenTelemetry dev-tooling accounts
  for the repo's persistent audit floor (~59 findings); it never ships in the deployed app or functions.

## PR/Review Expectations

- Summaries should include:
	- what changed,
	- why it changed,
	- how it was validated,
	- any remaining risk/open items.
- Reference concrete file paths for changed logic.
- Keep final responses concise for straightforward doc updates, and include manual verification steps when requested.