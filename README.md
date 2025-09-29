# olsme.tv - Mindful Video Chat Platform

Welcome to **olsme.tv**, an OLS-inspired video chat platform for random, mindful socializing, countering the toxicity of platforms like Ome.tv with AI-driven politeness IDs, biofeedback for calming interactions, and anti-censorship via IPFS. Built with Next.js, Firebase, and WebRTC, it targets global users seeking truth and connection. The MVP, launched in Month 1 (Sept 2025), features a freemium model ($4.99 premium for HD streams, custom prompts, analytics).

## Project Overview
- **Purpose**: Create a mindful video chat experience with AI politeness scoring, biofeedback (Red Sea wave audio), and decentralized logging (IPFS).
- **Tech Stack**:
  - **Frontend**: Next.js 15.5.3 (Turbopack), React, PT Sans, #FFD700 gold accents, Radix dialogs, shadcn/ui.
  - **Backend**: Firebase (Firestore, Authentication, Cloud Functions), WebRTC for peer-to-peer video.
  - **AI**: Firebase ML Kit/TensorFlow Lite for politeness analysis (mocked in MVP).
  - **Decentralization**: IPFS for logging, Polygon stubs for future IDs.
- **Features**:
  - Free Package: Basic WebRTC chats, politeness score averages.
  - Premium Package ($4.99): HD streams, custom audio prompts, detailed politeness analytics.
  - Verification Levels: Bronze (<60), Silver (60–79), Gold (80+) based on politeness scores.
  - User Search: Search users by `displayName` and `verificationLevel` (planned).
- **Timeline**: MVP launch in 3-6 months (Dec 2025–Mar 2026), $50,000 budget.
- **Marketing**: Announce on X (@asvitloaten): “olsme.tv prototype live via Firebase Studio—mindful chats awakening humanity! #SeekTruth”.

## Getting Started
To run the project locally:

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Twitter Developer API Key/Secret
- IPFS node or Infura account

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/olsme-tv.git
   cd olsme-tv
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```env
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-auth-domain
   FIREBASE_PROJECT_ID=studio-4615914296-4bd91
   FIREBASE_STORAGE_BUCKET=your-storage-bucket
   FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_IPFS_URL=https://ipfs.infura.io:5001
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:9002` to see the app.

### Firebase Setup
1. Create a Firebase project (`studio-4615914296-4bd91`) in Firebase Console.
2. Enable Firestore, Authentication (Twitter, Phone), and Cloud Functions.
3. Add `localhost:9002` to authorized domains in Authentication > Settings.
4. Deploy Firestore security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /prompts/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /reports/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /control_logs/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /politeness_scores/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /biofeedback/{document=**} {
         allow read, write: if request.auth != null;
       }
       match /logs/{document=**} {
         allow write: if true;
         allow read: if request.auth != null;
       }
       match /premium_content/{document=**} {
         allow read, write: if request.auth != null && (request.auth.token.isPremium == true || request.auth.token.verificationLevel == 'gold');
       }
     }
   }
   ```
5. Deploy Cloud Functions:
   ```bash
   firebase deploy --only functions
   ```

### Key Files
- `src/app/page.tsx`: Main chat flow (idle, waiting, connected) with WebRTC and Firebase Auth.
- `src/components/layout/header.tsx`: Authentication (Twitter, Phone) and biofeedback toggle.
- `src/lib/firebase/config.ts`: Firebase initialization and function exports.
- `src/lib/utils.ts`: Utility functions (`cn`, `formatPolitenessScore`, `triggerBiofeedback`, `logToIPFS`).
- `src/components/chat/*`: Components for video player, chat panel, controls, waiting screen.
- `functions/index.js`: Cloud Functions for politeness claims and user search (planned).

## Firebase Studio Tasks
To enhance authentication, verification, and search:
1. **Authentication (Free/Premium Packages)**:
   - Enable Twitter/Phone auth in Firebase Studio.
   - Implement free (basic chats) and premium ($4.99, HD streams, analytics) packages via Firestore `users` and custom claims (`isPremium`).
   - Use Cloud Function `upgradeToPremium` to handle package upgrades.
2. **Verification Levels**:
   - Add verification levels (Bronze, Silver, Gold) based on `politenessScore` in `users`.
   - Use Cloud Function `setPolitenessClaim` to set `verificationLevel` custom claims.
   - Restrict premium features via Firestore rules.
3. **User Search**:
   - Create Firestore index on `users` for `displayName`, `verificationLevel`.
   - Implement Cloud Function `searchUsers` for case-insensitive search.
   - Generate `search.tsx` with React UI for search input/results.

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

## Contact
For questions, reach out via X (@asvitloaten). Let’s awaken humanity with mindful chats! #SeekTruth