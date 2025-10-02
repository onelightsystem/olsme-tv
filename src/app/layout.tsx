// Path: src/app/layout.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added biofeedback audio trigger on auth errors for mindfulness (OLS Red Sea waves).
// - Added premium user check for custom layout styles (freemium model, $4.99/month).
// - Optimized `updateUserStatus` with debouncing to reduce Cloud Function calls.
// - Added ARIA attributes for accessibility (GDPR compliance).
// - Enhanced error logging with `userId` for traceability.
// - Aligns with blueprint: PT Sans font, Firebase Auth, IPFS logging, SEO.
// - Solo Tip: Test with `npm run dev`, check font rendering, log auth state in Firestore/IPFS, verify title in <head>.
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
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { debounce } from 'lodash'; // Requires: npm install lodash @types/lodash

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
          // Force refresh token for custom claims (e.g., isAdmin)
          await u.getIdToken(true);
          debouncedUpdateStatus('online');

          // Check for premium user
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
        } else if (user) {
          debouncedUpdateStatus('offline');
          setIsPremium(false);
        }
        setUser(u);

        // Log auth state to Firestore
        await withFirestoreRetry(() =>
          addDoc(collection(db, 'logs'), {
            userId: u?.uid || 'anonymous',
            context: 'layout_auth',
            status: u ? 'loggedIn' : 'loggedOut',
            timestamp: new Date().toISOString(),
          })
        );

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
        // Log error to Firestore
        await withFirestoreRetry(() =>
          addDoc(collection(db, 'logs'), formatErrorLog(e, 'layoutAuth', u?.uid || 'anonymous'))
        );

        // Log error to IPFS
        await logToIPFS({
          error: e.message,
          context: 'layoutAuth',
          userId: u?.uid || 'anonymous',
          action: 'error',
          timestamp: new Date().toISOString(),
        });

        // Mindfulness: Trigger calming audio on error
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