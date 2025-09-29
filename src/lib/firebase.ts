// Path: src/lib/firebase.ts
// Improvements (Oct 2, 2025):
// - Enhanced `createUserDocument` to include default `verificationLevel`, `olsPoints`, and a new `displayName_lowercase` field to support case-insensitive search.
// - Added `updatePolitenessScore` which now also triggers the `setPolitenessClaim` Cloud Function.
// - Kept all existing authentication methods.

import { auth, db } from './firebase/config';
import {
  signInWithPopup,
  TwitterAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const displayName = user.displayName || user.phoneNumber || 'Anonymous';
  await withFirestoreRetry(() =>
    setDoc(userRef, {
      uid: user.uid,
      displayName: displayName,
      displayName_lowercase: displayName.toLowerCase(),
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      createdAt: serverTimestamp(),
      package: 'free', // Default to free package
      politenessScore: { ethical: 75, communication: 75, listener: 75, topics: 75 }, // Start with a neutral score
      verificationLevel: 'level1', // Start at level 1
      olsPoints: 0, // Start with 0 points
      location: '',
      age: null,
    }, { merge: true }) // Use merge to avoid overwriting existing data if user re-authenticates
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
    await logToIPFS({ action: 'signInWithPhone_sent', phoneNumber });
    return confirmationResult;
  } catch (e) {
    await withFirestoreRetry(() => addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithPhone')));
    await logToIPFS({ error: (e as Error).message, context: 'signInWithPhone' });
    throw e;
  }
}

// Update Politeness Score in Firestore and trigger claim update
export async function updatePolitenessScore(userId: string, score: { ethical: number; communication: number; listener: number; topics: number }) {
  try {
    const userRef = doc(db, 'users', userId);
    await withFirestoreRetry(() => updateDoc(userRef, { politenessScore: score }));
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

export async function requestKYCVerification() {
  if (!auth.currentUser) throw new Error("User not authenticated");
  try {
    const functions = getFunctions();
    const sendAdminEmail = httpsCallable(functions, 'sendAdminEmail');
    const response: any = await sendAdminEmail({ 
      userId: auth.currentUser.uid, 
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email
    });

    if (response.data.success) {
      await logToIPFS({ userId: auth.currentUser.uid, action: 'request_kyc' });
    } else {
      throw new Error(response.data.message || 'Failed to send verification request.');
    }
  } catch (error) {
    await addDoc(collection(db, 'logs'), formatErrorLog(error, 'requestKYCVerification'));
    await logToIPFS({ error: (error as Error).message, context: 'requestKYCVerification' });
    throw error;
  }
}


export { createUserDocument };
