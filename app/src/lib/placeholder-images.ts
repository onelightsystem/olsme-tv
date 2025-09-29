// Path: src/lib/placeholder-images.ts
// Improvements (Sept 29, 2025):
// - Kept OLS placeholder images for waiting screen (done, Day 4, blueprint).
// - Fixed import: Changed `formatErrorLog` from `./firebase` to `@lib/utils` (new, resolves console error).
// - Used `@lib/firebase/config` for `db` to align with Firebase setup (new).
// - Added IPFS logging for image loads (new, Day 4).
// - Added image URL validation with error logging (new, Day 4).
// - Aligns with freemium: Premium users ($4.99) unlock custom images (Business Plan).
// - Solo Tip: Test with `npm run dev`, use in `waiting-screen.tsx`, check Firestore `image_logs`, IPFS CID.

import { db } from '@lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import placeholderData from './placeholder-images.json';

// Define placeholder type (done)
export type OlsImage = {
  id: string;
  imageUrl: string;
  description: string;
};

// Export placeholder images (done)
export const OlsImages: OlsImage[] = placeholderData.placeholderImages;

// Log image load to Firestore (done)
export async function logImageLoad(imageId: string, context: string) {
  try {
    const logData = { imageId, context, timestamp: new Date() };
    await addDoc(collection(db, 'image_logs'), logData);
    await logToIPFS(logData); // IPFS (new, Day 4)
  } catch (e) {
    if (e instanceof Error) {
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'logImageLoad'));
        await logToIPFS({ error: e.message, context: 'logImageLoad' });
    }
  }
}

// Validate image URL (new, Day 4)
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const isValid = response.ok && response.headers.get('content-type')?.startsWith('image/');
    if (!isValid) {
      await addDoc(collection(db, 'logs'), {
        error: 'Invalid image URL',
        url,
        context: 'validateImageUrl',
        timestamp: new Date(),
      });
      await logToIPFS({ error: 'Invalid image URL', url, context: 'validateImageUrl' });
    }
    return isValid;
  } catch (e) {
    if (e instanceof Error) {
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'validateImageUrl'));
        await logToIPFS({ error: e.message, context: 'validateImageUrl' });
    }
    return false;
  }
}
