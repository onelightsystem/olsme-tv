// Path: src/lib/placeholder-images.ts
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added 'use client' to ensure client-side execution with `logToIPFS`.
// - Added premium user check for custom images (freemium model, $4.99/month).
// - Added biofeedback audio trigger for image loads and errors (OLS mindfulness).
// - Enhanced error handling with `userId` in logs for traceability.
// - Added batch Firestore writes and retry logic for performance.
// - Aligned with blueprint: OLS imagery, IPFS logging, freemium images.
// - Solo Tip: Test with `npm run dev`, use in `waiting-screen.tsx`, check Firestore `image_logs`/`logs`/`biofeedback_events`, IPFS CID.
'use client';
import { db, auth } from '@/lib/firebase/config';
import { formatErrorLog } from '@/lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@/lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import placeholderData from './placeholder-images.json';

// Define placeholder type
export type OlsImage = {
  id: string;
  imageUrl: string;
  description: string;
};

// Export placeholder images
export const OlsImages: OlsImage[] = placeholderData.placeholderImages;

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

// Log image load to Firestore and IPFS
export async function logImageLoad(imageId: string, context: string, userId: string = 'anonymous') {
  try {
    // Check for premium user
    const user = auth.currentUser;
    const isPremium = user ? (await getDoc(doc(db, 'users', user.uid))).data()?.package === 'premium' : false;

    const logData = { imageId, context, userId, timestamp: new Date() };
    const batch = writeBatch(db);
    batch.set(collection(db, 'image_logs').doc(), logData);
    batch.set(collection(db, 'biofeedback_events').doc(), {
      userId,
      type: 'image_load',
      value: 1,
      timestamp: new Date(),
    });
    await withFirestoreRetry(() => batch.commit());

    await logToIPFS({ ...logData, action: 'image_load', premium: isPremium });

    // Mindfulness: Trigger calming audio for premium users
    if (user && isPremium) {
      await triggerBiofeedback(user.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
    }

  } catch (e: any) {
    const batch = writeBatch(db);
    batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'logImageLoad', userId));
    batch.set(collection(db, 'biofeedback_events').doc(), {
      userId,
      type: 'error',
      value: 0,
      timestamp: new Date(),
    });
    await withFirestoreRetry(() => batch.commit());

    await logToIPFS({
      error: e.message,
      context: 'logImageLoad',
      userId,
      action: 'error',
      timestamp: new Date().toISOString(),
    });

    if (user) {
      await triggerBiofeedback(user.uid, 'chat');
    }
  }
}

// Validate image URL
export async function validateImageUrl(url: string, userId: string = 'anonymous'): Promise<boolean> {
  try {
    // Check for premium user
    const user = auth.currentUser;
    const isPremium = user ? (await getDoc(doc(db, 'users', user.uid))).data()?.package === 'premium' : false;
    const finalUrl = isPremium ? 'https://olsme.com/assets/premium-image.jpg' : url;

    const response = await fetch(finalUrl, { method: 'HEAD' });
    const isValid = response.ok && response.headers.get('content-type')?.startsWith('image/');
    if (!isValid) {
      const batch = writeBatch(db);
      batch.set(collection(db, 'logs').doc(), {
        error: 'Invalid image URL',
        url: finalUrl,
        context: 'validateImageUrl',
        userId,
        timestamp: new Date(),
      });
      batch.set(collection(db, 'biofeedback_events').doc(), {
        userId,
        type: 'error',
        value: 0,
        timestamp: new Date(),
      });
      await withFirestoreRetry(() => batch.commit());

      await logToIPFS({
        error: 'Invalid image URL',
        url: finalUrl,
        context: 'validateImageUrl',
        userId,
        action: 'error',
        timestamp: new Date().toISOString(),
      });

      if (user) {
        await triggerBiofeedback(user.uid, 'chat');
      }
    }
    return isValid;
  } catch (e: any) {
    const batch = writeBatch(db);
    batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'validateImageUrl', userId));
    batch.set(collection(db, 'biofeedback_events').doc(), {
      userId,
      type: 'error',
      value: 0,
      timestamp: new Date(),
    });
    await withFirestoreRetry(() => batch.commit());

    await logToIPFS({
      error: e.message,
      context: 'validateImageUrl',
      userId,
      action: 'error',
      timestamp: new Date().toISOString(),
    });

    if (user) {
      await triggerBiofeedback(user.uid, 'chat');
    }
    return false;
  }
}