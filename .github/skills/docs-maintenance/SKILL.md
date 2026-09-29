---
name: docs-maintenance
description: Update project documentation files (security, blueprint, project-tree, release notes) accurately from current code and config state.
---
## When to Use

Use for:
- Updating `docs/security.md`, `docs/blueprint.md`, `docs/project-tree.md`, `README.md`
- Version/state rollups after feature changes
- Aligning docs with actual implementation status
- Rewriting stale docs that reference outdated stack, prices, routes, or deployment status

Keywords: docs, blueprint, security doc, project-tree, update documentation, rewrite markdown, status update.

## Workflow

1. Verify Current State
- Read target doc and identify stale sections.
- Verify implementation in code before writing "done" claims.
- Check relevant files directly (routes, rules, functions, env usage).

2. Classify Status Correctly
- Mark as one of:
  - Done (implemented and verifiable)
  - In Progress / Stub (partially implemented)
  - Planned (not implemented)
- Do not overstate security or payment hardening.

3. Patch Minimally but Completely
- For full refresh requests, replace the whole document.
- For targeted updates, edit only affected sections.
- Keep language clear, professional, and concise.

4. Validate
- Re-read final file for consistency and formatting.
- If updating project tree, regenerate from workspace:
  - `tree -I 'node_modules|.next|out|lib' > docs/project-tree.md`
- Provide unified diff when requested.

## Repo-Specific Notes

- App and Functions are separate surfaces; confirm both when documenting auth/payments/security.
- Premium gating may appear in multiple locations; verify route-level and global-layout behavior separately.
- Turnstile and PayPal docs must reflect env/config split accurately:
  - public keys in app env,
  - secrets in server/functions env/config.
- The custom domain `olsme.tv` is not being renewed. Canonical public URL is
  `https://studio-4615914296-4bd91.web.app`. When updating docs, only rewrite occurrences that are actual
  clickable/canonical hosts (hosting URLs, sitemap/canonical/og:url, hrefs) — leave `olsme.tv` as-is where it's
  clearly the product/portfolio name in headings or prose, not a link.
- `docs/DEPLOY.md` and `docs/PUBLIC_REPO.md` are the canonical references for the deploy/secrets flow and the
  public-repo security posture respectively. Keep them in sync with `apphosting.yaml`, `.gitignore`, and
  `.env.example` when any of those change.

## Done Criteria

- Document reflects current version and stack.
- No outdated pricing, route, or deployment claims.
- Security sections distinguish completed controls vs planned hardening.
- Any requested manual steps are included.