'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, Phone } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithX } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type AuthTab = 'signin' | 'signup';

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
};

export default function AuthModal({ open, onOpenChange, initialTab = 'signin' }: AuthModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [signInEmailValue, setSignInEmailValue] = useState('');
  const [signInPasswordValue, setSignInPasswordValue] = useState('');

  const [signUpNameValue, setSignUpNameValue] = useState('');
  const [signUpEmailValue, setSignUpEmailValue] = useState('');
  const [signUpPasswordValue, setSignUpPasswordValue] = useState('');

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setErrorMessage(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timeout);
  }, [open, activeTab]);

  const modalTitle = useMemo(() => (activeTab === 'signin' ? 'Sign In' : 'Create Account'), [activeTab]);
  const modalSubtitle = useMemo(
    () => (activeTab === 'signin' ? 'Continue your mindful chat journey.' : 'Start your awakening journey with us.'),
    [activeTab]
  );

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInWithEmail(signInEmailValue, signInPasswordValue);
      onOpenChange(false);
      toast({ title: 'Signed in', description: 'Welcome back to olsme.tv.' });
      router.push('/subscribe');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signUpWithEmail(signUpEmailValue, signUpPasswordValue, signUpNameValue);
      onOpenChange(false);
      toast({ title: 'Account created', description: 'Welcome to olsme.tv.' });
      router.push('/subscribe');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleX = async () => {
    try {
      await signInWithX();
      onOpenChange(false);
      toast({ title: 'Signed in', description: 'Connected with X successfully.' });
      router.push('/subscribe');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'X sign-in is unavailable right now.');
    }
  };

  const handlePhoneStub = () => {
    toast({ title: 'Phone sign-in', description: 'Phone sign-in will be enabled soon.' });
  };

  const commonInputClass =
    'min-h-12 border-white/15 bg-black/30 text-white placeholder:text-gray-500 focus-visible:border-[#FFD700]/40 focus-visible:ring-2 focus-visible:ring-[#FFD700]/35';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden w-[min(94vw,30rem)] max-w-[30rem] rounded-3xl border border-[#FFD700]/15 bg-[#111111]/85 p-0 shadow-[0_8px_32px_rgba(255,215,0,0.1)] backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-7"
        >
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close authentication modal"
              className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 text-white transition hover:scale-[1.03] hover:bg-[#FFD700]/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)} className="w-full">
            <TabsList className="grid min-h-12 w-full grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1">
              <TabsTrigger
                value="signin"
                className="min-h-11 text-base data-[state=active]:bg-[#FFD700]/15 data-[state=active]:text-[#FFE7A0] data-[state=active]:shadow-[inset_0_-2px_0_0_#FFD700]"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="min-h-11 text-base data-[state=active]:bg-[#FFD700]/15 data-[state=active]:text-[#FFE7A0] data-[state=active]:shadow-[inset_0_-2px_0_0_#FFD700]"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <DialogHeader className="mt-6 space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-white">{modalTitle}</DialogTitle>
              <div className="h-[2px] w-28 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC93C] to-transparent" />
              <DialogDescription className="text-lg text-gray-300">{modalSubtitle}</DialogDescription>
            </DialogHeader>

            <TabsContent value="signin" className="mt-5">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="auth-signin-email" className="text-sm text-gray-200">Email</Label>
                  <Input
                    ref={firstInputRef}
                    id="auth-signin-email"
                    type="email"
                    value={signInEmailValue}
                    onChange={(event) => setSignInEmailValue(event.target.value)}
                    className={commonInputClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-signin-password" className="text-sm text-gray-200">Password</Label>
                  <Input
                    id="auth-signin-password"
                    type="password"
                    value={signInPasswordValue}
                    onChange={(event) => setSignInPasswordValue(event.target.value)}
                    className={commonInputClass}
                    required
                  />
                </div>

                {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-5 text-lg font-semibold text-[#0F0F0F] shadow-[0_0_18px_rgba(255,186,73,0.35)] transition hover:shadow-[0_0_30px_rgba(255,186,73,0.55)]"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="auth-signup-name" className="text-sm text-gray-200">Name</Label>
                  <Input
                    ref={firstInputRef}
                    id="auth-signup-name"
                    value={signUpNameValue}
                    onChange={(event) => setSignUpNameValue(event.target.value)}
                    className={commonInputClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-signup-email" className="text-sm text-gray-200">Email</Label>
                  <Input
                    id="auth-signup-email"
                    type="email"
                    value={signUpEmailValue}
                    onChange={(event) => setSignUpEmailValue(event.target.value)}
                    className={commonInputClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-signup-password" className="text-sm text-gray-200">Password</Label>
                  <Input
                    id="auth-signup-password"
                    type="password"
                    value={signUpPasswordValue}
                    onChange={(event) => setSignUpPasswordValue(event.target.value)}
                    className={commonInputClass}
                    required
                  />
                </div>

                {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-5 text-lg font-semibold text-[#0F0F0F] shadow-[0_0_18px_rgba(255,186,73,0.35)] transition hover:shadow-[0_0_30px_rgba(255,186,73,0.55)]"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px] font-semibold tracking-[0.14em] text-gray-400">
              <span className="bg-[#111111]/85 px-2">OR CONTINUE WITH</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleX}
              className="min-h-12 border-white/20 bg-black/25 text-gray-100 hover:border-[#FFD700]/45 hover:bg-black/40"
            >
              <XLogo className="mr-2 h-4 w-4" />
              X
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePhoneStub}
              className="min-h-12 border-white/20 bg-black/25 text-gray-100 hover:border-[#FFD700]/45 hover:bg-black/40"
            >
              <Phone className="mr-2 h-4 w-4" />
              Phone
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}