// Path: src/lib/utils.ts
// Improvements (Oct 2, 2025):
// - Fixed `formatPolitenessScore` to handle undefined `userId` (resolves TypeError).
// - Enhanced `formatPolitenessScore` to include premium user messages (freemium model).
// - Added premium user check in `triggerBiofeedback` for custom audio URLs.
// - Added Firestore logging for validation failures in `validateBiofeedbackEvent`.
// - Added accessibility option to skip audio for users with sound disabled.
// - Aligns with blueprint: OLS biofeedback (Red Sea waves) and AI politeness badges.
// - Solo Tip: Test with `npm run dev`, trigger biofeedback via /search, check Firestore `biofeedback_events`.
'use client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logBiofeedbackEvent, db, auth } from '@lib/firebase/config';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PolitenessScore {
  ethical: number;
  communication: number;
  listener: number;
  topics: number;
}

export async function formatPolitenessScore(score: PolitenessScore, userId?: string) {
  const average = (score.ethical + score.communication + score.listener + score.topics) / 4;
  const badge = average >= 80 ? 'Gold' : average >= 60 ? 'Silver' : 'Bronze';
  let message = average >= 80 ? 'Radiant Light' : average >= 60 ? 'Growing Glow' : 'Seeking Truth';

  // Check for premium user only if userId is provided
  let isPremium = false;
  if (userId && typeof userId === 'string') {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';
      if (isPremium) {
        message += ' - Unlock detailed insights with your Premium subscription!';
      }
    } catch (e: any) {
      await addDoc(collection(db, 'logs'), {
        error: e.message,
        context: 'formatPolitenessScore',
        userId: userId || 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    average: Math.round(average),
    badge,
    message,
  };
}

async function validateBiofeedbackEvent(userId: string, event: { type: string; value: number; cid?: string }) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID for biofeedback event');
    }
    if (!event.type || typeof event.type !== 'string' || !['audio_wait', 'audio_chat', 'error', 'ipfs_log', 'ipfs_error'].includes(event.type)) {
      throw new Error('Invalid biofeedback event type');
    }
    if (typeof event.value !== 'number' || event.value < 0 || event.value > 1) {
      throw new Error('Invalid biofeedback event value');
    }
  } catch (e: any) {
    await addDoc(collection(db, 'logs'), {
      error: e.message,
      context: 'validateBiofeedbackEvent',
      userId,
      timestamp: new Date().toISOString(),
    });
    throw e;
  }
}

export async function triggerBiofeedback(
  userId: string,
  type: 'wait' | 'chat',
  audioUrl: string = 'https://olsme.com/assets/red-sea-waves.mp3'
) {
  try {
    // Check user preferences for audio
    const userDoc = await getDoc(doc(db, 'users', userId));
    const soundEnabled = userDoc.exists() ? userDoc.data()?.settings?.soundEnabled !== false : true;
    if (!soundEnabled) {
      return { success: true, message: 'Biofeedback skipped: User sound disabled' };
    }
    // Check for premium user custom audio
    const isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';
    const finalAudioUrl = isPremium && userDoc.data()?.customAudioUrl ? userDoc.data()?.customAudioUrl : audioUrl;
    // Validate audio URL
    const response = await fetch(finalAudioUrl, { method: 'HEAD' });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) {
      throw new Error('Invalid audio URL');
    }
    // Retry logic for audio playback
    let attempts = 0;
    const maxAttempts = 3;
    let audio: HTMLAudioElement | null = null;
    while (attempts < maxAttempts) {
      try {
        audio = new Audio(finalAudioUrl);
        await audio.play();
        break;
      } catch (e) {
        attempts++;
        if (attempts === maxAttempts) throw e;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
    const event = { type: `audio_${type}`, value: 1 };
    await validateBiofeedbackEvent(userId, event);
    await logBiofeedbackEvent(userId, event);
    return { success: true, message: `Biofeedback triggered: ${isPremium ? 'Custom audio' : 'Red Sea waves'}` };
  } catch (e: any) {
    const errorEvent = { type: 'error', value: 0 };
    await validateBiofeedbackEvent(userId, errorEvent);
    await logBiofeedbackEvent(userId, errorEvent);
    await addDoc(collection(db, 'logs'), {
      error: e.message,
      context: 'triggerBiofeedback',
      userId,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Biofeedback failed: ${e.message}`);
  }
}

export function formatErrorLog(error: any, context: string, userId: string = 'unknown') {
  return {
    error: error.message || String(error),
    timestamp: new Date().toISOString(),
    context,
    stack: error.stack || 'No stack trace',
    userId,
  };
}