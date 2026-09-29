# Public Repo Notes

This repo is prepared as a public portfolio project (OneLightSystem OLS / GrokAtenya), not a secrets dump.

## npm audit floor (~50 vulnerabilities)

All remaining `npm audit` findings live entirely inside the **Genkit CLI's bundled dev-tooling** (OpenTelemetry
instrumentation packages pulled in by `genkit-cli`'s `@genkit-ai/telemetry-server`, plus `adm-zip`/`extract-zip`
used by genkit-cli's own asset extraction). None of this code ships in the deployed Next.js app or Cloud
Functions — it only runs locally via `npm run genkit:dev` / `genkit:watch`.

Fixing them requires `npm audit fix --force`, which downgrades `genkit` to `0.5.17` or `genkit-cli` to `0.0.2` —
both unacceptable regressions. A prior attempt to override just `@opentelemetry/core` to a patched version broke
`genkit-cli`'s telemetry server at runtime (`core_1.getEnv is not a function`) because the surrounding OTel SDK
packages are pinned to an older major version internally. See `package.json` `overrides` for the `uuid` overrides
that were safely applied instead.

**Do not run `npm audit fix --force`** without re-verifying the Genkit CLI dev tooling still works afterward.

## Secrets hygiene checklist

- `.env`, `.env.local`, `.env.*.local`, `functions/.env` — gitignored via `.env*` (verified, never tracked).
- `.env.example` — explicitly un-ignored (`!.env.example`) so it stays tracked; contains placeholder names only.
- `.firebase/` — gitignored.
- `service-account*.json`, `credentials.json`, `google-services.json`, `GoogleService-Info.plist`, `*.p12`, `*.key`, `*.pem` — gitignored.
- `TURNSTILE_SECRET_KEY` is provisioned as a Firebase App Hosting **secret** (`apphosting.yaml`), never a plaintext env var in production.
- No real `PAYPAL_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`, or private key material was found committed anywhere in the tracked tree or git history.
- A hardcoded Firebase Web SDK config fallback (`apiKey`/`authDomain`/`projectId`/etc.) was found in `src/lib/firebase/config.ts` and removed in favor of `process.env` only. Firebase Web SDK config isn't a secret per Firebase's own security model (protection comes from Security Rules, not from hiding this config), but hardcoding it risked forks silently connecting to this project's backend.
