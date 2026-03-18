// Path: src/app/layout.tsx
// Improvements (Oct 2, 2025):
// - Fixed Firestore batch write to use fresh WriteBatch instances (resolves FirebaseError).
// - Removed unnecessary font preload tags to fix warnings.
// - Migrated to `next/font/google` for PT Sans.
// - Kept biofeedback audio trigger, premium user checks, and IPFS logging.
// - Ensured accessibility with ARIA attributes (GDPR compliance).
// - Solo Tip: Test with `npm run dev`, check font rendering, log auth state in Firestore/IPFS.
'use client';
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@lib/utils';
import { Toaster } from '@components/ui/toaster';
import Header from '@components/Header';
import { auth, db } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { useEffect, useState } from 'react';
import { metadata } from './metadata';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { debounce } from 'lodash';

const ptSans = PT_Sans({ subsets: ['latin'], weight: ['400', '700'] });

// Retry logic for Firestore writes
async function withFirestoreRetry<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('write batch can no longer be used after commit')) {
        throw e;
      }
      attempts++;
      if (attempts === maxAttempts) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('Firestore retry limit reached');
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const functions = getFunctions();
    const updateUserStatus = httpsCallable(functions, 'updateUserStatus');
    let statusUpdatesDisabled = false;
    let warnedStatusDisabled = false;
    // Debounce status updates to reduce Cloud Function calls
    const debouncedUpdateStatus = debounce(async (status: string) => {
      if (auth.currentUser && !statusUpdatesDisabled) {
        try {
          await updateUserStatus({ status });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const shouldDisable =
            message.includes('404') ||
            message.toLowerCase().includes('cors') ||
            message.toLowerCase().includes('not-found');
          if (shouldDisable) {
            statusUpdatesDisabled = true;
            if (!warnedStatusDisabled) {
              warnedStatusDisabled = true;
              console.warn('updateUserStatus callable unavailable; status syncing disabled for this session.');
            }
            return;
          }
          console.error('Status update failed:', e);
        }
      }
    }, 500);

    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'visible' ? 'online' : 'offline';
      debouncedUpdateStatus(status);
    };

    const handleBeforeUnload = () => {
      debouncedUpdateStatus('offline');
    };

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      try {
        if (u) {
          const {claims} = await u.getIdTokenResult(true); // Force refresh token for custom claims
          debouncedUpdateStatus('online');
          setIsPremium(claims.isPremium === true || claims.subscriptionTier === 'tier2');
        } else if (user) {
          debouncedUpdateStatus('offline');
          setIsPremium(false);
        }
        setUser(u);

        // Log auth state to Firestore
        const batch = writeBatch(db); // Fresh batch
        batch.set(doc(collection(db, 'logs')), {
          userId: u?.uid || 'anonymous',
          context: 'layout_auth',
          status: u ? 'loggedIn' : 'loggedOut',
          timestamp: new Date().toISOString(),
        });
        await withFirestoreRetry(() => batch.commit());

        // Log auth state to IPFS
        if (u) {
          await logToIPFS({
            userId: u.uid,
            action: 'auth_state',
            context: 'layout',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const batch = writeBatch(db); // Fresh batch
        batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'layoutAuth', u?.uid || 'anonymous'));
        try {
          await withFirestoreRetry(() => batch.commit());
        } catch {
          console.warn('Skipping layoutAuth log write due to Firestore permissions or transient write error.');
        }
        await logToIPFS({
          error: errorMessage,
          context: 'layoutAuth',
          userId: u?.uid || 'anonymous',
          action: 'error',
          timestamp: new Date().toISOString(),
        });
        if (u) {
          await triggerBiofeedback(u.uid, 'chat', 'https://olsme.com/assets/red-sea-waves.mp3');
        }
      }
    });

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      debouncedUpdateStatus.cancel();
    };
  }, [user]);

  return (
    <html lang="en" className={ptSans.className} suppressHydrationWarning>
      <head>
        <title>{metadata.title?.toString()}</title>
        <meta name="description" content={metadata.description?.toString() ?? ''} />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          isPremium && 'premium-layout' // Custom styles for premium users
        )}
        role="application"
      >
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pt-16" role="main">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}