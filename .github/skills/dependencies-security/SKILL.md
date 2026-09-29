---
name: dependencies-security
description: Triage and remediate npm vulnerabilities safely in root app and functions with minimal breakage.
---
## When to Use

Use for:
- `npm audit` alerts
- Dependabot security PR triage
- Vulnerability chains in transitive dependencies
- Safe dependency upgrades and lockfile stabilization

Keywords: audit, dependabot, vulnerability, CVE, transitive, npm update, lockfile.

## Workflow

1. Assess
- Run audits separately for root and functions.
- Prioritize critical/high advisories first.

2. Remediate Safely
- Prefer non-breaking updates before force upgrades.
- Upgrade direct dependencies that own vulnerable chains.
- Remove unused direct dependencies pulling vulnerable trees.

3. Validate
- Re-run `npm audit --audit-level=high`.
- Run `npm run check`.
- Confirm app behavior on affected paths.

## Repo-Specific Notes

- This repository has two dependency trees:
  - root `package.json`
  - `functions/package.json`
- Keep changes minimal and targeted; avoid broad version churn.
- The ~50 remaining `npm audit` findings live entirely inside Genkit CLI's bundled dev-tooling
  (`@genkit-ai/telemetry-server`'s OpenTelemetry instrumentation packages, plus `adm-zip`/`extract-zip`). None of
  it ships in the deployed Next.js app or Cloud Functions — only reachable via `npm run genkit:dev`. See
  `docs/PUBLIC_REPO.md` for the up-to-date audit floor and rationale.

### npm `overrides` gotchas

- A flat top-level `overrides.<pkg>` conflicts with a same-named **direct** dependency and fails with
  `EOVERRIDE: conflicts with direct dependency`. Scope the override per offending parent package instead:
  ```json
  "overrides": {
    "<parent-package>": { "<vulnerable-dep>": "<safe-range>" }
  }
  ```
  This repo previously used this pattern for the `uuid` advisory (scoped under `@genkit-ai/ai`,
  `@genkit-ai/tools-common`, `genkit`, `google-gax`, `googleapis-common`) — **removed** after it broke Firebase's
  generated SSR Cloud Function deploy (see "Firebase SSR deploy" note below). Scoping correctly avoids
  `EOVERRIDE`, but a scoped override can still break a *downstream generated* lockfile that firebase-tools
  builds independently of the root one — scoping alone doesn't make an override safe for every install context.
- **Never** override `@opentelemetry/core` alone to silence its audit finding. The surrounding OTel SDK packages
  (`@opentelemetry/sdk-node`, `sdk-trace-base`, etc.) genkit-cli depends on are pinned to an older major
  internally; forcing `@opentelemetry/core` to a newer major breaks them at runtime
  (`core_1.getEnv is not a function`) even though `npm ls genkit`/`build`/`lint` all stay green. Any override that
  touches a shared low-level dependency must be runtime-tested (actually instantiate/exercise the affected code
  path), not just checked with `npm ls` and a build.

### Firebase SSR deploy: a root `uuid` override broke Cloud Build's `npm ci`

- `firebase deploy` for a Next.js SSR site generates its own `package.json`/`package-lock.json` for the Cloud
  Function bundle (in `.firebase/<site>/functions/`) — this is a **separate resolution** from the root
  `package-lock.json`, done independently by `firebase-tools`.
- A root override forcing `uuid@^11.1.1` on `genkit`/`google-gax` parents resolved fine locally (`npm ci` green,
  `build`/`lint` green) but the *generated* SSR bundle's lock still pinned a transitive parent to `uuid@9.0.1`,
  and Cloud Build's `npm ci` rejected the mismatch: `Invalid: lock file's uuid@11.1.1 does not satisfy
  uuid@9.0.1`. `rm -rf .firebase` does not fix this — the mismatch regenerates fresh from the current root
  `package.json` on every deploy.
- **Fix**: removed the `uuid` override entirely and let npm resolve it naturally per-parent. This raised the
  audit count from ~50 to ~59 (all still inside Genkit CLI dev-tooling — see `docs/PUBLIC_REPO.md`), but is
  required for the SSR Cloud Function to deploy at all. **A working deploy takes priority over closing an
  audit finding that only exists in non-shipped dev-tooling.**
- **Lesson**: for repos using Firebase Hosting's Next.js frameworks integration, never assume a root-level
  `overrides` entry is deploy-safe just because local `npm ci`/build/lint are green — the generated SSR function
  bundle resolves independently and can disagree. Test an actual deploy (or at minimum, know this failure mode)
  before treating an override as final.

## Done Criteria

- High/critical findings resolved or explicitly documented with reason.
- Checks pass and no accidental runtime regressions from package swaps.
- For this repo specifically: a successful `firebase deploy --only hosting,functions` (not just green local
  checks) before considering an `overrides` change final.
