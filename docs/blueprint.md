# olsme.tv Blueprint

Version: v0.4.2 (March 2026)
Hosting: https://olsme.tv (Firebase Hosting + Cloud Run SSR)
Fallback Firebase URL: https://studio-4615914296-4bd91.web.app

> **Hosting mode (March 28, 2026):** Full SSR via Cloud Run (`frameworksBackend: us-central1`).
> The 409 revision-conflict bug (firebase-tools #10148 / #10155) is resolved in firebase-tools v15.12.0.
> Static export mode has been removed. See [docs/RESTORE_SSR.md](RESTORE_SSR.md) for rollback instructions if needed.

Description: olsme.tv is a mindful random video chat platform under the OLS vision, focused on anti-toxicity, conscious communication, and digital awakening. The current platform is built on Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Firebase Auth, Firestore, Cloud Functions, and Hosting (Cloud Run SSR), with WebRTC and AI politeness systems in active development. v0.4.2 restores full SSR mode after the Cloud Run 409 revision-conflict bug was resolved in firebase-tools v15.12.0. All API routes (IPFS, Turnstile verification) and PayPal callables are now fully server-side. The three-tier freemium model, custom-claim premium gating, and dark-glass golden UI from v0.4.1 remain intact.

## Current Pricing Tiers

- Entry Key: 0.10 USD per month recurring. Lightweight onboarding tier that establishes presence and early platform access.
- Starter: 0.25 USD per month recurring, or 10 USD per year one-time plan.
- Premium: 1 USD per month recurring, or 30 USD per year one-time plan.

Pricing UI status:
- Landing page displays three cards in monthly mode.
- Annual toggle switches Starter and Premium only.
- Entry Key is monthly-only behavior by design in v0.4.1.

## Core Features

Analysis: v0.4.1 is focused on secure identity, subscription reliability, and polished onboarding UI. Premium access control is now claim-driven and server-authoritative. Payment flow is in live-integration phase, with create and capture logic implemented in Cloud Functions and webhook handling stubbed for operational hardening.

| Feature | Status | Key Implementation Notes | OLS Awakening Tie-In | Solo Efficiency Tip |
|---------|--------|--------------------------|----------------------|---------------------|
| Authentication and Identity | Done | Firebase Authentication with email and social flows, protected client routes, and profile hydration from Firestore. | Establishes accountable human presence before deeper interaction. | Validate every auth path in local and hosting environments before release. |
| Subscription Tiers and Paywall UX | Done | Three landing tiers with monthly and annual toggle logic, dark-glass pricing cards, and responsive layout with minimum 48px touch targets. | Gives users a low-friction entry path while preserving intentional upgrade steps. | Keep tier copy and pricing constants centralized for faster updates. |
| Premium Gating via Custom Claims | Done | Access checks use server-set custom claims rather than client-writable Firestore fields. Claims are refreshed in key user flows. | Keeps truth anchored at the server boundary, reducing spoofed status paths. | Re-test claim refresh after each subscription-related backend change. |
| Turnstile Bot Protection | Done | Signup flow includes Turnstile verification endpoint with strict token-only validation and no credential leakage. | Protects the human-first space from automated abuse. | Keep Turnstile keys in env config and verify fallback behavior before deploy. |
| PayPal Live Integration | In Progress | Live client ID and secret wiring in place, callable order create and capture functions added, webhook endpoint stub added for event reconciliation. | Supports a sustainable conscious platform without ad-noise dependency. | Test with small live charges and verify claim updates immediately after capture. |
| Random Video Chat (WebRTC) | In Progress (Stub) | UI foundations and chat-related components exist, but full production signaling and session orchestration are not complete. | Targets mindful real-time connection while avoiding toxicity-first patterns. | Isolate signaling MVP first, then layer moderation and scoring features. |
| AI Politeness Scoring | In Progress (Stub) | Function and data scaffolding exists; production-grade model inference and enforcement policy are still pending. | Encourages accountability in speech and listening quality. | Start with measurable score events and simple threshold alerts before automation. |
| Dev Log and Transparency Pages | Done | Public-facing informational pages are active and used to communicate project intent and progress. | Keeps mission and implementation visible to the community. | Update dev-log notes at each milestone to reduce future context loss. |

## Style Guidelines

Analysis: The active design language is dark-glass morphism with warm gold highlights, subtle orange gradients, and ambient sun-like motion layers. The visual system prioritizes clarity, focus, and touch-safe interaction on mobile and TV-adjacent displays.

- Primary Color: Gold, #FFD700, used for highlights, focus accents, and premium visual anchors.
- Accent Gradient: Gold to orange ramps for high-intent call-to-action surfaces.
- Base Surface: Dark glass panels with blur, translucent charcoal backgrounds, and soft edge glow.
- Background System: Dim atmospheric layers with faint sun-particle style gradients.
- Typography: Utility-first Tailwind stack tuned for readability and high contrast.
- Interaction Targets: Minimum 48px controls, clear focus rings, and keyboard-visible states.
- Motion: Gentle entrance transitions, hover lift, pulse accents, and restrained micro-interactions.
- Layout: Responsive card grids, mobile-first stacking, and consistent spacing rhythm.

## Key Files

- src/app/page.tsx: Main landing and primary user entry experience.
- src/app/layout.tsx: Global app shell, auth state handling, and claim-aware routing behavior.
- src/app/subscribe/page.tsx: Subscription flow UI, PayPal button integration, and subscription updates.
- src/app/about/page.tsx: Public mission and context page.
- src/app/dev-log/page.tsx: Public development progress stream.
- src/components/landing/subscription-cards.tsx: Entry Key, Starter, and Premium card definitions and toggle behavior.
- src/components/ui/PremiumButton.tsx: Reusable PayPal purchase interaction component.
- src/components/auth/auth-signup-form.tsx: Signup flow with Turnstile bot protection.
- src/app/api/verify-turnstile/route.ts: Server-side Turnstile verification endpoint.
- src/lib/firebase/config.ts: Firebase client initialization.
- src/lib/firebase/firebase.ts: Firebase utility exports and app wiring.
- functions/src/index.ts: Cloud Functions including subscription status updates, PayPal create and capture callables, and webhook stub.
- firestore.rules: Firestore access controls, including server-managed subscription field protection.
- docs/blueprint.md: This living product blueprint.

## Final Reflection (March 2026)

v0.4.2 restores full SSR mode after five days in static export. The Cloud Run 409 revision-conflict bug (firebase-tools #10148 / #10155) is resolved in firebase-tools v15.12.0, released March 27, 2026. All API routes, PayPal callables, and WebRTC signaling infrastructure are now fully server-side again. The temporary static stubs and `output: 'export'` workaround have been cleanly removed.

What changed in v0.4.2:
- firebase-tools updated to v15.12.0 (409 bug fix confirmed).
- `next.config.ts`: removed `output: 'export'`.
- `firebase.json`: restored `frameworksBackend` block (us-central1), removed static `public: "out"`.
- API routes (`/api/ipfs`, `/api/ipfs-upload`, `/api/verify-turnstile`): original POST handlers restored, static GET stubs removed.
- `package.json`: removed `"export"` script, version bumped to 0.4.2.

Next steps:
- Complete PayPal end-to-end hardening and webhook verification coverage.
- Ship Entry Key-specific backend gating and entitlement checks.
- Deliver WebRTC signaling MVP for reliable one-to-one session startup.
- Move AI politeness scoring from stub to measurable live pipeline.

The path remains simple: build truthfully, secure the boundaries, and keep the human signal clear. #SeekTruth