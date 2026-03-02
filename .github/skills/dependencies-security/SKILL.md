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

## Done Criteria

- High/critical findings resolved or explicitly documented with reason.
- Checks pass and no accidental runtime regressions from package swaps.
