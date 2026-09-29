# olsme.tv Blueprint

Version: v1.0.1b (September 2026)
Canonical host: https://studio-4615914296-4bd91.web.app (Firebase Hosting + Cloud Run SSR)
Product name: olsme.tv (kept in headings and prose)
Custom domain olsme.tv is not being renewed.

This is a public portfolio build from OneLightSystem OLS / GrokAtenya. Open for investors and collaborators — see /about.

## Description

olsme.tv is a mindful random video chat platform: anti-toxicity, conscious communication, digital awakening. Stack: Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS, Firebase Auth / Firestore / Cloud Functions v2 / Hosting SSR, WebRTC (signaling still MVP), Genkit + Google AI for politeness prompts, PayPal for tiers, Cloudflare Turnstile gate, optional IPFS logs.

## Current pricing

- Entry Key: 0.10 USD / month
- Starter: 0.25 USD / month or 10 USD / year
- Premium: 1 USD / month or 30 USD / year

Landing shows three monthly cards. Annual toggle applies to Starter and Premium only. Confirm live copy on /about and /subscribe.

## Feature status (Sept 2026)

| Feature | Status | Notes |
| --- | --- | --- |
| Auth and identity | Done | Firebase Auth, protected routes, Firestore profile |
| Pricing UI | Done | Three tiers, TV-safe 48px targets, dark-glass cards |
| Premium claims | Done | Server custom claims, not client-writable fields |
| Site Turnstile gate | Done locally | GateOfProtection + /api/verify-turnstile; dummy keys omit `action` (do not fail test tokens on action match); production needs real key pair + Hostnames `studio-4615914296-4bd91.web.app` and `studio-4615914296-4bd91.firebaseapp.com`; secret = Firebase `TURNSTILE_SECRET_KEY` v2 |
| PayPal | In progress | create/capture callables + webhook deployed; harden live reconcilation |
| WebRTC chat | In progress | UI exists; production signaling incomplete |
| Politeness scoring | In progress | Genkit 1.42 module + Cloud Function path; enforcement not full live |
| /about /dev-log | Done | Investor section on /about; canonical/OG point at Firebase URL |
| SSR deploy | Done | `ssrstudio46159142964bd9` deploys successfully (confirmed Sept 29, 2026). The `uuid@11.1.1` vs `uuid@9.0.1` Cloud Build `npm ci` failure was fixed by removing the root `uuid` overrides (see `docs/DEPLOY.md`); do not reintroduce them. The esbuild "external" warning is separate and non-fatal. |

## Style

Dark glass, gold #FFD700, gold-to-orange CTAs, sun particles, PT Sans / Tailwind, 48px targets, focus rings.

## Key files

- src/app/layout.tsx — client shell; canonical tags are manual in `<head>`
- src/components/GateOfProtection.tsx — site gate
- src/app/api/verify-turnstile/route.ts
- src/app/about/page.tsx — mission + investors + Light Time `day.dayOfYear` (@olsystem/lt-lh 0.4)
- src/app/subscribe/page.tsx
- functions/src/index.ts
- apphosting.yaml — TURNSTILE_SECRET_KEY binding
- docs/DEPLOY.md, docs/PUBLIC_REPO.md

## History (do not treat as current)

v0.4.1 static export workaround → v0.4.2 (March 2026) restored SSR after firebase-tools v15.12.0 fixed Cloud Run 409 (#10148 / #10155). See docs/RESTORE_SSR.md.

## Next

1. Confirm live Turnstile uses the real widget pair, not `1x000000…AA`, and that Cloudflare Hostnames includes both hosting domains.
2. PayPal webhook verification.
3. WebRTC signaling MVP.
4. Public GitHub only after secrets sweep (docs/PUBLIC_REPO.md).

Build truthfully. Keep the human signal clear. #SeekTruth