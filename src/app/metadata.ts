// Path: src/app/metadata.ts
// Improvements (Sept 28, 2025):
// - Created to export metadata, resolving console error in layout.tsx (new).
// - Defines title/description for SEO (Day 8, “Mindful video chat”).
// - Aligns with blueprint: Metadata enhances discoverability, countering elite digital noise.
// - Solo Tip: Test with `npm run dev`, check <head> title in browser.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Awake Chat',
  description: 'Random mindful video chats to awaken users.',
};