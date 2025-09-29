// Path: src/hooks/use-mobile.tsx
// Improvements (Sept 29, 2025):
// - Kept `useIsMobile` for responsive UI (<768px, done, Day 6).
// - Fixed import: Changed `formatErrorLog` from `@lib/firebase` to `@lib/utils` (new, resolves console error).
// - Used `@lib/firebase/config` for `db` to align with Firebase setup (new).
// - Added validation for mobile state (new, Day 6).
// - Enhanced IPFS logging with context (new, Day 4).
// - Aligned with blueprint: Responsive layout for global access (Egypt NTRA bypass, Day 10).
// - Solo Tip: Test with `npm run dev`, resize window, check Firestore `logs`, IPFS CID.

'use client';
import * as React from 'react';
import { db } from '@lib/firebase/config';
import { formatErrorLog, logToIPFS } from '@lib/utils';
import { collection, addDoc } from 'firebase/firestore';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      // Validation (new, Day 6)
      if (typeof newIsMobile !== 'boolean') {
        console.error('Invalid mobile state detected');
        return;
      }
      setIsMobile(newIsMobile);
      const logData = {
        isMobile: newIsMobile,
        timestamp: new Date(),
        context: 'useIsMobile',
      };
      addDoc(collection(db, 'logs'), logData).catch((e) => {
        addDoc(collection(db, 'logs'), formatErrorLog(e, 'useIsMobile'));
        logToIPFS({ error: (e as Error).message, context: 'useIsMobile' });
      });
      logToIPFS({ ...logData, device: window.navigator.userAgent }); // Enhanced IPFS logging (Day 4)
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
