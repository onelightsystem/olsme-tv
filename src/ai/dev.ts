// Path: src/ai/dev.ts
// Improvements (Sept 28, 2025):
// - Kept dotenv and Genkit initialization (done, Day 5).
// - Added Firestore/IPFS logging for dev errors (new, Day 2/4).
// - Aligns with blueprint: Prepares AI Politeness Monitor for Cloud Functions (Day 5).
// - Solo Tip: Test with `npm run genkit:dev`, check Firestore `logs`, IPFS CID.

import { config } from 'dotenv';
import { db } from '@/lib/firebase/config';
import { formatErrorLog } from '@/lib/utils';
import { logToIPFS } from '@/lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import '@ai/flows/generate-politeness-prompt';

config();

process.on('unhandledRejection', async (error) => {
  if (error instanceof Error) {
    await addDoc(collection(db, 'logs'), formatErrorLog(error, 'genkitDev'));
    await logToIPFS({ error: error.message, context: 'genkitDev' });
  }
  console.error('Unhandled rejection in Genkit dev:', error);
});
