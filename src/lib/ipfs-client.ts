// Path: src/lib/ipfs-client.ts
// Improvements (Sept 30, 2025):
// - Created client-only module for `logToIPFS` to prevent SSR errors with `ipfs-http-client` (resolves 'electron' error).
// - Added TypeScript interface for data validation and user ID context.
// - Added retry logic for IPFS uploads (3 attempts, 1s delay).
// - Integrated OLS mindfulness: Logs trigger calming notification for premium users.
// - Solo Tip: Test with `npm run dev`, trigger IPFS logging via /search, check Firestore `ipfs_logs` and `logs`.
'use client';
import { logBiofeedbackEvent, db } from '@lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { triggerBiofeedback } from '@lib/utils';

interface IPFSLogData {
  userId: string;
  action: string;
  [key: string]: any;
}

export async function logToIPFS(data: IPFSLogData) {
  // Skip in non-browser environments (SSR)
  if (typeof window === 'undefined') {
    console.warn('IPFS logging skipped during SSR');
    return null;
  }

  try {
    // Validate data
    if (!data || typeof data !== 'object' || !data.userId || !data.action) {
      throw new Error('Invalid IPFS data: userId and action required');
    }

    const { create } = await import('ipfs-http-client');
    const ipfs = create({ url: process.env.NEXT_PUBLIC_IPFS_URL || 'https://ipfs.infura.io:5001' });

    // Retry logic (3 attempts, 1s delay)
    let attempts = 0;
    const maxAttempts = 3;
    let cid: string | null = null;
    while (attempts < maxAttempts) {
      try {
        const result = await ipfs.add(JSON.stringify({ ...data, timestamp: new Date().toISOString() }));
        cid = result.cid.toString();
        break;
      } catch (e) {
        attempts++;
        if (attempts === maxAttempts) throw e;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Log to Firestore
    const event = { type: 'ipfs_log', value: 1, cid };
    await logBiofeedbackEvent(data.userId, event);
    await addDoc(collection(db, 'ipfs_logs'), {
      userId: data.userId,
      action: data.action,
      cid,
      timestamp: new Date().toISOString(),
    });

    // Mindfulness: Trigger calming notification for premium users
    await triggerBiofeedback(data.userId, 'chat', 'https://olsme.com/assets/red-sea-waves.mp3');

    return cid;
  } catch (e: any) {
    const errorEvent = { type: 'ipfs_error', value: 0 };
    await logBiofeedbackEvent(data.userId || 'system', errorEvent);
    await addDoc(collection(db, 'logs'), {
      error: e.message,
      context: 'logToIPFS',
      userId: data.userId || 'unknown',
      timestamp: new Date().toISOString(),
    });
    console.error(`IPFS logging failed: ${e.message}`);
    return null;
  }
}