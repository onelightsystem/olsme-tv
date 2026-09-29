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
  This repo uses this pattern for the `uuid` advisory (scoped under `@genkit-ai/ai`, `@genkit-ai/tools-common`,
  `genkit`, `google-gax`, `googleapis-common` — not a flat `uuid` override).
- **Never** override `@opentelemetry/core` alone to silence its audit finding. The surrounding OTel SDK packages
  (`@opentelemetry/sdk-node`, `sdk-trace-base`, etc.) genkit-cli depends on are pinned to an older major
  internally; forcing `@opentelemetry/core` to a newer major breaks them at runtime
  (`core_1.getEnv is not a function`) even though `npm ls genkit`/`build`/`lint` all stay green. Any override that
  touches a shared low-level dependency must be runtime-tested (actually instantiate/exercise the affected code
  path), not just checked with `npm ls` and a build.

## Done Criteria

- High/critical findings resolved or explicitly documented with reason.
- Checks pass and no accidental runtime regressions from package swaps.
