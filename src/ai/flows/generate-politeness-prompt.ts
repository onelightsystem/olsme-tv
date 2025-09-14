// src/ai/flows/generate-politeness-prompt.ts
'use server';

/**
 * @fileOverview Generates a politeness prompt based on the current conversation.
 *
 * - generatePolitenessPrompt - A function that generates a politeness prompt.
 * - GeneratePolitenessPromptInput - The input type for the generatePolitenessPrompt function.
 * - GeneratePolitenessPromptOutput - The return type for the generatePolitenessPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePolitenessPromptInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('The recent conversation history between the users.'),
});

export type GeneratePolitenessPromptInput = z.infer<
  typeof GeneratePolitenessPromptInputSchema
>;

const GeneratePolitenessPromptOutputSchema = z.object({
  politenessPrompt: z
    .string()
    .describe(
      'A prompt to encourage more polite and mindful communication.'
    ),
});

export type GeneratePolitenessPromptOutput = z.infer<
  typeof GeneratePolitenessPromptOutputSchema
>;

export async function generatePolitenessPrompt(
  input: GeneratePolitenessPromptInput
): Promise<GeneratePolitenessPromptOutput> {
  return generatePolitenessPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'politenessPrompt',
  input: {schema: GeneratePolitenessPromptInputSchema},
  output: {schema: GeneratePolitenessPromptOutputSchema},
  prompt: `Based on the following conversation history, suggest a short, helpful prompt to encourage more polite and mindful communication. Focus on specific issues if apparent, but keep the prompt positive and encouraging.  The prompt should be less than 20 words.

Conversation History:
{{conversationHistory}}`,
});

const generatePolitenessPromptFlow = ai.defineFlow(
  {
    name: 'generatePolitenessPromptFlow',
    inputSchema: GeneratePolitenessPromptInputSchema,
    outputSchema: GeneratePolitenessPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
