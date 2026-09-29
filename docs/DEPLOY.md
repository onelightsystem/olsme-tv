# Deploy Checklist

## 1. Confirm the deploy surface

- `/api/verify-turnstile` is a **Next.js App Router route** (`src/app/api/verify-turnstile/route.ts`), not a named
  Cloud Function. It is bundled into the auto-generated Firebase Hosting SSR function
  (`ssrstudio46159142964bd9`, codebase `firebase-frameworks-studio-4615914296-4bd91`) alongside every other
  page and API route in `src/app`.
- The separately-named Cloud Functions in `functions/src/index.ts` (`createPaypalOrder`, `capturePaypalOrder`,
  `paypalWebhook`, etc.) are a **different codebase** (`default`) and do not receive `TURNSTILE_SECRET_KEY` —
  they only need `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`.
- `apphosting.yaml` already declares the secret binding for the SSR function:
  ```yaml
  env:
    - variable: TURNSTILE_SECRET_KEY
      secret: TURNSTILE_SECRET_KEY
  ```
  No additional binding step is required — `firebase deploy --only hosting` reads this file and wires the
  secret into `ssrstudio46159142964bd9` automatically.

## 2. Provision the secret (one-time, or when rotating)

```bash
firebase functions:secrets:set TURNSTILE_SECRET_KEY
```

- If the CLI prompts `Your secret is managed by Firebase App Hosting. Continuing will disable automatic
  deletion of old versions. Do you wish to continue? (Y/n)` — answer **Y**. Old secret versions will not
  auto-delete afterward; that is expected and fine for this project.
