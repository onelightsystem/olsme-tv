---
description: Project-specific guidance for code changes, reviews, and debugging in olsme-tv.
applyTo: '**/*.{ts,tsx,js,jsx,json,md}'
---
## Project Context

- Stack: Next.js (App Router), TypeScript, Firebase (Auth/Firestore/Functions), Genkit, shadcn UI.
- Workspace includes two code targets:
	- Root app under `src/`
	- Cloud Functions under `functions/src/`

## Coding Guidelines

- Prefer minimal, surgical fixes over broad refactors.
- Keep existing naming/style conventions in each file.
- Use modular Firestore APIs (`doc(collection(...))`, `addDoc`, `writeBatch`) and avoid legacy chained APIs.
- Preserve existing user-facing behavior unless explicitly asked to change UX.
- Avoid introducing `any`; prefer narrow interfaces, unions, or `unknown` with safe narrowing.
- Do not create additional documentation files unless explicitly requested; prefer updating existing docs in place.

## Documentation Accuracy

- For Markdown updates (`docs/*.md`, `README.md`, security/blueprint docs), verify claims against current code before writing.
- Do not mark features as done unless implementation is present in the repository.
- Distinguish clearly between:
	- implemented,
	- partially implemented/stubbed,
	- planned.
- For security docs, validate both code paths and rule/config coverage (for example claims checks, Firestore rules, callable auth checks).
- For project tree docs, regenerate from the current workspace instead of manually editing stale paths.

## Reliability & Safety

- Validate changes with the most specific command first, then broader checks.
- Use these checks when touching app logic:
	- `npm run check:lint`
	- `npm run check:types`
	- `npm run check:security`
	- `npm run build` (when changing routing, layout, or server-rendered page logic)
- If a command fails due unrelated pre-existing issues, do not rewrite unrelated modules; document scope clearly.
- When requested by the user, provide unified diffs (`git --no-pager diff -- <path>`) for changed files.

## Known Non-Blocking Dev Warnings

- Treat these as informational unless they correlate with user-facing regressions:
	- React DevTools suggestion in local dev.
	- Google Analytics cookie overwrite messages.
	- Firestore streaming `NS_BINDING_ABORTED` during navigation/unload.
	- Font preload "not used within a few seconds" in hot-reload sessions.
- Prioritize actionable failures:
	- TypeScript compile errors,
	- Next.js build/prerender errors,
	- runtime exceptions in app/function code,
	- moderate/high/critical security findings.

## Dependency and Security Work

- Prefer non-breaking upgrades first.
- For audit remediation, prioritize:
	1. direct dependencies with known advisories,
	2. high/critical findings,
	3. transitive updates that do not destabilize runtime.
- Do not use force upgrades unless explicitly approved.

## PR/Review Expectations

- Summaries should include:
	- what changed,
	- why it changed,
	- how it was validated,
	- any remaining risk/open items.
- Reference concrete file paths for changed logic.
- Keep final responses concise for straightforward doc updates, and include manual verification steps when requested.