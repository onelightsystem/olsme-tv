// Path: src/lib/firebase.ts
// Improvements (Oct 1, 2025):
// - Added Email/Password authentication (`signUpWithEmail`, `signInWithEmail`).
// - Enhanced `signInWithX` and `signUpWithEmail` to create a user document in Firestore with a default 'free' package.
// - Kept phone OTP (`signInWithPhone`), politeness score updates, and biofeedback logging.
// - Added user document creation on sign-up to include `package: 'free'`.
// - Aligns with blueprint: Establishes a clear path for Free/Premium user packages.

import { auth, db } from './firebase/config';
import {
  signInWithPopup,
  TwitterAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { formatErrorLog, logToIPFS } from '@lib/utils';

// Retry logic for Firestore writes
async function withFirestoreRetry<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      attempts++;
      if (attempts === maxAttempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('Firestore retry limit reached');
}

// Helper to create user document in Firestore
const createUserDocument = async (user: { uid: string; displayName?: string | null; email?: string | null; phoneNumber?: string | null }) => {
  const userRef = doc(db, 'users', user.uid);
  await withFirestoreRetry(() =>
    setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      createdAt: new Date(),
      package: 'free', // Default to free package
      politenessScore: { ethical: 0, communication: 0, listener: 0, topics: 0 },
    })
  );
  await logToIPFS({ userId: user.uid, action: 'createUserDocument' });
};

// Sign up with Email and Password
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    await updateProfile(user, { displayName });
    await createUserDocument({ uid: user.uid, displayName, email: user.email });
    return user;
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'signUpWithEmail')));
    await logToIPFS({ error: (e as Error).message, context: 'signUpWithEmail' });
    throw e;
  }
}

// Sign in with Email and Password
export async function signInWithEmail(email: string, password: string) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await logToIPFS({ userId: result.user.uid, action: 'signInWithEmail' });
        return result.user;
    } catch (e) {
        await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithEmail')));
        await logToIPFS({ error: (e as Error).message, context: 'signInWithEmail' });
        throw e;
    }
}

// X.com (Twitter) OAuth for User Authentication
export async function signInWithX() {
  try {
    const result = await signInWithPopup(auth, new TwitterAuthProvider());
    const user = result.user;
    // This will create or overwrite the user document
    await createUserDocument(user);
    return user;
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithX')));
    await logToIPFS({ error: (e as Error).message, context: 'signInWithX' });
    throw e;
  }
}

// Phone OTP Authentication
export async function signInWithPhone(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    // User document is created after confirmation in the UI component
    await logToIPFS({ action: 'signInWithPhone_sent', phoneNumber });
    return confirmationResult;
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithPhone')));
    await logToIPFS({ error: (e as Error).message, context: 'signInWithPhone' });
    throw e;
  }
}

// Update Politeness Score in Firestore
export async function updatePolitenessScore(userId: string, score: { ethical: number; communication: number; listener: number; topics: number }) {
  try {
    const userRef = doc(db, 'users', userId);
    await withFirestoreRetry(() => updateDoc(userRef, { politenessScore: score }));
    await logToIPFS({ userId, score, action: 'updatePolitenessScore' });
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'updatePolitenessScore')));
    await logToIPFS({ error: (e as Error).message, context: 'updatePolitenessScore' });
    throw e;
  }
}

// Log biofeedback event to Firestore
export async function logBiofeedbackEvent(userId: string, event: { type: string; value: number; cid?: string }) {
  try {
    const logData = {
      userId,
      type: event.type,
      value: event.value,
      cid: event.cid || null,
      timestamp: new Date(),
    };
    await withFirestoreRetry(() => addDoc(collection(db, 'biofeedback'), logData));
    await logToIPFS(logData);
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'logBiofeedbackEvent')));
    await logToIPFS({ error: (e as Error).message, context: 'logBiofeedbackEvent' });
    throw e;
  }
}

export { createUserDocument };
