// src/lib/ipfs-client.ts
import {logBiofeedbackEvent, db} from '@lib/firebase/config';
import {collection, addDoc} from 'firebase/firestore';
import {triggerBiofeedback} from '@lib/utils';
import {v4 as uuidv4} from 'uuid';

interface IPFSLogData {
  userId: string;
  action: string;
  correlationId?: string;
  [key: string]: unknown;
}

export async function logToIPFS(data: IPFSLogData) {
  if (typeof window === 'undefined') {
    console.warn('IPFS logging skipped during SSR');
    return null;
  }
  const correlationId = data.correlationId || uuidv4();
  const startTime = performance.now();
  try {
    if (!data || typeof data !== 'object' || !data.userId || !data.action) {
      throw new Error('Invalid IPFS data: userId and action required');
    }
    const {create} = await import('ipfs-http-client');
    const ipfs = create({url: process.env.NEXT_PUBLIC_IPFS_URL || 'https://ipfs.infura.io:5001'});
    let attempts = 0;
    const maxAttempts = 3;
    let cid: string | null = null;
    while (attempts < maxAttempts) {
      try {
        const result = await ipfs.add(JSON.stringify({...data, timestamp: new Date().toISOString(), correlationId}));
        cid = result.cid.toString();
        break;
      } catch {
        attempts++;
        if (attempts === maxAttempts) {
          console.warn('IPFS upload failed, falling back to local Firestore');
          await addDoc(collection(db, 'logs'), {
            userId: data.userId || 'unknown',
            action: data.action,
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
    const event = {type: 'ipfs_log', value: 1, cid, duration};
    await logBiofeedbackEvent(data.userId, event);
    await addDoc(collection(db, 'ipfs_logs'), {
      userId: data.userId,
      action: data.action,
      cid,
      correlationId,
      duration,
      timestamp: new Date().toISOString()
    });
    await triggerBiofeedback(data.userId, 'chat', 'https://olsme.com/assets/red-sea-waves.mp3');
    return cid;
  } catch (e: unknown) {
    const duration = performance.now() - startTime;
    const errorEvent = {type: 'ipfs_error', value: 0, duration};
    await logBiofeedbackEvent(data.userId || 'system', errorEvent);
    const errorMessage = e instanceof Error ? e.message : String(e);
    await addDoc(collection(db, 'logs'), {
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
