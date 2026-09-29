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

## 3. Cloudflare Turnstile widget configuration

In the Cloudflare Turnstile dashboard, the widget's **Hostnames** list must include (hostname only, no
`https://`, no path):

- `studio-4615914296-4bd91.web.app`
- `studio-4615914296-4bd91.firebaseapp.com`

**Local development uses Cloudflare's dummy test key pair** (`.env.example`). **Production uses the real key
pair.** Never mix a dummy site key with a real secret or vice versa — `siteverify` will reject every token.

## 4. Deploy commands

```bash
npm run check:lint
npm run check:types
npm run build
firebase deploy --only hosting,functions
```

**Known warning:** the deploy log may show `esbuild "external" must be an array of strings` while bundling
`next.config.mjs` for the Cloud Function. This comes from an esbuild version mismatch pulled in transitively by
`genkit-cli`'s `tsx` dependency (unrelated to app code) — deploy has been observed to still succeed despite the
warning.

## 5. Public-repo hygiene reminder

- `.env`, `.env.local`, `.env.*.local`, `functions/.env` are gitignored (`.env*` in `.gitignore`) — never commit
  real values. Only `.env.example` (dummy/placeholder values) is tracked.
- Never commit `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `TURNSTILE_SECRET_KEY`, or Firebase Admin SDK
  private keys/service account JSON files.
- If a key was ever committed to git history, **rotate it** (regenerate in the provider's dashboard) rather than
  relying on removal from the working tree alone — history is not rewritten as part of this process. See
  `docs/PUBLIC_REPO.md` for what was already found and rotated/removed.
