// Path: src/lib/firebase.ts
// Improvements (Sept 29, 2025):
// - Kept X.com OAuth (`signInWithX`), phone OTP (`signInWithPhone`), politeness score updates (done, Day 2/5).
// - Kept `logBiofeedbackEvent` for biofeedback logging (done, Day 11).
// - Fixed import: Removed incorrect `logBiofeedbackEvent` import from `@lib/firebase/config` (new, resolves console error).
// - Used `@lib/firebase/config` for `auth`, `db` (done).
// - Added retry logic for Firestore writes (new, Day 2).
// - Kept IPFS logging for biofeedback (done, Day 4).
// - Used `formatErrorLog` from `@lib/utils` for consistent logging (done, Day 2).
// - Aligns with blueprint: Auth with verification, politeness tracking for 100K users (Business Plan).
// - Solo Tip: Test with `npm run dev`, login with X/phone, trigger biofeedback, check Firestore `users`/`biofeedback`/`logs`, IPFS CID.

import { auth, db } from './firebase/config';
import { signInWithPopup, TwitterAuthProvider, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { formatErrorLog, logToIPFS } from '@lib/utils';

// Retry logic for Firestore writes (new, Day 2)
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

// X.com (Twitter) OAuth for User Authentication (blueprint)
export async function signInWithX() {
  try {
    const result = await signInWithPopup(auth, new TwitterAuthProvider());
    const user = result.user;
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'users'), {
        uid: user.uid,
        displayName: user.displayName,
        createdAt: new Date(),
        politenessScore: { ethical: 0, communication: 0, listener: 0, topics: 0 },
      })
    );
    await logToIPFS({ userId: user.uid, action: 'signInWithX' });
    return user;
  } catch (e) {
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithX'))
    );
    await logToIPFS({ error: e.message, context: 'signInWithX' });
    throw e;
  }
}

// Phone OTP Authentication (blueprint)
export async function signInWithPhone(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (e) {
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), formatErrorLog(e, 'signInWithPhone'))
    );
    await logToIPFS({ error: e.message, context: 'signInWithPhone' });
    throw e;
  }
}

// Update Politeness Score in Firestore (Day 5)
export async function updatePolitenessScore(userId: string, score: { ethical: number; communication: number; listener: number; topics: number }) {
  try {
    const userRef = doc(db, 'users', userId);
    await withFirestoreRetry(() => updateDoc(userRef, { politenessScore: score }));
    await logToIPFS({ userId, score, action: 'updatePolitenessScore' });
  } catch (e) {
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), formatErrorLog(e, 'updatePolitenessScore'))
    );
    await logToIPFS({ error: e.message, context: 'updatePolitenessScore' });
    throw e;
  }
}

// Log biofeedback event to Firestore (Day 11)
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
    await withFirestoreRetry(() =>
      addDoc(collection(db, 'logs'), formatErrorLog(e, 'logBiofeedbackEvent'))
    );
    await logToIPFS({ error: e.message, context: 'logBiofeedbackEvent' });
    throw e;
  }
}