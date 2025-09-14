// src/ai/actions.ts
import { generatePolitenessPrompt } from './flows/generate-politeness-prompt';

export async function getPolitenessPrompt(conversationHistory: string, userId?: string): Promise<string> {
  if (!conversationHistory.trim()) {
    return '';
  }
  try {
    const response = await fetch(
      'https://us-central1-studio-4615914296-4bd91.cloudfunctions.net/getPolitenessPrompt',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationHistory, userId }),
      }
    );
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.politenessPrompt;
  } catch (error) {
    console.error('Error generating politeness prompt:', error);
    return "Let's keep the conversation respectful.";
  }
}