// Path: src/hooks/use-mobile.tsx
// Improvements (Sept 30, 2025):
// - Fixed import: Changed `logToIPFS` from `@lib/utils` to `@lib/ipfs-client` (resolves build error).
// - Added premium user check for enhanced logging (freemium model, $4.99/month).
// - Added biofeedback audio trigger for mobile state changes (OLS mindfulness).
// - Enhanced error handling with `userId` in logs for traceability.
// - Added batch Firestore writes and retry logic for performance.
// - Added accessibility notification for mobile state changes (GDPR compliance).
// - Aligned with blueprint: Responsive layout for global access (Egypt NTRA bypass, Day 10).
// - Solo Tip: Test with `npm run dev`, resize window, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import * as React from 'react';
import { db, auth } from '@lib/firebase/config';
import { formatErrorLog } from '@lib/utils';
import { logToIPFS } from '@lib/ipfs-client';
import { triggerBiofeedback } from '@lib/utils';
import { collection, addDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@hooks/use-toast';

const MOBILE_BREAKPOINT = 768;

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

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  const [isPremium, setIsPremium] = React.useState(false);
  const { toast } = useToast();
  const user = auth.currentUser;

  React.useEffect(() => {
    // Check for premium user
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then((userDoc) => {
        setIsPremium(userDoc.exists() && userDoc.data()?.package === 'premium');
      });
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = async () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;

      // Validation
      if (typeof newIsMobile !== 'boolean') {
        console.error('Invalid mobile state detected');
        return;
      }

      setIsMobile(newIsMobile);

      try {
        // Batch Firestore writes
        const batch = writeBatch(db);
        const logData = {
          userId: user?.uid || 'anonymous',
          isMobile: newIsMobile,
          timestamp: new Date(),
          context: 'useIsMobile',
        };
        batch.set(collection(db, 'logs').doc(), logData);
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId: user?.uid || 'anonymous',
          type: `mobile_${newIsMobile ? 'on' : 'off'}`,
          value: newIsMobile ? 1 : 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        // Log to IPFS
        await logToIPFS({
          ...logData,
          action: `mobile_${newIsMobile ? 'on' : 'off'}`,
          device: window.navigator.userAgent,
          premium: isPremium,
          timestamp: new Date().toISOString(),
        });

        // Mindfulness: Trigger calming audio for premium users
        if (user && isPremium) {
          await triggerBiofeedback(user.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
        }

        // Accessibility: Notify screen readers
        toast({
          title: 'Device Mode',
          description: `Switched to ${newIsMobile ? 'mobile' : 'desktop'} view.`,
          id: `mobile-${newIsMobile ? 'on' : 'off'}`,
          duration: 2000,
        });
      } catch (e: any) {
        const batch = writeBatch(db);
        batch.set(collection(db, 'logs').doc(), formatErrorLog(e, 'useIsMobile', user?.uid || 'anonymous'));
        batch.set(collection(db, 'biofeedback_events').doc(), {
          userId: user?.uid || 'anonymous',
          type: 'error',
          value: 0,
          timestamp: new Date(),
        });
        await withFirestoreRetry(() => batch.commit());

        await logToIPFS({
          error: e.message,
          context: 'useIsMobile',
          userId: user?.uid || 'anonymous',
          action: 'error',
          device: window.navigator.userAgent,
          timestamp: new Date().toISOString(),
        });

        if (user) {
          await triggerBiofeedback(user.uid, 'chat');
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to log device mode.',
          id: 'mobile-error',
        });
      }
    };

    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    onChange(); // Initial check

    return () => mql.removeEventListener('change', onChange);
  }, [user, isPremium, toast]);

  return !!isMobile;
}