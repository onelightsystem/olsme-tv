---
name: firebase-functions
description: Debug and implement Firebase Functions v2 callables/auth triggers with correct typings and deployment-safe changes.
---
## When to Use

Use for:
- Callable function typing errors
- Auth trigger issues
- CORS/HTTP function misconfiguration
- Functions build/typecheck failures

Keywords: firebase-functions, onCall, onRequest, auth trigger, CallableRequest, cors, deploy functions.

## Workflow

1. Reproduce
- Run functions-only typecheck:
  - `npm run check:types:functions`
- If behavior differs between app and functions, validate both contexts separately before editing.

2. Fix Contracts
- Match Firebase Functions v2 handler signatures.
- Avoid `any`; define request/response payload types.
- Keep callable auth checks explicit and safe.
- Preserve existing exported function names unless a breaking change is explicitly requested.

3. Validate
- Re-run functions typecheck and lint:
  - `npm run check:types:functions`
  - `npm run check:lint:functions`
- If callables are touched from app code, also run app typecheck:
  - `npm run check:types`

## Repo-Specific Notes

- Functions code lives in `functions/src`.
- Keep exports stable when possible to avoid breaking deployed entry points.
- Prefer targeted fixes over reorganizing function files.
- There are **two separate Cloud Functions codebases** on deploy: the named callables in `functions/src/index.ts`
  (codebase `default` — `createPaypalOrder`, `paypalWebhook`, etc.) and the auto-generated Next.js SSR function
  (codebase `firebase-frameworks-studio-4615914296-4bd91`, function name `ssrstudio46159142964bd9`) that serves
  every page and App Router API route (`/api/verify-turnstile`, `/api/ipfs`, `/api/ipfs-upload`). They do not
  share environment/secret bindings.
- The SSR function's env/secrets are configured via `apphosting.yaml`'s `env:` block (e.g.
  `TURNSTILE_SECRET_KEY`), not `functions/.env`. Provision/rotate with `firebase functions:secrets:set <NAME>`,
  then `firebase deploy --only functions` for the new version to take effect. See `docs/DEPLOY.md`.

## Done Criteria

- Functions compile cleanly.
- No signature mismatch for v2 APIs.
- Deployment surface remains backward compatible unless explicitly requested.
- Validation commands and any residual risk are clearly reported.
