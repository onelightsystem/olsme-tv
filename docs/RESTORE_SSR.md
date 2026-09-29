# SSR Operations — olsme.tv

**Last updated:** September 29, 2026
**Status:** SSR is the live, current, and only deploy mode. Static export is retired.

Hosting: `https://studio-4615914296-4bd91.web.app` (Firebase Hosting + Cloud Run SSR, `frameworksBackend` region
`us-central1`). This doc describes how the SSR deploy is configured and how to operate/troubleshoot it — it is
**not** a migration guide off static export. There is nothing to migrate off; that mode was removed in v0.4.2.

---

## Current SSR Configuration (reference)

### `next.config.mjs` (not `.ts`)

The config file is `.mjs`, not `.ts`. This is required because `package.json` has `"type": "module"` — a
transpiled `.ts` config fails on Cloud Run with `ReferenceError: module is not defined in ES module scope`. The
`.mjs` extension forces native ESM and bypasses firebase-frameworks' TS transpilation step entirely. **Do not
rename it back to `.ts`.**

There is no `output: 'export'` in this file. If you ever see that key, it does not belong — SSR mode requires
its absence.

### `firebase.json`

```json
{
  "functions": {
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "source": "functions",
    "runtime": "nodejs22"
  },
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "us-central1"
    }
  }
}
```

`hosting.source: "."` + `frameworksBackend` is what tells `firebase deploy` to build and run the app as a
Cloud Run SSR service instead of serving a static `out/` directory. There is no `hosting.public` key in SSR
mode — if one reappears, that's a static-export config, not this one.

### API routes are live, not stubs

`src/app/api/ipfs/route.ts`, `src/app/api/ipfs-upload/route.ts`, and `src/app/api/verify-turnstile/route.ts`
are ordinary Next.js App Router POST handlers. They build as `ƒ (Dynamic)` and are bundled into the
auto-generated SSR Cloud Function (`ssrstudio46159142964bd9`, codebase
`firebase-frameworks-studio-4615914296-4bd91`). None of them contain `force-static` stubs or block-commented
handler bodies — if you see that pattern, it's leftover from the old static-export era and should be removed.

---

## Deploy

```bash
npm install        # only if package.json changed since last commit
npm ci              # must succeed locally before deploying — same strict install Cloud Build runs
npm run check:lint
npm run check:types
npm run build
firebase deploy --only hosting,functions
```

**Last confirmed successful deploy:** September 29, 2026 — `firebase deploy --only hosting,functions` updated
the SSR function `ssrstudio46159142964bd9` (2nd Gen, Node.js 22, `us-central1`) along with the `default`
codebase's PayPal/admin callables.

### Known non-fatal warning

The deploy log may show:
```
Warning: Global esbuild version (0.28.2) does not match the required version (^0.19.2).
✘ [ERROR] "external" must be an array of strings
Unable to bundle next.config.mjs for use in Cloud Functions, proceeding with deploy but problems may be encountered.
```
This comes from an esbuild version mismatch pulled in transitively (unrelated to app code). **It does not fail
the deploy** — hosting still releases and the function still updates. Treat it as noise, not an error to chase.

### Known failure mode: `uuid` override vs. generated SSR lockfile

If `firebase deploy` fails during the functions build step with something like:
```
npm error Invalid: lock file's uuid@11.1.1 does not satisfy uuid@9.0.1
```
this means a root `package.json` `overrides` entry is forcing a `uuid` version across genkit/google-gax
parents, but `firebase-tools` generates its **own** `package.json`/`package-lock.json` for the SSR function
bundle (in `.firebase/<site>/functions/`) independently of the root lockfile — and that generated bundle can
still resolve a different `uuid` version for the same parent. `rm -rf .firebase` alone does not fix this; the
mismatch regenerates fresh from the root `package.json` on every deploy.

Fix, in order:
1. Remove the offending `uuid` override(s) from `package.json` — do not try to force a single `uuid` version
   across unrelated dependency trees. Let npm resolve it naturally per-parent.
2. `npm install` to regenerate `package-lock.json`.
3. `rm -rf .firebase`
4. `npm ci` — must succeed locally before redeploying.
5. `firebase deploy --only hosting,functions`

See `docs/DEPLOY.md` and the `dependencies-security` skill's "Firebase SSR deploy" note for the full writeup.
**Do not respond to this failure by reintroducing static export** — it is a lockfile/override issue, unrelated
to SSR vs. static rendering.

---

## Cloudflare Turnstile (production)

- Production uses the **real** Cloudflare Turnstile site key + secret key pair, never the dummy test pair.
- `TURNSTILE_SECRET_KEY` is provisioned as a Firebase secret (`apphosting.yaml` binds it to the SSR function),
  never a plaintext env var.
- The Cloudflare widget's **Hostnames** list must include `studio-4615914296-4bd91.web.app` (and
  `studio-4615914296-4bd91.firebaseapp.com`) — hostname only, no scheme, no path.
- Local development uses Cloudflare's dummy test pair (`.env.local`) — never mix a dummy site key with a real
  secret or vice versa. See `docs/DEPLOY.md` for the full provisioning flow.

---

## Verification Checklist

After any deploy, confirm:

- [ ] `/` loads and is server-rendered (DevTools → Network → first HTML document has full content, not a bare shell)
- [ ] `/about` renders correctly
- [ ] `/dev-log` renders correctly
- [ ] `/subscribe` loads PayPal buttons (client-side SDK)
- [ ] `/api/verify-turnstile` returns a real response (not a 503 or static stub)
- [ ] DevTools Console: no `force-static` or static-stub errors
- [ ] DevTools Console: no CORS errors from callable functions

---

## Troubleshooting Order (if a deploy fails)

Try these in order before considering anything more drastic:

1. `rm -rf .firebase` and redeploy — clears any stale generated bundle.
2. Confirm your `firebase-tools` version: `firebase --version`. The Cloud Run 409 revision-conflict bug
   (`firebase/firebase-tools#10148` / `#10155`) is fixed as of v15.12.0 — if you see
   `409 ALREADY_EXISTS: Revision named '...' with different configuration already exists`, upgrade
   `firebase-tools` first.
3. Check for a `uuid`/lockfile mismatch (see "Known failure mode" above) — the most common recent cause of
   Cloud Build `npm ci` failures for the SSR function.
4. Re-run `npm ci` locally and confirm it's clean before blaming the deploy pipeline.

**Do not reach for static export (`output: 'export'`) as a troubleshooting step.** It was a temporary workaround
for the now-fixed 409 bug, not a general fallback, and reintroducing it silently breaks all three live API
routes (they'd need to be re-stubbed) and removes SSR rendering for every dynamic page.

### Historical note (v0.4.1, retired)

From March 23–28, 2026, olsme.tv ran a temporary static HTML export (`output: 'export'`, `firebase.json`
`hosting.public: "out"`, API routes replaced with static stubs) as a workaround for the Cloud Run 409
revision-conflict bug above. That configuration is fully removed from the codebase as of v0.4.2 and is not
documented here — if it's ever needed again as a reference (it shouldn't be), see the git history around the
v0.4.1 tag/commits rather than resurrecting a static-export doc.

---

SSR is the awakening path — fast, dynamic, fully server-rendered. #SeekTruth
