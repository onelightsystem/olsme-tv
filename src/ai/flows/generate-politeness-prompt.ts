// Path: src/ai/flows/generate-politeness-prompt.ts
// Improvements (Sept 28, 2025):
// - Kept Zod schemas for input/output (done, Day 5, blueprint: AI Politeness Monitor).
// - Added Firestore/IPFS logging for prompt generation (new, Day 2/4).
// - Added mock validation for prototype (new, Day 5).
// - Aligns with freemium: Premium users ($4.99) unlock advanced AI insights (Business Plan).
// - Solo Tip: Test with `npm run genkit:dev`, check Firestore `prompts`/`logs`, IPFS CID.

import { z } from 'zod';
import { db } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import { getPolitenessPrompt } from '../actions';

export const GeneratePolitenessPromptInputSchema = z.object({
  conversationHistory: z.string().describe('The recent conversation history between the users.'),
});

export type GeneratePolitenessPromptInput = z.infer<typeof GeneratePolitenessPromptInputSchema>;

export const GeneratePolitenessPromptOutputSchema = z.object({
  politenessPrompt: z.string().describe('A prompt to encourage more polite and mindful communication.'),
});

export type GeneratePolitenessPromptOutput = z.infer<typeof GeneratePolitenessPromptOutputSchema>;

export async function generatePolitenessPrompt(input: GeneratePolitenessPromptInput, userId?: string): Promise<GeneratePolitenessPromptOutput> {
  try {
    // Mock validation for prototype (new)
    const validatedInput = GeneratePolitenessPromptInputSchema.parse(input);
    const prompt = await getPolitenessPrompt(validatedInput.conversationHistory, userId);
    await addDoc(collection(db, 'prompts'), {
      prompt,
      conversationHistory: validatedInput.conversationHistory,
      userId: userId || 'anonymous',
      timestamp: new Date(),
    });
    await logToIPFS({ prompt, conversationHistory: validatedInput.conversationHistory, userId });
    return { politenessPrompt: prompt };
  } catch (e) {
    if (e instanceof Error) {
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'generatePolitenessPrompt'));
        await logToIPFS({ error: e.message, context: 'generatePolitenessPrompt' });
    }
    throw e;
  }
}
