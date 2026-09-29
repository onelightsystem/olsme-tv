# olsme.tv - Mindful Video Chat Platform

**Live:** https://studio-4615914296-4bd91.web.app
**About & mission:** https://studio-4615914296-4bd91.web.app/about

This is a public portfolio project from OneLightSystem OLS / GrokAtenya. olsme.tv is open for investors and
collaborators — see the [About page](https://studio-4615914296-4bd91.web.app/about) for details and contact channels.

Welcome to **olsme.tv**, a mindful random video chat platform under the OneLightSystem (OLS) vision. The app is
live at v1.0.1, offering signup/login with a three-tier pricing model (Entry Key, Starter, Premium — see
`/about` for current pricing). Built with Next.js, Firebase, and WebRTC, olsme.tv counters the toxicity of
platforms like Ome.tv with AI-driven politeness scoring, biofeedback for calming interactions, and IPFS-backed
logging for transparency.

## Project Overview

- **Purpose**: Create a mindful video chat experience with AI politeness scoring, biofeedback (Red Sea wave audio), and decentralized logging (IPFS), fostering authentic connections aligned with Sun Light Meditation principles.
- **Tech Stack**:
  - **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, PT Sans, #FFD700 gold accents, Radix primitives, shadcn/ui.
  - **Backend**: Firebase (Firestore, Authentication, Cloud Functions v2, Hosting/SSR), WebRTC for peer-to-peer video.
  - **AI**: Genkit + Google AI (Gemini) for politeness prompt generation, invoked server-side via Cloud Functions.
  - **Payments**: PayPal (live, server-verified orders and webhooks).
  - **Decentralization**: IPFS for logging (optional; skipped gracefully if no IPFS credentials are configured).
- **Features**:
  - **Pricing**: Entry Key, Starter, and Premium tiers — see the live [About page](https://studio-4615914296-4bd91.web.app/about) for current prices and terms.
  - **Politeness Badge**: Bronze (<60), Silver (60–79), Gold (80+) computed from politeness scores (Ethical, Communication, Listener, Topics).
  - **Identity Verification Levels**: separate `level1`/`level2`/`level3` KYC-style progression, reviewed via the admin dashboard.
  - **User Search**: Search users by `displayName` and verification level via Cloud Function (`searchUsers`).
  - **Admin Dashboard**: Manage users, verification levels, referrals, and notifications.
  - **Mindfulness**: Meditation prompts during waits (e.g., "Breathe in light, exhale shadows") and biofeedback audio (Red Sea waves or premium audio).
  - **Anti-Censorship**: Optional IPFS logging for transparency.

## Getting Started

To run the project locally:

### Prerequisites
- Node.js 22+
- Firebase CLI (`npm install -g firebase-tools`)
- X (Twitter) Developer API Key/Secret (only needed if testing X sign-in)
- IPFS node or Infura account (optional)

### Environment (IPFS)

IPFS uploads are handled server-side so credentials are never exposed to the browser. Set one of the following in `.env.local` (no `NEXT_PUBLIC_` prefix):

- `IPFS_AUTH_HEADER` (full auth header, e.g. `Basic ...`)
- or both:
  - `IPFS_INFURA_PROJECT_ID`
  - `IPFS_INFURA_PROJECT_SECRET`

Optional:

- `IPFS_URL` (defaults to `https://ipfs.infura.io:5001`)

Without auth on an Infura URL, IPFS uploads are skipped and the app falls back to Firestore logs.

### Environment (Turnstile)

Cloudflare Turnstile bot verification requires a public site key **and** a matching private secret key. Set both in `.env.local`:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — your Cloudflare Turnstile site key (get one at https://dash.cloudflare.com/turnstile)
- `TURNSTILE_SECRET_KEY` — the matching secret key, used server-side in `/api/verify-turnstile`

For local development you can use Cloudflare's official dummy test pair instead of real keys (always passes, no Cloudflare account needed):

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

**The site key and secret key must be from the same pair** (real or dummy) — mixing a test site key with a real/mismatched secret (or vice versa) causes Cloudflare's `siteverify` to reject every token, and `/api/verify-turnstile` will return 400 with no visible reason on the client (check the terminal running `next dev` for the logged `error-codes`).

When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not set the Turnstile widget is hidden and the entire bot-verification flow (including the `/api/verify-turnstile` call) is skipped — signup proceeds directly. **Always set both variables in production.**

**Production (live Hosting) requirements:**
- Use the **real** Cloudflare Turnstile site key + secret key — never the dummy test pair above.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a public build-time env var; `TURNSTILE_SECRET_KEY` is provisioned as a Firebase App Hosting **secret** (see `apphosting.yaml`), never committed.
- In the Cloudflare Turnstile dashboard, the widget's **Hostnames** list must include `studio-4615914296-4bd91.web.app` (hostname only — no `https://` scheme, no path). Requests from an unlisted hostname are rejected by Cloudflare regardless of key validity.

## Testing
- Run `npm run dev`, visit `http://localhost:9002`.
- Test login via Profile/Phone in `Header`, verify Firestore `users`.
- Start chat, check WebRTC streams, Firestore `logs`/`biofeedback`, IPFS CIDs.
- Simulate premium features (e.g., mock `isPremium: true` in auth claims).

## Contributing
- Fork the repo, create a branch (`git checkout -b feature/your-feature`).
- Commit changes with clear messages (e.g., `feat: Add phone sign-in to Header`).
- Push and create a PR to `main`.
- Follow OLS values: mindful, respectful collaboration.

## AI-Driven Development

### GitHub Copilot
Skills live in `.github/skills/`. Each skill is a focused domain guide (debug, firebase-functions, lt-lh, nextjs-app-router, etc.). Copilot loads the relevant skill before working in a given domain.

### Claude (Sonnet / Opus) Collaboration

See [`.claude/CLAUDE.md`](.claude/CLAUDE.md) for the full setup guide.

**Quick start:**
```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

**Workflow — GrokAtenya → Claude:**
1. GrokAtenya plans the task and writes a precise prompt (goal, files, constraints, success criteria)
2. Claude implements clean, typed, minimal code and validates (`check:types` → `build`)
3. GrokAtenya reviews the diff and accepts or requests one targeted revision

**Registered Claude skills:** `code-review`, `hooks-next-best-practices` — plus all Copilot skills are shared context.

## Contact
For questions, reach out via X (@asvitloaten). Let’s awaken humanity with mindful chats! #SeekTruth