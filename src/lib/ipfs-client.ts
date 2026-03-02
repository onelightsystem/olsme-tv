// src/lib/ipfs-client.ts
import {logBiofeedbackEvent, db} from '@lib/firebase/config';
import {collection, addDoc} from 'firebase/firestore';
import {triggerBiofeedback} from '@lib/utils';
import {v4 as uuidv4} from 'uuid';

interface IPFSLogData {
  userId?: string;
  action?: string;
  correlationId?: string;
  [key: string]: unknown;
}

let warnedMissingInfuraAuth = false;

async function safeAddLog(entry: Record<string, unknown>) {
  try {
    await addDoc(collection(db, 'logs'), entry);
  } catch {
    console.warn('Skipped Firestore log write (permission/network issue).');
  }
}

async function safeAddIpfsLog(entry: Record<string, unknown>) {
  try {
    await addDoc(collection(db, 'ipfs_logs'), entry);
  } catch {
    console.warn('Skipped Firestore ipfs_logs write (permission/network issue).');
  }
}

async function safeLogBiofeedback(userId: string, event: {type: string; value: number; cid?: string; duration?: number}) {
  try {
    await logBiofeedbackEvent(userId, event);
  } catch {
    console.warn('Skipped biofeedback event write (permission/network issue).');
  }
}

export async function logToIPFS(data: IPFSLogData) {
  if (typeof window === 'undefined') {
    console.warn('IPFS logging skipped during SSR');
    return null;
  }
  const correlationId = data.correlationId || uuidv4();
  const startTime = performance.now();
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid IPFS data payload');
    }
    const userId = data.userId || 'anonymous';
    const action = data.action || 'unspecified';

    let cid: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch('/api/ipfs-upload', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...data, correlationId})
        });
        if (response.status === 503) {
          if (!warnedMissingInfuraAuth) {
            warnedMissingInfuraAuth = true;
            console.warn('IPFS logging disabled: server-side IPFS credentials not configured. Set IPFS_AUTH_HEADER or IPFS_INFURA_PROJECT_ID/IPFS_INFURA_PROJECT_SECRET.');
          }
          await safeAddLog({
            userId,
            action,
            context: 'ipfs_skipped_no_auth',
            correlationId,
            timestamp: new Date().toISOString()
          });
          return null;
        }
        if (response.status === 401) {
          console.warn('IPFS upload unauthorized; skipping upload and using Firestore fallback.');
          await safeAddLog({
            userId,
            action,
            context: 'ipfs_unauthorized',
            error: 'Unauthorized',
            correlationId,
            timestamp: new Date().toISOString()
          });
          return null;
        }
        if (!response.ok) {
          throw new Error(`IPFS API responded with status ${response.status}`);
        }
        const json = await response.json() as {cid?: string};
        cid = json.cid ?? null;
        break;
      } catch (err: unknown) {
        attempts++;
        if (attempts === maxAttempts) {
          console.warn('IPFS upload failed, falling back to local Firestore');
          await safeAddLog({
            userId,
            action,
            context: 'ipfs_fallback',
            error: 'IPFS upload failed',
            correlationId,
            timestamp: new Date().toISOString()
          });
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const duration = performance.now() - startTime;
    const event = cid ? {type: 'ipfs_log', value: 1, cid, duration} : {type: 'ipfs_log', value: 1, duration};
    await safeLogBiofeedback(userId, event);
    await safeAddIpfsLog({
      userId,
      action,
      cid,
      correlationId,
      duration,
      timestamp: new Date().toISOString()
    });
    try {
      await triggerBiofeedback(userId, 'chat', 'https://olsme.com/assets/red-sea-waves.mp3');
    } catch {
      console.warn('Skipping biofeedback trigger after IPFS log failure.');
    }
    return cid;
  } catch (e: unknown) {
    const duration = performance.now() - startTime;
    const errorEvent = {type: 'ipfs_error', value: 0, duration};
    await safeLogBiofeedback(data.userId || 'system', errorEvent);
    const errorMessage = e instanceof Error ? e.message : String(e);
    await safeAddLog({
      error: errorMessage,
      context: 'logToIPFS',
      userId: data.userId || 'unknown',
      level: 'error',
      correlationId,
      timestamp: new Date().toISOString()
    });
    console.error(`IPFS logging failed: ${errorMessage}`);
    return null;
  }
}
