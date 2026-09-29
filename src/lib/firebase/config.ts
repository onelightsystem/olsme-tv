// Path: src/lib/firebase/config.ts
// Improvements (Sept 30, 2025):
// - Kept Firebase app initialization, `auth`, `db`, `storage`, `analytics` exports (done, Day 2).
// - Added re-exports for `signInWithX`, `signInWithPhone`, `signUpWithEmail`, `signInWithEmail`, `updatePolitenessScore`, `logBiofeedbackEvent`, `requestKYCVerification`, `createUserDocument` (new, Day 16, resolves export errors).
// - Aligns with blueprint: Centralized Firebase setup for 100K users (Business Plan).
// - Solo Tip: Test with `npm run dev`, trigger auth/biofeedback, check Firestore `biofeedback`/`logs`.

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {getAnalytics, isSupported, Analytics} from 'firebase/analytics';
import { 
  signInWithX, 
  signInWithPhone, 
  signUpWithEmail, 
  signInWithEmail, 
  updatePolitenessScore, 
  logBiofeedbackEvent, 
  requestKYCVerification, 
  createUserDocument 
} from './firebase';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  // Public GA measurement ID (transmitted in plaintext on every analytics request; not a secret)
  measurementId: "G-L7X50LCZGS"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}
export {analytics};

// Re-export Firebase functions
export { 
  signInWithX, 
  signInWithPhone, 
  signUpWithEmail, 
  signInWithEmail, 
  updatePolitenessScore, 
  logBiofeedbackEvent, 
  requestKYCVerification, 
  createUserDocument 
};
