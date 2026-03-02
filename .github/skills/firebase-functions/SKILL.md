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

2. Fix Contracts
- Match Firebase Functions v2 handler signatures.
- Avoid `any`; define request/response payload types.
- Keep callable auth checks explicit and safe.

3. Validate
- Re-run functions typecheck and lint:
  - `npm run check:types:functions`
  - `npm run check:lint:functions`

## Repo-Specific Notes

- Functions code lives in `functions/src`.
- Keep exports stable when possible to avoid breaking deployed entry points.
- Prefer targeted fixes over reorganizing function files.

## Done Criteria

- Functions compile cleanly.
- No signature mismatch for v2 APIs.
- Deployment surface remains backward compatible unless explicitly requested.
