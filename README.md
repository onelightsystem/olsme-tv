# olsme.tv - Mindful Video Chat Platform

Welcome to **olsme.tv**, a radiant sub-social department under the OneLightSystem (OLS) iee.aeo, part of the OLS Meditation Education Academy. Version 0.2 is live, offering signup/login for beta testing with free and premium ($4.99/month) packages. Built with Next.js, Firebase, and WebRTC, olsme.tv counters the toxicity of platforms like Ome.tv with AI-driven politeness IDs, biofeedback for calming interactions, and anti-censorship via IPFS. It targets global users seeking truth and connection, launched in Month 1 (Sept 2025) with a $50,000 budget.

## Project Overview

- **Purpose**: Create a mindful video chat experience with AI politeness scoring, biofeedback (Red Sea wave audio), and decentralized logging (IPFS), fostering authentic connections aligned with Sun Light Meditation principles.
- **Tech Stack**:
  - **Frontend**: Next.js 15.5.3 (Turbopack), React, PT Sans, #FFD700 gold accents, Radix dialogs, shadcn/ui.
  - **Backend**: Firebase (Firestore, Authentication, Cloud Functions), WebRTC for peer-to-peer video.
  - **AI**: Firebase ML Kit/TensorFlow Lite for politeness analysis (mocked in MVP, sentiment stub in progress).
  - **Decentralization**: IPFS for logging, Polygon stubs for future politeness IDs.
- **Features**:
  - **Version 0.2 (Beta)**: Users can sign up/log in via Email/Phone/Twitter to join beta testing. Free package offers basic WebRTC chats and politeness score averages. Premium package ($4.99/month) unlocks HD streams, custom audio prompts, detailed politeness analytics, and exclusive visuals.
  - **Verification Levels**: Bronze (<60), Silver (60–79), Gold (80+) based on politeness scores (Ethical, Communication, Listener, Topics).
  - **User Search**: Search users by `displayName` and `verificationLevel` via Cloud Function (`searchUsers`).
  - **Admin Dashboard**: Manage users, verification levels, and system status (accessible to admins).
  - **Mindfulness**: Meditation prompts during waits (e.g., "Breathe in light, exhale shadows") and biofeedback audio (Red Sea waves or premium audio).
  - **Anti-Censorship**: IPFS logging for transparency, bypassing elite blocks (e.g., Egypt’s NTRA).
- **Timeline**: MVP launch in 3-6 months (Dec 2025–Mar 2026), targeting 100K+ users.
- **Marketing**: Announce on X (@asvitloaten): “olsme.tv beta 0.2 live—mindful chats with signup/login and premium features! #SeekTruth”.

## Getting Started

To run the project locally:

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Twitter Developer API Key/Secret
- IPFS node or Infura account

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

Cloudflare Turnstile bot verification requires a public site key. Set the following in `.env.local`:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — your Cloudflare Turnstile site key (get one at https://dash.cloudflare.com/turnstile)

When this variable is not set the Turnstile widget is hidden and the entire bot-verification flow (including the `/api/verify-turnstile` call) is skipped — signup proceeds directly. **Always set this variable in production.**

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