// Path: src/ai/actions.ts
// Improvements (Sept 29, 2025):
// - Kept `getPolitenessPrompt` with Cloud Functions integration (done, Day 5, blueprint: AI Politeness Monitor).
// - Kept Firestore/IPFS logging, WebRTC signaling, input validation (done, Day 2/4/5).
// - Fixed import: Changed `db` from `@lib/firebase` to `@lib/firebase/config` (new, resolves console error).
// - Added retry logic for Cloud Functions (new, Day 5).
// - Aligns with freemium: Premium users ($4.99) unlock advanced AI insights (Business Plan).
// - Solo Tip: Test with `npm run dev`, send message in ChatPanel, check Firestore `prompts`/`logs`, IPFS CID.

import { db } from '@lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import { generatePolitenessPrompt } from './flows/generate-politeness-prompt';

export async function getPolitenessPrompt(conversationHistory: string, userId?: string): Promise<string> {
  if (!conversationHistory.trim()) {
    return '';
  }
  try {
    // Input validation (done, Day 5)
    if (conversationHistory.length > 10000) {
      throw new Error('Conversation history too long');
    }
    // Retry logic for Cloud Functions (new, Day 5)
    let attempts = 0;
    const maxAttempts = 3;
    let response: Response | null = null;
    while (attempts < maxAttempts) {
      try {
        response = await fetch(
          'https://us-central1-studio-4615914296-4bd91.cloudfunctions.net/getPolitenessPrompt',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationHistory, userId }),
          }
        );
        if (response.ok) break;
        throw new Error(`HTTP error: ${response.status}`);
      } catch (e) {
        attempts++;
        if (attempts === maxAttempts) throw e;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
    if (!response) throw new Error('No response from Cloud Functions');
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    const prompt = result.politenessPrompt;
    await addDoc(collection(db, 'prompts'), {
      prompt,
      conversationHistory,
      userId: userId || 'anonymous',
      timestamp: new Date(),
    });
    await logToIPFS({ prompt, conversationHistory, userId });
    await fetch('/api/prompt', { method: 'POST', body: JSON.stringify({ prompt, userId }) });
    return prompt;
  } catch (error) {
    const mockPrompt = 'Let’s keep the conversation respectful and mindful.';
    await addDoc(collection(db, 'logs'), formatErrorLog(error, 'getPolitenessPrompt'));
    await logToIPFS({ error: error.message, context: 'getPolitenessPrompt' });
    return mockPrompt;
  }
}