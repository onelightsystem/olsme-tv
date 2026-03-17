---
name: debug
description: Diagnose and fix TypeScript, runtime, Firebase, and dependency issues in olsme-tv with reproducible, minimal patches.
---
## When to Use

Use this skill for tasks involving:

- TypeScript compile failures (`tsc`, tsconfig conflicts, type mismatches)
- Next.js runtime/build errors
- Firebase integration issues (Auth, Firestore, Functions)
- Security/dependency triage (`npm audit`, vulnerable transitive chains)
- Regressions after package upgrades

Keywords: debug, fix error, typecheck fail, tsconfig, firebase error, audit, vulnerability, build failure, runtime crash.

## Debug Workflow

1. Reproduce
- Run the smallest relevant command first (for example `tsc --noEmit -p tsconfig.json` for app-only type errors).
- Capture exact failing files/symbols before editing.

2. Isolate Root Cause
- Identify whether the issue is:
	- contract/type drift,
	- API misuse (for example Firestore modular vs legacy syntax),
	- dependency incompatibility,
	- config mismatch.

3. Patch Minimally
- Prefer shared/root-cause fixes over many repetitive call-site edits.
- Keep edits scoped to the requested task.

4. Validate
- Re-run targeted checks, then full checks.
- Include `npm run build` for Next.js routing/layout/server-component changes, even if typecheck passes.
- Report what was validated and what remains (if anything).

## Repository-Specific Tips

- App and Functions are separate TypeScript contexts; verify both when touching shared contracts.
- Avoid legacy Firestore patterns like `collection(...).doc()` in modular SDK files.
- For dependency upgrades, verify `npm audit` status and runtime imports for renamed/replaced packages.

## Example Commands

- `npm run check:types`
- `npm run check:lint`
- `npm run check:security`
- `npm audit --audit-level=moderate`
- `npm run build`

## Known Non-Blocking Signals

- In local dev, treat these as low-priority unless they map to a functional regression:
	- React DevTools suggestion banner.
	- GA cookie overwrite logs.
	- Firestore `NS_BINDING_ABORTED` on channel requests.
	- preload-not-used font warnings during HMR.

## Output Expectations

When finishing a debug task, include:

- Root cause summary
- Files changed
- Validation performed
- Any residual non-blocking issues