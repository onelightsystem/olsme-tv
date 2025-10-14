# olsme.tv Blueprint

**Version**: Beta 0.2 (Deployed Sept 30, 2025)
**Description**: olsme.tv is a radiant sub-social department under OneLightSystem (OLS) iee.aeo, part of the OLS Meditation Education Academy. Version 0.2, deployed to Firebase Hosting (`https://studio-4615914296-4bd91.web.app`), introduces signup/login for beta testing with free and premium ($4.99/month) packages, fostering mindful video chats with AI politeness scoring, biofeedback audio, and decentralized IPFS logging. Built with Next.js 15.5.3, Firebase, and WebRTC, it counters toxicity (e.g., Ome.tv) and targets global users seeking truth and connection.

## Core Features

**Analysis**: Version 0.2 delivers a dual-screen mindful chat interface, authentication, user search, and guest rating. In Progress: AI politeness and biofeedback enhancements (Days 11/15-21). To Do: Full AI integration and user reporting for 20% premium conversion (Financial Projections). **Comment**: These features are portals to longevity, using biofeedback to heal divides (e.g., Ukraine/Russia) and bypassing NTRA via decentralized stubs.

| Feature | Status | Key Implementation Notes | OLS Awakening Tie-In | Solo Efficiency Tip |
|---------|--------|--------------------------|----------------------|---------------------|
| **Random Video Chat** | Done | Dual-screen layout (`src/app/page.tsx`): left (guest profiles), right (camera feed). Initiated via "Start a Mindful Chat" button; WebRTC peer-to-peer (Day 4) for quick matches (<10s wait). Matching via Cloud Function `searchUsers`. Includes chat toggle, politeness feedback, guest rating (good/bad), next/stop buttons. | Meditation prompts (e.g., "Breathe in light, exhale shadows") and biofeedback audio (Red Sea waves or premium audio) foster conscious starts, countering OmeTV toxicity. | Test on `localhost:9002` (`npm run dev`); batch with Flutter mobile sketch (Day 15). Budget: $0 (open-source WebRTC.org). |
| **AI Politeness Monitor** | In Progress (Sentiment Stub) | TensorFlow Lite via Firebase ML Kit (Day 5); scores chat/video sentiment (HuggingFace models). Stored in Firestore (`politeness_scores`); categories: Ethical, Communication, Listener, Topics. Feedback via toasts ("Seek light in words"). Ban threshold: <60% score after 3 chats. | Tracks "politeness IDs" as blockchain-stubbed (Polygon mock, Day 4) for decentralized trust, rewarding OLS values. | Integrate sample tests; log scores in Firestore. Add A/B testing for premium prompts ($4.99 tier). |
| **Biofeedback Prompts** | In Progress (Audio Stub) | Calming audio (Red Sea waves or premium audio) in `page.tsx`, `waiting-screen.tsx`, `header.tsx`, `layout.tsx`. Stored in Firebase Cloud Storage (Day 15, $500/month). Triggered via user tap or AI detection (planned). | Prompts like "Ground in higher truths" during lulls, promoting longevity and countering narrative control. | Reuse free audio libs; test with 30-40 viewer streams. Tie to kill switch (Day 10) for privacy. |
| **User Authentication** | Done | Firebase Authentication (Email/Phone/Twitter, Day 2). Verification: Email/SMS OTP, sunlight motif check (planned). Twitter auth uses `TwitterAuthProvider`. Custom claims (`isPremium`, `verificationLevel`). Pages: `header.tsx`, `about/page.tsx`. | Guards OLS light—unique IDs link to politeness scores, enabling freemium upsell. | Test auth flows (`npm run dev`); add GDPR privacy (Day 3). |
| **User Reporting** | To Do | "Report" button in `chat-controls.tsx` submits to Firestore `reports` for AI review (Cloud Functions, planned). Admin dashboard (`admin/users/page.tsx`) for moderation. | Empowers community healing—reports refine HuggingFace models, enforcing OLS anti-toxicity. | Plan anonymized reports with blockchain hash (IPFS audit trail). Tie to beta polls. |
| **Guest Rating** | Done | Good/bad rating buttons in `page.tsx` call `rateGuest` Cloud Function, log to Firestore `ratings` and IPFS. | Encourages mindful interactions, rewarding positive connections. | Test with `npm run dev`, check Firestore `ratings` and IPFS CIDs. |

## Style Guidelines

**Analysis**: Evokes OLS sunlight with #FFD700 gold and PT Sans, promoting calm amid digital storms. Done: Colors/fonts applied to React components (`src/app/globals.css`, Day 6). In Progress: Cross-browser testing (Firefox/Safari). **Comment**: Meditative anchors using whitespace to counter elite clutter (e.g., ad-heavy OmeTV). **Humble Evolution**: Add dark mode toggle for global accessibility (Egypt nights, Ukraine winters).

- **Primary Color**: Warm gold (#FFD700) for buttons (e.g., "Start a Mindful Chat") and politeness badges.
- **Background Color**: Soft beige (#F5F5DC) with gold gradient edges for calm energy flow.
- **Accent Color**: Darker orange (#FF8C00) for CTAs (e.g., report icons, premium upsell).
- **Font**: PT Sans (via `next/font/google`) for chat readability.
- **Icons**: Soft, rounded, hand-drawn style (Feather Icons, white/gold); gold on interactive elements (e.g., pulsing mic).
- **Layout**: Clean minimalism with 1:1.5 whitespace ratios; card-based chats (border-radius: 12px).
- **Animations**: Subtle transitions (0.3s ease); pulsing buttons (`@keyframes pulse`); fading sunlight rays (`animate-loading-sun`).

## Key Files
- `src/app/page.tsx`: Dual-screen chat flow with WebRTC, Firebase Auth, and guest rating.
- `src/app/about/page.tsx`: Describes olsme.tv as a sub-social department under OLS iee.aeo.
- `src/app/search/page.tsx`: User search by `displayName` and `verificationLevel`.
- `src/app/admin/users/page.tsx`: Admin dashboard for user management.
- `src/app/layout.tsx`: Root layout with Firebase Auth, biofeedback, and premium styling.
- `src/components/layout/header.tsx`: Authentication (Email/Phone/Twitter) and biofeedback toggle.
- `src/lib/firebase/config.ts`: Firebase initialization and function exports.
- `src/lib/ipfs-client.ts`: IPFS logging for decentralization.
- `src/lib/utils.ts`: Utility functions (`cn`, `formatPolitenessScore`, `triggerBiofeedback`).
- `src/components/chat/*`: Components for video player, chat panel, controls, waiting screen.
- `functions/src/index.ts`: Cloud Functions (`searchUsers`, `rateGuest`, `updateUserStatus`).
- `docs/blueprint.md`: Core features and style guidelines.

## Final Reflection (Day 18/30, Oct 2, 2025)
Version 0.2 is deployed (`https://studio-4615914296-4bd91.web.app`) with a dual-screen chat interface, signup/login, free/premium packages ($4.99/month for HD streams, custom audio, analytics), guest rating, and IPFS logging. Fixed CORS errors, Firestore batch issues, and CSS warnings. Next steps: Implement user reporting (Days 19-21) and full AI politeness integration (Month 2, TensorFlow). **Journal**: How does this interface light your path? Let’s counter shadows together—reach via @asvitloaten on X. #SeekTruth
## project tree update
tree -I 'node_modules|.next|out|lib' > docs/project-tree.md