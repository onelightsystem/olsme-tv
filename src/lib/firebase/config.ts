// Path: src/lib/firebase/config.ts
// Improvements (Sept 29, 2025):
// - Kept Firebase app initialization, `auth`, `db` exports (done, Day 2).
// - Fixed re-export of `logBiofeedbackEvent`, `signInWithX`, `signInWithPhone`, `updatePolitenessScore` from `firebase.ts` (new, resolves console error).
// - Aligns with blueprint: Centralized Firebase setup for 100K users (Business Plan).
// - Solo Tip: Test with `npm run dev`, trigger biofeedback, check Firestore `biofeedback`/`logs`.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { signInWithX, signInWithPhone, updatePolitenessScore, logBiofeedbackEvent } from '../firebase';

const firebaseConfig = {
  apiKey: "AIzaSyDG-wbTAUOGL7gzqhxcexfamr83KXEdNGY",
  authDomain: "studio-4615914296-4bd91.firebaseapp.com",
  projectId: "studio-4615914296-4bd91",
  storageBucket: "studio-4615914296-4bd91.firebasestorage.app",
  messagingSenderId: "978616630819",
  appId: "1:978616630819:web:aa85677e46fba897dc3b96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-export Firebase functions
export { signInWithX, signInWithPhone, updatePolitenessScore, logBiofeedbackEvent };