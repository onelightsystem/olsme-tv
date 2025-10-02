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
import Header from '@components/layout/header';
import { auth, db } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { useEffect, useState } from 'react';
import { metadata } from './metadata';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
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
    // Debounce status updates to reduce Cloud Function calls
    const debouncedUpdateStatus = debounce(async (status: string) => {
      if (auth.currentUser) {
        try {
          await updateUserStatus({ status });
        } catch (e) {
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
          await u.getIdToken(true); // Force refresh token for custom claims
          debouncedUpdateStatus('online');
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
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
      } catch (e: any) {
        const batch = writeBatch(db); // Fresh batch
        batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'layoutAuth', u?.uid || 'anonymous'));
        await withFirestoreRetry(() => batch.commit());
        await logToIPFS({
          error: e.message,
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
        <meta name="description" content={metadata.description} />
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
          <main className="flex-1" role="main">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}