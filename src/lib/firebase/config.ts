// Path: src/lib/firebase/config.ts
// Improvements (Oct 1, 2025):
// - Added `signUpWithEmail` and `signInWithEmail` to the re-exports.
// - Kept Firebase app initialization, `auth`, `db` exports.
// - Centralizes all auth-related functions for easier import across the app.
// - Added Firebase Analytics.

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDG-wbTAUOGL7gzqhxcexfamr83KXEdNGY",
  authDomain: "studio-4615914296-4bd91.firebaseapp.com",
  projectId: "studio-4615914296-4bd91",
  storageBucket: "studio-4615914296-4bd91.appspot.com",
  messagingSenderId: "978616630819",
  appId: "1:978616630819:web:aa85677e46fba897dc3b96",
  measurementId: "G-L7X50LCZGS"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics and export it
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { analytics };
