// src/ai/flows/generate-politeness-prompt.ts
import { z } from 'zod';

export const GeneratePolitenessPromptInputSchema = z.object({
  conversationHistory: z.string().describe('The recent conversation history between the users.'),
});

export type GeneratePolitenessPromptInput = z.infer<typeof GeneratePolitenessPromptInputSchema>;

export const GeneratePolitenessPromptOutputSchema = z.object({
  politenessPrompt: z.string().describe('A prompt to encourage more polite and mindful communication.'),
});

export type GeneratePolitenessPromptOutput = z.infer<typeof GeneratePolitenessPromptOutputSchema>;

export async function generatePolitenessPrompt(input: GeneratePolitenessPromptInput, userId?: string): Promise<GeneratePolitenessPromptOutput> {
  return { politenessPrompt: await getPolitenessPrompt(input.conversationHistory, userId) };
}