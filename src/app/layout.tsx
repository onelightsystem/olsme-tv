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
import { usePathname, useRouter } from 'next/navigation';
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
import { useToast } from '@hooks/use-toast';
import { metadata } from './metadata';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
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
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authResolved, setAuthResolved] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const isAdminRoute = (pathname ?? '').startsWith('/admin');

  useEffect(() => {
    // In local/dev environments this callable is often unavailable or CORS-restricted.
    // Keep status syncing opt-in to avoid noisy console/network errors during UI work.
    const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const statusSyncEnabled = !isLocalHost && (
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_STATUS_SYNC === 'true'
    );
    const functions = getFunctions();
    const updateUserStatus = httpsCallable(functions, 'updateUserStatus');
    let statusUpdatesDisabled = !statusSyncEnabled;
    let warnedStatusDisabled = false;
    // Debounce status updates to reduce Cloud Function calls
    const debouncedUpdateStatus = debounce(async (status: string) => {
      if (auth.currentUser && statusSyncEnabled && !statusUpdatesDisabled) {
        try {
          await updateUserStatus({ status });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const shouldDisable =
            message.includes('404') ||
            message.toLowerCase().includes('cors') ||
            message.toLowerCase().includes('not-found') ||
            message.toLowerCase().includes('access-control-allow-origin') ||
            message.toLowerCase().includes('permission-denied') ||
            message.toLowerCase().includes('internal');
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
      } finally {
        setAuthResolved(true);
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

  useEffect(() => {
    if (!isAdminRoute) return;
    if (!authResolved) return;

    let isActive = true;

    const enforceAdminClaim = async () => {
      if (!user) {
        if (isActive) {
          console.warn('[admin-guard] unauthenticated visitor on admin route');
          router.replace('/signin');
        }
        return;
      }

      try {
        const token = await user.getIdTokenResult(true);
        if (!isActive) return;

        if (token.claims.isAdmin !== true) {
          console.warn('[admin-guard] non-admin user blocked from admin route', { uid: user.uid });
          toast({ variant: 'destructive', title: 'Admin access only' });
          router.replace('/');
        }
      } catch (error) {
        console.error('[admin-guard] claim read failed', error);
        if (isActive) {
          toast({ variant: 'destructive', title: 'Admin access only' });
          router.replace('/');
        }
      }
    };

    enforceAdminClaim();

    return () => {
      isActive = false;
    };
  }, [authResolved, isAdminRoute, router, toast, user]);

  useEffect(() => {
    if (!user) return;
    if (isAdminRoute) return;
    if (!pathname) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
      const hasPremiumAccess =
        data?.isPremium === true ||
        data?.subscriptionTier === 'tier2' ||
        data?.subscriptionStatus === 'active';

      setIsPremium(hasPremiumAccess);

      const nonPremiumAllowedPaths = new Set(['/subscribe', '/profile', '/about']);
      if (!hasPremiumAccess && !nonPremiumAllowedPaths.has(pathname)) {
        router.push('/subscribe');
      }
    });

    return () => unsubscribe();
  }, [isAdminRoute, pathname, router, user]);

  return (
    <html lang="en" className={ptSans.className} suppressHydrationWarning>
      <head>
        <title>{metadata.title?.toString()}</title>
        <meta name="description" content={metadata.description?.toString() ?? ''} />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          isPremium && 'premium-layout' // Custom styles for premium users
        )}
        role="application"
      >
        <div className="relative flex min-h-screen flex-col">
          {!isAdminRoute && <Header />}
          <main className={cn('flex-1', !isAdminRoute && 'pt-16')} role="main">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}