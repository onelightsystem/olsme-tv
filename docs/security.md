# Security and Hardening Status (v0.4.1, March 2026)

## Overview

olsme.tv v0.4.1 uses Firebase Auth, Firestore Rules, Cloud Functions, Cloudflare Turnstile, and PayPal live server-side flows to protect identity, subscription integrity, and anti-abuse boundaries. The current posture prioritizes three goals: prevent self-upgrade exploits, reduce bot and spam traffic, and preserve monetization trust while aligning with the platform mission of mindful and accountable social interaction.

## Completed Hardening Measures

### Firestore Security Rules

- Own user document access is enforced by UID: authenticated users can read and write only their own user document.
- Premium and subscription fields are server-managed and protected with `diff()` / key checks:
  - `isPremium`
  - `subscriptionTier`
  - `subscriptionStatus`
  - `package`
  - `startDate`
  - `paypalOrderId`
- Client-side attempts to create or modify these fields are blocked by rules.
- `subscriptions` collection writes are limited to admin-claim paths.

### Authentication and Claims

- Premium status is issued server-side via custom claims after successful server-validated payment flow.
- Claim reads are implemented in key flows:
  - `src/app/subscribe/page.tsx` uses `getIdTokenResult().claims` to short-circuit premium users away from the subscribe page.
  - `src/app/layout.tsx` refreshes claims on auth state changes.
- Note: `src/app/layout.tsx` still includes a legacy Firestore snapshot gate for redirect behavior. This gate works, but should be fully claim-only for consistency.

### Turnstile Bot Protection

- Signup includes Turnstile protection with site key from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Turnstile secret is read server-side from `TURNSTILE_SECRET_KEY`.
- `src/app/api/verify-turnstile/route.ts` accepts token verification payloads and rejects credential-style extra fields (email/password/name), preventing leakage through the verification endpoint.
- If the site key is missing in development, the app logs a fallback warning for visibility.

### PayPal and Payments

- PayPal live credentials are configured through environment and functions config.
- Server-side payment callables exist in `functions/src/index.ts`:
  - `createPaypalOrder`
  - `capturePaypalOrder`
  - `updateSubscriptionStatus`
- Webhook endpoint stub (`paypalWebhook`) is present for event reconciliation and future signature hardening.
- Callable endpoints are configured with CORS support (`onCall({ cors: true })` via shared config).

### Access Gates

- Non-premium redirect behavior is active in global layout flow: authenticated users without premium access are redirected to `/subscribe`.
- Effective scope includes chat entry paths (for example, home-driven chat UI) because the gate is in app layout routing logic.
- Current subscribe page messaging is clear and upgrade-oriented.
- Recommended standard gate copy for consistency across future dedicated routes (`/chat`, `/video`):
  - "Unlock full mindful chats with Premium - start for $1/month"

### Dependency and Lint Hygiene

- Security checks are integrated into scripts:
  - `npm run check:security` runs `npm audit --audit-level=moderate`
  - `npm run check` runs lint + types + security
  - `npm run precommit` executes full check gate
- TypeScript linting is active with `@typescript-eslint`.
- `npm audit` is expected to run regularly; moderate and high vulnerabilities should be remediated before release.
- `eslint-plugin-security` is planned for stricter security linting coverage (not fully integrated yet).

## Remaining / Planned Items

- Complete full PayPal webhook signature verification and event-driven auto-upgrade reconciliation path.
- Implement Entry Key entitlement enforcement so `$0.10/month` users get only intended basic access scope.
- Add explicit dedicated route guards for future `/chat` and `/video` pages if those paths are split from the home flow.
- Migrate global premium gate in `layout.tsx` from mixed Firestore+claims logic to claim-only logic.
- Add rate limiting for chat/session initiation (Cloud Armor or callable-level controls).
- Add VPN/proxy detection stub for restricted-region policy enforcement.
- Integrate `eslint-plugin-security` and tune rules for TypeScript + Next.js patterns.

## Audit and Monitoring

- Monitor Firebase logs for `permission-denied`, suspicious callable failures, and repeated payment retries.
- Use Cloudflare protections and maintain Turnstile verification thresholds (target score >= 0.3 where applicable).
- Run manual exploit regression test after rules or subscription changes:
  - attempt `setDoc({ isPremium: true }, { merge: true })` from client
  - expected result: denied by Firestore rules
- Validate premium entitlement path end-to-end after deployment:
  - payment capture succeeds
  - custom claims update is visible
  - gated routes redirect correctly for non-premium users

Security in olsme.tv is not just technical enforcement. It protects trust, fairness, and intentional human interaction, which is core to the project mission. #SeekTruth