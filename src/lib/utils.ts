
// Path: src/lib/utils.ts
// Improvements (Oct 12, 2025):
// - Added log aggregation with buffer to reduce Firestore write frequency (flushes every 10 seconds or at 10 entries).
// - Enhanced formatPolitenessScore to handle undefined userId (resolves TypeError).
// - Added premium user check in triggerBiofeedback for custom audio URLs.
// - Added Firestore logging for validation failures in validateBiofeedbackEvent.
// - Added accessibility option to skip audio for users with sound disabled.
// - Aligns with blueprint: OLS biofeedback (Red Sea waves) and AI politeness badges.
// - Solo Tip: Test with `npm run dev`, trigger biofeedback via /search, check Firestore `biofeedback_events` and `logs` for buffered entries.
'use client';
import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {logBiofeedbackEvent, db} from '@lib/firebase/config';
import {collection, doc, getDoc, writeBatch} from 'firebase/firestore';
import {v4 as uuidv4} from 'uuid';
let logBuffer: Array<Record<string, unknown>> = []; // Buffer to store logs before writing to Firestore
let flushTimeout: NodeJS.Timeout | null = null; // Timeout for periodic flush

/**
 * Combines class names using clsx and tailwind-merge for consistent styling.
 * @param inputs - Array of class values to combine.
 * @returns Combined class names as a string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Generates a unique correlation ID for tracing logs across services.
 * @returns UUID string for log correlation.
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

interface PolitenessScore {
  ethical: number;
  communication: number;
  listener: number;
  topics: number;
}

/**
 * Formats a politeness score and returns an object with the average, badge, and message.
 * @param score - The politeness score object with ethical, communication, listener, and topics values.
 * @param userId - Optional user ID. If provided, appends a premium upsell message to the result.
 *                 If undefined, the message is returned without the upsell.
 * @returns An object with the rounded average score, badge (Gold/Silver/Bronze), and message.
 */
export function formatPolitenessScore(score: PolitenessScore, userId?: string) {
  const average = (score.ethical + score.communication + score.listener + score.topics) / 4;
  const badge = average >= 80 ? 'Gold' : average >= 60 ? 'Silver' : 'Bronze';
  let message = average >= 80 ? 'Radiant Light' : average >= 60 ? 'Growing Glow' : 'Seeking Truth';

  if (userId && typeof userId === 'string') {
    message += ' - Unlock detailed insights with your Premium subscription!';
  }

  return {
    average: Math.round(average),
    badge,
    message
  };
}

/**
 * Validates biofeedback event data before logging to Firestore.
 * @param userId - The user ID associated with the event.
 * @param event - The biofeedback event object with type, value, and optional CID.
 * @throws Error if validation fails, logging the error to Firestore.
 */
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
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addToLogBuffer({
      error: errorMessage,
      context: 'validateBiofeedbackEvent',
      userId,
      level: 'error',
      correlationId: generateCorrelationId(),
      timestamp: new Date()
    });
    throw e;
  }
}

/**
 * Triggers biofeedback with audio playback, respecting user sound preferences.
 * @param userId - The user ID for whom to trigger biofeedback.
 * @param type - The type of biofeedback ('wait' or 'chat').
 * @param audioUrl - The URL of the audio file (defaults to Red Sea waves).
 * @returns Promise resolving to success status and message.
 * @throws Error if audio playback or validation fails, logging to Firestore.
 */
export async function triggerBiofeedback(
  userId: string,
  type: 'wait' | 'chat',
  audioUrl: string = 'https://olsme.com/assets/red-sea-waves.mp3'
) {
  const correlationId = generateCorrelationId();
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const soundEnabled = userDoc.exists() ? userDoc.data()?.settings?.soundEnabled !== false : true;
    if (!soundEnabled) {
      return {success: true, message: 'Biofeedback skipped: User sound disabled'};
    }
    const isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';
    const finalAudioUrl = isPremium && userDoc.data()?.customAudioUrl ? userDoc.data()?.customAudioUrl : audioUrl;
    const response = await fetch(finalAudioUrl, {method: 'HEAD'});
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) {
      throw new Error('Invalid audio URL');
    }
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
    const event = {type: `audio_${type}`, value: 1, correlationId};
    await validateBiofeedbackEvent(userId, event);
    await logBiofeedbackEvent(userId, event);
    addToLogBuffer({
      userId,
      action: 'biofeedback_triggered',
      level: 'info',
      correlationId,
      mindfulness: `audio_${type}`,
      timestamp: new Date()
    });
    return {success: true, message: `Biofeedback triggered: ${isPremium ? 'Custom audio' : 'Red Sea waves'}`};
  } catch (e: unknown) {
    const errorEvent = {type: 'error', value: 0, correlationId};
    await validateBiofeedbackEvent(userId, errorEvent);
    await logBiofeedbackEvent(userId, errorEvent);
    const errorMessage = e instanceof Error ? e.message : String(e);
    addToLogBuffer({
      error: errorMessage,
      context: 'triggerBiofeedback',
      userId,
      level: 'error',
      correlationId,
      timestamp: new Date()
    });
    throw new Error(`Biofeedback failed: ${errorMessage}`);
  }
}

/**
 * Formats an error log with consistent structure and correlation ID.
 * @param error - The error object or message.
 * @param context - The context of the error (e.g., function name).
 * @param userId - The user ID associated with the error.
 * @param correlationId - Unique ID to trace related logs.
 * @returns Formatted error log object.
 */
export function formatErrorLog(error: unknown, context: string, userId: string = 'anonymous', correlationId: string = generateCorrelationId()) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    userId,
    context,
    error: errorMessage,
    level: 'error',
    correlationId,
    timestamp: new Date()
  };
}

/**
 * Formats an info log with consistent structure and optional mindfulness context.
 * @param action - The action being logged (e.g., 'send_message').
 * @param userId - The user ID associated with the action.
 * @param correlationId - Unique ID to trace related logs.
 * @param mindfulness - Optional mindfulness context (e.g., 'message_sent').
 * @returns Formatted info log object.
 */
export function formatInfoLog(action: string, userId: string, correlationId: string, mindfulness?: string) {
  return {
    userId,
    action,
    level: 'info',
    correlationId,
    mindfulness,
    timestamp: new Date()
  };
}

/**
 * Adds a log entry to the in-memory buffer for aggregation.
 * @param log - The log object to buffer (error or info).
 */
export function addToLogBuffer(log: Record<string, unknown>) {
  logBuffer.push(log);
  if (logBuffer.length >= 10) {
    flushLogBuffer();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogBuffer, 10000); // Flush every 10 seconds
  }
}

/**
 * Flushes the log buffer to Firestore, writing all buffered logs in a single batch.
 * Clears the buffer and timeout after completion.
 */
export async function flushLogBuffer() {
  if (logBuffer.length === 0) return;
  try {
    const batch = writeBatch(db);
    logBuffer.forEach(log => batch.set(doc(collection(db, 'logs')), log));
    await batch.commit();
    logBuffer = [];
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`Failed to flush log buffer: ${errorMessage}`);
    // Keep logs in buffer for next attempt
  }
}
