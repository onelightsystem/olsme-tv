// Path: src/ai/actions.ts
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added `'use client'` to ensure browser-only execution with IPFS.
// - Enhanced error handling with `userId` in logs for traceability.
// - Added biofeedback audio trigger on error for mindfulness (OLS Red Sea waves).
// - Added premium user check for enhanced prompts (freemium model, $4.99/month).
// - Aligns with blueprint: AI Politeness Monitor, IPFS logging, anti-censorship.
// - Solo Tip: Test with `npm run dev`, send message in ChatPanel, check Firestore `prompts`/`logs`/`biofeedback_events`, IPFS CID.
'use client';
import { db } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
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

    // Check for premium user
    let isPremium = false;
    if (userId) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      isPremium = userDoc.exists() && userDoc.data()?.package === 'premium';
    }

    // Retry logic for Cloud Functions (done, Day 5)
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
            body: JSON.stringify({ conversationHistory, userId, isPremium }),
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

    let prompt = result.politenessPrompt;
    if (isPremium) {
      prompt += ' (Premium: Enhanced insights for mindful communication)';
    }

    // Log to Firestore
    await addDoc(collection(db, 'prompts'), {
      prompt,
      conversationHistory,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    // Log to IPFS
    await logToIPFS({ prompt, conversationHistory, userId: userId || 'anonymous', action: 'getPolitenessPrompt' });

    // Trigger API endpoint
    await fetch('/api/prompt', { method: 'POST', body: JSON.stringify({ prompt, userId }) });

    return prompt;
  } catch (error: any) {
    const mockPrompt = 'Let’s keep the conversation respectful and mindful.';
    
    // Log error to Firestore
    await addDoc(collection(db, 'logs'), formatErrorLog(error, 'getPolitenessPrompt', userId || 'anonymous'));

    // Log error to IPFS
    await logToIPFS({
      error: error.message,
      context: 'getPolitenessPrompt',
      userId: userId || 'anonymous',
      action: 'error',
    });

    // Mindfulness: Trigger calming audio on error
    if (userId) {
      await triggerBiofeedback(userId, 'chat', 'https://olsme.com/assets/red-sea-waves.mp3');
    }

    return mockPrompt;
  }
}