---
name: public-repo-transition
description: Manage the olsme.tv domain retirement to Firebase Hosting URL, investor/portfolio positioning, and the checklist for eventually flipping the GitHub repo to public.
---
## When to Use

Use for tasks involving:

- Replacing `olsme.tv` links/canonicals with the Firebase Hosting URL anywhere in the app or docs
- Preparing the repo to be published as a public portfolio (secrets audit, `.gitignore`, `.env.example`)
- Investor/collaborator positioning on `/about` or in `README.md`
- Deciding what's left before flipping GitHub repo visibility from private to public

Keywords: public repo, portfolio, investor, olsme.tv, domain retirement, canonical URL, secrets audit, go public, repo visibility.

---

## Current State (as of this session)

- **Custom domain `olsme.tv` is not being renewed.** Canonical public URL is
  `https://studio-4615914296-4bd91.web.app` (Firebase Hosting).
- Domain migration completed for actual clickable/canonical hosts: `docs/blueprint.md` hosting line,
  `public/robots.txt` sitemap line, the profile referral link, and new canonical/`og:url`/`twitter:site` meta
  tags in `layout.tsx`'s manually-rendered `<head>`. `olsme.tv` is intentionally left in place everywhere it's
  the product/portfolio name in headings, prose, or toasts (not a link).
- `/about` has an "Open for Investors & Collaborators" section (GitHub repo link, X handles, AI-crawler fee
  notice matching `GateOfProtection`'s policy).
- `README.md` has a portfolio blurb (live URL, `/about` link, "open for investors").
- Secrets audit completed: no real `PAYPAL_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`, or private key material found
  in tracked files or full git history. One hardcoded Firebase Web SDK config literal was found (present in
  history since commit `c8b219c`) and removed from the working tree — **not rewritten out of git history**.
- `.gitignore` hardened (`.env.example` un-ignored so it's actually tracked; added `service-account*.json`,
  `credentials.json`, `google-services.json`, `GoogleService-Info.plist`, `*.p12`, `*.key`).
- `.env.example` fixed (previously had wrong variable names that didn't match the code) and ships Cloudflare's
  official dummy Turnstile test pair only.
- `docs/PUBLIC_REPO.md` and `docs/DEPLOY.md` added, documenting the audit floor rationale and deploy/secrets
  flow respectively.

## Domain Migration Checklist

When asked to migrate a link off `olsme.tv`:

1. Search the whole repo (`src/`, `public/`, `docs/`, `functions/`) for `olsme.tv`, `www.olsme.tv`,
   `http(s)://olsme.tv`, and any `canonical`/`metadataBase`/`og:url`/`twitter:site` still pointing at it.
2. Classify each match:
   - **Keep** — product/portfolio name in a heading, toast, or prose (`About olsme.tv`, `Welcome to olsme.tv`).
   - **Must change** — an actual `href`, hosting URL, sitemap reference, or canonical/OG meta value.
3. Replace only the "must change" matches with `https://studio-4615914296-4bd91.web.app`.
4. Do not touch `olsme.com` links (separate, still-active domain) unless they were wrongly pointed at `olsme.tv`.
5. Recall `layout.tsx` is a client component — Metadata API fields don't apply; canonical/OG tags must be
   hand-added to its `<head>` (see the `nextjs-app-router` skill).

## Public-Repo Readiness Checklist (before flipping GitHub visibility to public)

Chronological remaining steps, in order:

1. **Decide on the Next.js auto-generated `AGENTS.md` / root `CLAUDE.md`.** They regenerate on every
   `next dev`/`next build` (disable via `agentRules: false` in `next.config.mjs`, or gitignore them) — pick one
   so they don't churn every commit.
2. **Decide whether to rotate the previously-hardcoded Firebase Web API key** (`AIzaSyDG-...`, git history since
   `c8b219c`). Low real-world risk (Firebase Web SDK config isn't an authorization secret), but rotating gives a
   clean slate for a public repo. Regenerate in Firebase Console → Project Settings if desired.
3. **Confirm production Turnstile keys are the real Cloudflare pair**, not the dummy pair, and that the
   Cloudflare widget's Hostnames list includes both `studio-4615914296-4bd91.web.app` and
   `studio-4615914296-4bd91.firebaseapp.com` (see `docs/DEPLOY.md`).
4. **Re-run the secrets sweep** (`git grep` for `TURNSTILE_SECRET_KEY=`, `PAYPAL_CLIENT_SECRET=`,
   `-----BEGIN`, `AIza[0-9A-Za-z_-]{35}`, etc. across tracked files, plus `git log --all -p` for the same
   patterns) if any new commits have landed since the last audit.
5. **Flip repository visibility to public** (GitHub → Settings → Danger Zone → Change visibility). Do this last,
   after 1–4 are resolved, since a public repo is effectively permanent even if flipped back private (crawlers,
   forks, and caches may already have copied it).

## Repo-Specific Notes

- Do not rewrite git history (no `git filter-repo`/force-push) as part of this workflow unless the human
  explicitly asks for it — rotating a key is the default remediation for anything found in history.
- Never invent a new brand name or domain; the product name (`olsme.tv` / `OLSme`) stays, only the live URL
  changes.
- Investor contact channels are the GitHub repo and existing X handles (`@asvitloaten`, `@onelightsystem`) —
  never invent or expose an email address in UI/comments (see user preference on `ContactButton`/`/Contact`
  routing, which doesn't exist in this app yet).

## Done Criteria

- No live/canonical link still points at `olsme.tv`; product-name usages are untouched.
- `docs/PUBLIC_REPO.md` checklist items are all resolved or explicitly deferred with a reason.
- `npm run check:lint && npm run check:types && npm run build` all pass after any change made under this skill.
