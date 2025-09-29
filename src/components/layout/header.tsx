// Path: src/components/layout/header.tsx
// Improvements (Sept 29, 2025):
// - Kept Sun icon, “Awake Chat” branding, PT Sans, #FFD700 gold (done, blueprint, Day 6).
// - Kept Firebase Auth state and biofeedback toggle (done, Day 2/11).
// - Fixed imports: `auth`, `signInWithX`, `db` from `@lib/firebase/config` (done).
// - Added phone sign-in with RecaptchaVerifier (new, Day 15).
// - Added validation for biofeedback events (done, Day 11).
// - Kept IPFS logging for profile clicks (done, Day 4, anti-censorship).
// - Aligns with freemium: Premium users ($4.99) unlock custom audio toggles (Business Plan).
// - Solo Tip: Test with `npm run dev`, click Profile/Phone, check Firestore `logs`/`biofeedback`, IPFS CID, trigger audio.

'use client';
import { Sun, User, Volume2, Phone } from 'lucide-react';
import { Button } from '@components/ui/button';
import { auth, signInWithX, signInWithPhone, db } from '@lib/firebase/config';
import { triggerBiofeedback, formatErrorLog, logToIPFS } from '@lib/utils';
import { useToast } from '@hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';

export default function Header() {
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleProfileClick = async () => {
    if (!user) {
      try {
        await signInWithX();
        toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
        await addDoc(collection(db, 'logs'), {
          userId: 'anonymous',
          action: 'signInWithX',
          timestamp: new Date(),
        });
        await logToIPFS({ userId: 'anonymous', action: 'signInWithX' });
      } catch (e) {
        await addDoc(collection(db, 'logs'), formatErrorLog(e, 'headerLogin'));
        await logToIPFS({ error: e.message, context: 'headerLogin' });
        toast({ variant: 'destructive', title: 'Error', description: 'Login failed.' });
      }
    } else {
      const log = { userId: user.uid, action: 'profile_click', timestamp: new Date() };
      await addDoc(collection(db, 'logs'), log);
      await logToIPFS(log);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!phoneNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a phone number.' });
      return;
    }
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const confirmationResult = await signInWithPhone(phoneNumber, recaptchaRef.current);
      const verificationCode = prompt('Enter the verification code sent to your phone:');
      if (verificationCode) {
        await confirmationResult.confirm(verificationCode);
        toast({ title: 'Logged In', description: 'Phone authentication successful!' });
        await addDoc(collection(db, 'logs'), {
          userId: 'anonymous',
          action: 'signInWithPhone',
          timestamp: new Date(),
        });
        await logToIPFS({ userId: 'anonymous', action: 'signInWithPhone' });
      }
    } catch (e) {
      await addDoc(collection(db, 'logs'), formatErrorLog(e, 'phoneSignIn'));
      await logToIPFS({ error: e.message, context: 'phoneSignIn' });
      toast({ variant: 'destructive', title: 'Error', description: 'Phone login failed.' });
    }
  };

  const handleBiofeedbackToggle = async () => {
    try {
      if (!user?.uid && user !== null) {
        throw new Error('Invalid user for biofeedback');
      }
      await triggerBiofeedback(user?.uid || 'anonymous', 'chat');
      toast({ title: 'Biofeedback', description: 'Red Sea waves activated.' });
    } catch (e) {
      await addDoc(collection(db, 'logs'), formatErrorLog(e, 'headerBiofeedback'));
      await logToIPFS({ error: e.message, context: 'headerBiofeedback' });
      toast({ variant: 'destructive', title: 'Error', description: 'Biofeedback failed.' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <Sun className="h-6 w-6 mr-2 stroke-[#FFD700]" />
          <span className="font-bold font-headline">Awake Chat</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={handleBiofeedbackToggle} aria-label="Toggle biofeedback">
            <Volume2 className="h-5 w-5 stroke-[#FFD700]" />
          </Button>
          {showPhoneInput ? (
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="border rounded px-2 py-1"
              />
              <Button variant="ghost" size="icon" onClick={handlePhoneSignIn} aria-label="Sign in with Phone">
                <Phone className="h-5 w-5 stroke-[#FFD700]" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPhoneInput(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => setShowPhoneInput(true)} aria-label="Sign in with Phone">
                <Phone className="h-5 w-5 stroke-[#FFD700]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleProfileClick} aria-label={user ? 'Profile' : 'Login with X'}>
                <User className="h-5 w-5 stroke-[#FFD700]" />
                <span className="sr-only">{user ? 'Profile' : 'Login with X'}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </header>
  );
}