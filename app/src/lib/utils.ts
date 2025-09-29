// Path: src/lib/utils.ts
// Improvements (Sept 29, 2025):
// - Kept `cn` for Tailwind class merging (done, shadcn) to style “Let’s Chat” button with #FFD700 gold (blueprint).
// - Kept `formatPolitenessScore` (done, Day 5) for AI Politeness Monitor badges (Gold/Silver/Bronze).
// - Kept `triggerBiofeedback` (done, Day 11) to play Red Sea audio prompts during chat waits, tied to OLS biofeedback.
// - Kept `formatErrorLog` (done, Day 2) to standardize Firestore error logs for auth/import issues, enhancing solo debugging.
// - Kept `logToIPFS` (done, Day 4) for decentralized politeness score logging, countering elite censorship (IPFS stub).
// - Fixed import: Corrected import of `logBiofeedbackEvent` to point to `@lib/firebase`.
// - Added retry logic for biofeedback events (new, Day 11).
// - Kept validation for IPFS logging and biofeedback events (done, Day 4/11).
// - Aligns with freemium: Premium users ($4.99) unlock detailed score messages and custom audio prompts (Business Plan).
// - Solo Tip: Test with `npm run dev`, log errors/biofeedback in Firestore (db.collection('logs')), verify IPFS mocks.

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logBiofeedbackEvent } from '@/lib/firebase';

// Merge classes with Tailwind support (done, shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format politeness score for UI (done, Day 5)
export function formatPolitenessScore(score: { ethical: number; communication: number; listener: number; topics: number }) {
  const average = (score.ethical + score.communication + score.listener + score.topics) / 4;
  return {
    average: Math.round(average),
    badge: average >= 80 ? 'Gold' : average >= 60 ? 'Silver' : 'Bronze',
    message: average >= 80 ? 'Radiant Light' : average >= 60 ? 'Growing Glow' : 'Seeking Truth',
  };
}

// Validate biofeedback event (done, Day 11)
function validateBiofeedbackEvent(userId: string, event: { type: string; value: number; cid?: string }) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID for biofeedback event');
  }
  if (!event.type || typeof event.type !== 'string' || !['audio_wait', 'audio_chat', 'error', 'ipfs_log', 'ipfs_error'].includes(event.type)) {
    throw new Error('Invalid biofeedback event type');
  }
  if (typeof event.value !== 'number' || event.value < 0 || event.value > 1) {
    throw new Error('Invalid biofeedback event value');
  }
}

// Trigger biofeedback audio prompt (done, Day 11)
export async function triggerBiofeedback(userId: string, type: 'wait' | 'chat', audioUrl: string = 'https://olsme.com/assets/red-sea-waves.mp3') {
  try {
    // Validate audio URL (done, Day 11)
    const response = await fetch(audioUrl, { method: 'HEAD' });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) {
      throw new Error('Invalid audio URL');
    }
    // Retry logic for audio playback (new, Day 11)
    let attempts = 0;
    const maxAttempts = 3;
    let audio: HTMLAudioElement | null = null;
    while (attempts < maxAttempts) {
      try {
        audio = new Audio(audioUrl);
        await audio.play();
        break;
      } catch (e) {
        attempts++;
        if (attempts === maxAttempts) throw e;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
    const event = { type: `audio_${type}`, value: 1 };
    validateBiofeedbackEvent(userId, event);
    await logBiofeedbackEvent(userId, event);
    return { success: true, message: 'Biofeedback triggered: Red Sea waves' };
  } catch (e) {
    const errorEvent = { type: 'error', value: 0 };
    validateBiofeedbackEvent(userId, errorEvent);
    if (e instanceof Error) {
        await logBiofeedbackEvent(userId, errorEvent);
        throw new Error(`Biofeedback failed: ${e.message}`);
    }
  }
}

// Format error for Firestore logging (done, Day 2)
export function formatErrorLog(error: any, context: string) {
  return {
    error: error.message || String(error),
    timestamp: new Date(),
    context,
    stack: error.stack || 'No stack trace',
  };
}

// Log data to IPFS for decentralization (done, Day 4)
export async function logToIPFS(data: any) {
  try {
    // Validate data (done, Day 4)
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid IPFS data');
    }
    const ipfs = await import('ipfs-http-client').then(({ create }) => create({ url: process.env.NEXT_PUBLIC_IPFS_URL || 'https://ipfs.infura.io:5001' }));
    const result = await ipfs.add(JSON.stringify(data));
    const cid = result.cid.toString();
    const event = { type: 'ipfs_log', value: 1, cid };
    validateBiofeedbackEvent('system', event);
    await logBiofeedbackEvent('system', event);
    return cid;
  } catch (e) {
    const errorEvent = { type: 'ipfs_error', value: 0 };
    validateBiofeedbackEvent('system', errorEvent);
    await logBiofeedbackEvent('system', errorEvent);
    if (e instanceof Error) {
        throw new Error(`IPFS logging failed: ${e.message}`);
    }
  }
}