- When prompted `Enter a value for TURNSTILE_SECRET_KEY:`, paste the **real** Cloudflare Turnstile secret key
  (from the same widget as the real `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- After creating a new secret version, deploy functions for it to take effect:
  ```bash
  firebase deploy --only functions
  ```

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a **public** build-time variable, not a secret. It must be set as a real
  Cloudflare Turnstile site key in whatever environment runs `next build` for production (Firebase App Hosting
  build environment / CI), since Next.js inlines `NEXT_PUBLIC_*` values at build time.
- Locally, `.env.local` keeps the **dummy** Turnstile pair for `npm run dev`. For a production build run
  locally, `next build` loads `.env.production.local` first, then falls back to `.env.local` — Next's env
  priority means `.env.production.local`'s `NEXT_PUBLIC_TURNSTILE_SITE_KEY` wins when both are present. Put the
  real site key in `.env.production.local` (gitignored, same as `.env.local`) rather than overwriting
  `.env.local`'s dummy value.
- **`firebase deploy` runs its own `next build` locally**, in the same shell you invoke it from — `firebase.json`
  frameworks integration ignores the `build` script in `package.json` (see the deploy log's "custom build...is
  being ignored" warning) and calls `next build` directly, which reads whatever `.env.production.local`/
  `.env.local` files exist in your working directory at that moment. There is no separate CI/Cloud Build step
  that rebuilds the Next.js app with different env files — the artifact uploaded is built on your machine.
- **Env priority gotcha:** `process.env` (a value already exported in the *shell* running `firebase deploy`)
  outranks every `.env*` file. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` was ever `export`ed in that terminal session
  (e.g. while testing locally), it silently wins over `.env.production.local` during the deploy build, and the
  production bundle ships the dummy key even though `.env.production.local` looks correct. Check
  `echo $NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the deploying shell (should be empty) before deploying, or open a
  fresh terminal.
- `next.config.mjs` logs `NEXT_PUBLIC_TURNSTILE_SITE_KEY resolved as: DUMMY test pair` / `real key (value
  redacted)` / `unset` every time it runs (`next dev`, `next build`, `firebase deploy`'s internal build) — check
  this line in the deploy log first if production rejects every verification. `/api/verify-turnstile` also logs
  a `KEY PAIR MISMATCH` line server-side (Cloud Function logs, not client-visible) if the site key and secret
  key are from different pairs (one dummy, one real).

## 3. Cloudflare Turnstile widget configuration

In the Cloudflare Turnstile dashboard, the widget's **Hostnames** list must include (hostname only, no
`https://`, no path):

- `studio-4615914296-4bd91.web.app`
- `studio-4615914296-4bd91.firebaseapp.com`

**Local development uses Cloudflare's dummy test key pair** (`.env.example`). **Production uses the real key
pair.** Never mix a dummy site key with a real secret or vice versa — `siteverify` will reject every token.

**This Hostnames list is a Cloudflare dashboard setting — no code change can add a hostname to it.** If
production shows real (non-dummy) keys per the diagnostics above and the pair matches, but verification still
fails, confirm the live hostname is actually present in this list before looking anywhere else.

### Live debug checklist (production rejection)

1. **Network tab → the `api.js` request URL** (or the widget's rendered script tag) — confirm the `sitekey`
   query param is the real key, not `1x00000000000000000000AA`.
2. **Network tab → `POST /api/verify-turnstile` → Response** — read the JSON body directly (`success`, `code`,
   `errorCodes`); a 400 never has an empty body.
3. **Server logs (Firebase Console → Functions → `ssrstudio46159142964bd9` → Logs)** — look for
   `[next.config.mjs] NEXT_PUBLIC_TURNSTILE_SITE_KEY resolved as: ...` (from the build) and
   `[verify-turnstile] key pair check` / `KEY PAIR MISMATCH` (from the request).
4. **Cloudflare dashboard → Turnstile → widget → Hostnames** — confirm
   `studio-4615914296-4bd91.web.app` is listed exactly (no scheme, no path).
5. **Ignore as unrelated noise**: `opacity: undefined` console warnings, `WebGL context was lost` (Turnstile's
   canvas fallback), and "Apple Symbols" font-sanitizer errors — none of these affect verification.

## 4. Deploy commands

```bash
npm install
npm ci
npm run check:lint
npm run check:types
npm run build
firebase deploy --only hosting,functions
```

`npm ci` must succeed locally before deploying — it's the same strict, no-re-resolution install Cloud Build runs
against the uploaded SSR function bundle. If `package.json` (including the `overrides` block) changed since the
last commit, run `npm install` first so `package-lock.json` is regenerated to match, then confirm with `npm ci`.

**Known warning:** the deploy log may show `esbuild "external" must be an array of strings` while bundling
`next.config.mjs` for the Cloud Function. This comes from an esbuild version mismatch pulled in transitively by
`genkit-cli`'s `tsx` dependency (unrelated to app code) — deploy has been observed to still succeed despite the
warning.

**Known failure mode — `uuid` override breaks Cloud Build's `npm ci` for the SSR function:**
`Invalid: lock file's uuid@11.1.1 does not satisfy uuid@9.0.1` during `firebase deploy` (function
`firebase-frameworks-<site>:ssr<site>`) is **not** just a stale `.firebase/` cache issue. `firebase-tools`
generates its own `package.json`/`package-lock.json` for the SSR function bundle during deploy (in
`.firebase/<site>/functions/`), and that generated lock can still pin a transitive parent to `uuid@9.0.1` even
though the root `package-lock.json` (forced via `overrides`) resolves `uuid@11.1.1` for the same parent. Cloud
Build's `npm ci` then rejects the mismatched pair — `rm -rf .firebase` alone does not fix this because the
mismatch is regenerated fresh on every deploy from the current root `package.json`.

The actual fix: **do not use a root `uuid` override to force a single major version across genkit/google-gax
transitive deps.** Let npm resolve `uuid` naturally (each parent gets whatever range it declares). This raises
`npm audit`'s count slightly (~59 vs. ~50, all still inside Genkit CLI's bundled dev-tooling — see
`docs/PUBLIC_REPO.md`) but produces a lockfile that Cloud Build's generated SSR bundle can `npm ci` against
without conflict. The only override that should remain is the `firebase-frameworks` → `cookie` one (unrelated,
does not touch a package a Cloud Functions bundle re-pins).
```bash
rm -rf .firebase
npm ci   # must succeed locally before every deploy — same strict install Cloud Build runs
firebase deploy --only hosting,functions
```
If `npm ci` fails locally with a `uuid` (or similar) mismatch after any future dependency bump, check
`package.json`'s `overrides` block first — a scoped override forcing one package's version across multiple
parents is the most likely cause, not a stale cache.

## 5. Public-repo hygiene reminder

- `.env`, `.env.local`, `.env.*.local`, `functions/.env` are gitignored (`.env*` in `.gitignore`) — never commit
  real values. Only `.env.example` (dummy/placeholder values) is tracked.
- Never commit `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `TURNSTILE_SECRET_KEY`, or Firebase Admin SDK
  private keys/service account JSON files.
- If a key was ever committed to git history, **rotate it** (regenerate in the provider's dashboard) rather than
  relying on removal from the working tree alone — history is not rewritten as part of this process. See
  `docs/PUBLIC_REPO.md` for what was already found and rotated/removed.
