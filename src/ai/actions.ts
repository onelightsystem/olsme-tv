'use server';

import { generatePolitenessPrompt } from './flows/generate-politeness-prompt';

export async function getPolitenessPrompt(
  conversationHistory: string
): Promise<string> {
  if (!conversationHistory.trim()) {
    return '';
  }

  try {
    const result = await generatePolitenessPrompt({ conversationHistory });
    return result.politenessPrompt;
  } catch (error) {
    console.error('Error generating politeness prompt:', error);
    // Return a graceful default or empty string on error
    return 'Let\'s keep the conversation respectful.';
  }
}
