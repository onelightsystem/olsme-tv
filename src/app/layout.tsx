// Path: src/app/layout.tsx
// Improvements (Sept 29, 2025):
// - Kept Toaster, Header, responsive layout, PT Sans via next/font (done, Day 6).
// - Kept "use client" and Firebase Auth state for user context (done, Day 2).
// - Fixed Firestore syntax: Replaced `db.collection('logs').add` with `addDoc(collection(db, 'logs'))` (new, resolves runtime error).
// - Kept imports: `formatErrorLog` from `@lib/utils`, `auth`, `db` from `@lib/firebase/config` (done).
// - Kept `metadata` import from `app/metadata.ts` for SEO (done, Day 8).
// - Added retry logic for Firestore writes (new, Day 2).
// - Kept IPFS logging with auth context (done, Day 4).
// - Aligns with freemium: Premium users ($4.99) access custom layouts (Business Plan).
// - Solo Tip: Test with `npm run dev`, check font rendering, log auth state in Firestore/IPFS, verify title in <head>.

'use client';
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@lib/utils';
import { Toaster } from '@components/ui/toaster';
import Header from '@components/layout/header';
import { auth, db } from '@lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@lib/utils';
import { useEffect, useState } from 'react';
import { metadata } from './metadata';
import { collection, addDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

const ptSans = PT_Sans({ subsets: ['latin'], weight: ['400', '700'] });

// Retry logic for Firestore writes (new, Day 2)
async function withFirestoreRetry<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      attempts++;
      if (attempts === maxAttempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('Firestore retry limit reached');
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        // Force refresh of the token to get latest custom claims
        await u.getIdToken(true);
      }
      setUser(u);
      withFirestoreRetry(() =>
        addDoc(collection(db, 'logs'), {
          userId: u?.uid || 'anonymous',
          context: 'layout_auth',
          timestamp: new Date(),
        })
      ).catch((e) => {
        withFirestoreRetry(() =>
          addDoc(collection(db, 'logs'), formatErrorLog(e, 'layoutAuth'))
        );
        logToIPFS({ error: (e as Error).message, context: 'layoutAuth' });
      });
      if (u) logToIPFS({ userId: u.uid, action: 'auth_state', context: 'layout' });
    });
    return () => unsubscribe();
  }, []);

  return (
    <html lang="en" className={ptSans.className} suppressHydrationWarning>
      <head>
        <title>{metadata.title?.toString()}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
