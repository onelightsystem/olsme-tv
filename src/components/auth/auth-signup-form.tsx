'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Twitter } from 'lucide-react';
import {
  auth,
  createUserDocument,
  signInWithPhone,
  signInWithX,
  signUpWithEmail,
} from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

type AuthSignupFormProps = {
  onSignInClick?: () => void;
};

const inputClassName =
  'min-h-12 sm:min-h-14 border-white/12 bg-black/30 text-base sm:text-lg text-white placeholder:text-white/30 focus-visible:border-[#FFD700]/45 focus-visible:ring-2 focus-visible:ring-[#FFD700]/30';

export default function AuthSignupForm({ onSignInClick }: AuthSignupFormProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!displayName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signUpWithEmail(signUpEmail, signUpPassword, displayName);
      toast({ title: 'Account Created', description: 'Welcome to Awake Chat!' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setupRecaptcha = () => {
    if (recaptchaVerifier || typeof window === 'undefined') return recaptchaVerifier;

    const verifier = new RecaptchaVerifier(auth, 'landing-signup-recaptcha', {
      size: 'invisible',
      callback: () => undefined,
    });

    setRecaptchaVerifier(verifier);
    return verifier;
  };

  const handleTwitterSignIn = async () => {
    try {
      await signInWithX();
      toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Login with X failed.',
      });
    }
  };

  const handlePhoneSignInRequest = async () => {
    if (!phoneNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a phone number.' });
      return;
    }

    try {
      const verifier = setupRecaptcha();
      if (!verifier) return;

      const confirmation = await signInWithPhone(phoneNumber, verifier);
      setConfirmationResult(confirmation);
      toast({ title: 'Code Sent', description: 'A verification code has been sent to your phone.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send code. Please try again.',
      });
    }
  };

  const handlePhoneCodeVerify = async () => {
    if (!verificationCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter the verification code.' });
      return;
    }

    if (!confirmationResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please request a code first.' });
      return;
    }

    try {
      const result = await confirmationResult.confirm(verificationCode);
      await createUserDocument({ uid: result.user.uid, phoneNumber: result.user.phoneNumber });
      setPhoneDialogOpen(false);
      setPhoneNumber('');
      setVerificationCode('');
      setConfirmationResult(null);
      toast({ title: 'Logged In', description: 'Phone authentication successful!' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid verification code.',
      });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="overflow-hidden rounded-3xl border border-[#FFD700]/20 bg-[rgba(17,17,17,0.85)] shadow-[0_14px_56px_rgba(255,215,0,0.12)] backdrop-blur-xl">
          <CardContent className="relative p-8 sm:p-10">
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-36 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle at top, rgba(255,215,0,0.16), transparent 72%)' }}
            aria-hidden="true"
          />

          <div className="relative text-left">
            <h2 className="text-3xl font-bold text-white">Create Account</h2>
            <div className="mt-3 h-[2px] w-32 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC93C] to-transparent" />
            <p className="mt-3 text-base text-white/65 sm:text-lg">
              Start your mindful journey with us.
            </p>
          </div>

          <form className="relative mt-8 space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 py-1">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="landing-signup-name" className="text-sm text-white/75 sm:text-right sm:text-base">
                  Name
                </Label>
                <Input
                  id="landing-signup-name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={`${inputClassName} sm:col-span-3`}
                  placeholder="Your name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="landing-signup-email" className="text-sm text-white/75 sm:text-right sm:text-base">
                  Email
                </Label>
                <Input
                  id="landing-signup-email"
                  type="email"
                  autoComplete="email"
                  value={signUpEmail}
                  onChange={(event) => setSignUpEmail(event.target.value)}
                  className={`${inputClassName} sm:col-span-3`}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="landing-signup-password" className="text-sm text-white/75 sm:text-right sm:text-base">
                  Password
                </Label>
                <Input
                  id="landing-signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={signUpPassword}
                  onChange={(event) => setSignUpPassword(event.target.value)}
                  className={`${inputClassName} sm:col-span-3`}
                  placeholder="Create a password"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.18 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-14 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-6 text-lg font-bold text-[#0F0F0F] shadow-[0_0_20px_rgba(255,186,73,0.28)] transition hover:shadow-[0_0_32px_rgba(255,186,73,0.48)]"
              >
                {isSubmitting ? 'Sign Up...' : 'Sign Up'}
              </Button>
            </motion.div>

            <p className="text-center text-sm font-medium text-[#FFD700]/85">
             OLS student = lifetime free Premium
            </p>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px] font-semibold tracking-[0.14em] text-white/35">
              <span className="bg-[rgba(17,17,17,0.85)] px-3">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTwitterSignIn}
              className="min-h-12 gap-2 border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhoneDialogOpen(true)}
              className="min-h-12 gap-2 border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Phone className="h-4 w-4" />
              Phone
            </Button>
          </div>

          {onSignInClick && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={onSignInClick}
                className="text-sm text-white/55 transition hover:text-[#FFD700]"
              >
                Already have an account? Sign In
              </button>
            </div>
          )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign In with Phone</DialogTitle>
            <DialogDescription>
              {confirmationResult ? 'Enter the code we sent you.' : 'Enter your phone number to receive a verification code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!confirmationResult ? (
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="landing-phone" className="text-left sm:text-right">
                  Phone
                </Label>
                <Input
                  id="landing-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+1 555-555-5555"
                  className="sm:col-span-3"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="landing-code" className="text-left sm:text-right">
                  Code
                </Label>
                <Input
                  id="landing-code"
                  type="text"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="123456"
                  className="sm:col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            {!confirmationResult ? (
              <Button onClick={handlePhoneSignInRequest}>Send Code</Button>
            ) : (
              <Button onClick={handlePhoneCodeVerify}>Verify Code</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div id="landing-signup-recaptcha" />
    </>
  );
}