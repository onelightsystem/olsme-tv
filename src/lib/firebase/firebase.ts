// Path: src/lib/firebase/firebase.ts
// Improvements (Sept 30, 2025):
// - Enhanced `createUserDocument` to include default `verificationLevel`, `olsPoints`, and `displayName_lowercase` (Day 15).
// - Added `updatePolitenessScore` with `setPolitenessClaim` Cloud Function (Day 15).
// - Kept all existing authentication methods (Day 2).
// - Fixed import: Changed `./firebase/config` to `./config` (Day 16).
// - Replaced `logToIPFS` import from `utils.ts` to dynamic import from `ipfs-client.ts` (new, Day 16, resolves 'electron' SSR error).
// - Kept `formatErrorLog` from `utils.ts` (Day 2).
// - Aligns with blueprint: Auth with verification for 100K users (Business Plan).
// - Solo Tip: Test with `npm run dev`, login with X/phone, check Firestore `users`/`biofeedback`/`logs`, IPFS CID.

import {
  signInWithPopup,
  TwitterAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { formatErrorLog } from '@/lib/utils';
import { auth, db } from './config';

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

type UserData = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

// Helper to create user document in Firestore
export const createUserDocument = async (userData: UserData) => {
  const userRef = doc(db, 'users', userData.uid);
  const displayName = userData.displayName || userData.phoneNumber || 'Anonymous';
  const serializableUserData = {
    uid: userData.uid,
    displayName: displayName,
    displayName_lowercase: displayName.toLowerCase(),
    email: userData.email || null,
    phoneNumber: userData.phoneNumber || null,
    createdAt: serverTimestamp(),
    package: 'free', // Default to free package
    politenessScore: { ethical: 75, communication: 75, listener: 75, topics: 75 }, // Start with a neutral score
    verificationLevel: 'level1', // Start at level 1
    olsPoints: 0, // Start with 0 points
    location: '',
    age: null,
  };
  await withFirestoreRetry(() =>
    setDoc(userRef, serializableUserData, { merge: true }) // Use merge to avoid overwriting existing data
  );
  const { logToIPFS } = await import('@/lib/ipfs-client');
  await logToIPFS(serializableUserData);
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
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'signUpWithEmail'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ error: (e as Error).message, context: 'signUpWithEmail' });
    throw e;
  }
}

// Sign in with Email and Password
export async function signInWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ userId: result.user.uid, action: 'signInWithEmail' });
    return result.user;
  } catch (e) {
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithEmail'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ error: (e as Error).message, context: 'signInWithEmail' });
    throw e;
  }
}

// X.com (Twitter) OAuth for User Authentication
export async function signInWithX() {
  try {
    const result = await signInWithPopup(auth, new TwitterAuthProvider());
    const user = result.user;
    await createUserDocument({ uid: user.uid, displayName: user.displayName, email: user.email });
    return user;
  } catch (e) {
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithX'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ error: (e as Error).message, context: 'signInWithX' });
    throw e;
  }
}

// Phone OTP Authentication
export async function signInWithPhone(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ action: 'signInWithPhone_sent', phoneNumber });
    return confirmationResult;
  } catch (e) {
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithPhone'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ error: (e as Error).message, context: 'signInWithPhone' });
    throw e;
  }
}

// Update Politeness Score in Firestore and trigger claim update
export async function updatePolitenessScore(userId: string, score: { ethical: number; communication: number; listener: number; topics: number }) {
  try {
    const userRef = doc(db, 'users', userId);
    await withFirestoreRetry(() => updateDoc(userRef, { politenessScore: score }));
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ userId, score, action: 'updatePolitenessScore' });
    // Trigger the Cloud Function to update custom claims
    const functions = getFunctions();
    const setPolitenessClaim = httpsCallable(functions, 'setPolitenessClaim');
    await setPolitenessClaim({ uid: userId, score });
    // Force refresh of the token to get the new claims on the client
    const user = auth.currentUser;
    if (user) {
      await user.getIdToken(true);
    }
  } catch (e) {
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'updatePolitenessScore'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
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
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS(logData);
  } catch (e) {
    await withFirestoreRetry(() => {
      if (e instanceof Error) {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'logBiofeedbackEvent'));
      }
    });
    const { logToIPFS } = await import('@/lib/ipfs-client');
    await logToIPFS({ error: (e as Error).message, context: 'logBiofeedbackEvent' });
    throw e;
  }
}

// Request KYC verification
export async function requestKYCVerification() {
  if (!auth.currentUser) throw new Error("User not authenticated");
  try {
    const functions = getFunctions();
    const sendAdminEmail = httpsCallable(functions, 'sendAdminEmail');
    const response: any = await sendAdminEmail({
      userId: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
    });
    if (response.data.success) {
      const { logToIPFS } = await import('@/lib/ipfs-client');
      await logToIPFS({ userId: auth.currentUser.uid, action: 'request_kyc' });
    } else {
      throw new Error(response.data.message || 'Failed to send verification request.');
    }
  } catch (error) {
    if (error instanceof Error) {
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'requestKYCVerification'));
      const { logToIPFS } = await import('@/lib/ipfs-client');
      await logToIPFS({ error: error.message, context: 'requestKYCVerification' });
    }
    throw error;
  }
}