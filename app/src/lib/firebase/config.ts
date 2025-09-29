// Path: src/lib/firebase/config.ts
// Improvements (Oct 1, 2025):
// - Removed re-exports that caused a circular dependency, which was the root cause of the 404 error.
// - Kept Firebase app initialization, `auth`, `db` exports.
// - Centralizes only the core Firebase app instances.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
