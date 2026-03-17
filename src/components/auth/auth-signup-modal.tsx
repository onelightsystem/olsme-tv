'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Twitter, X } from 'lucide-react';
import { signUpWithEmail } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';

type AuthSignupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inputClassName =
  'min-h-12 sm:min-h-14 border-white/12 bg-black/30 text-base sm:text-lg text-white placeholder:text-white/30 focus-visible:border-[#FFD700]/45 focus-visible:ring-2 focus-visible:ring-[#FFD700]/30';

export default function AuthSignupModal({ open, onOpenChange }: AuthSignupModalProps) {
  const { toast } = useToast();
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    const timeout = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(timeout);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      onOpenChange(false);
      toast({ title: 'Account created', description: 'Welcome to olsme.tv.' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwitterStub = () => {
    toast({ title: 'Twitter / X', description: 'Social sign-up is being refreshed and will return soon.' });
  };

  const handlePhoneStub = () => {
    toast({ title: 'Phone Sign-Up', description: 'Phone sign-up is on the roadmap.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden w-[min(94vw,32rem)] max-w-md rounded-3xl border border-[#FFD700]/20 bg-[rgba(20,20,30,0.88)] p-0 shadow-[0_14px_56px_rgba(255,215,0,0.12)] backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl"
        >
          <motion.div
            initial={{ opacity: 0.18, scale: 0.92 }}
            animate={{ opacity: 0.34, scale: 1.03 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-4 rounded-[1.5rem] border border-[#FFD700]/20"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-40 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle at top, rgba(255,215,0,0.18), transparent 72%)' }}
            aria-hidden="true"
          />

          <div className="relative p-6 sm:p-8">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close sign up modal"
                className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FFD700]/35 bg-[#FFD700]/10 text-[#FFE7A0] transition hover:scale-[1.03] hover:bg-[#FFD700]/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>

            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="pt-2 text-3xl font-bold text-white sm:text-[2rem]">
                Create Your Live ID
              </DialogTitle>
              <div className="h-[2px] w-32 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC93C] to-transparent" />
              <DialogDescription className="max-w-sm text-base text-white/65 sm:text-lg">
                Join the mindful chat revolution — sign up in seconds.
              </DialogDescription>
            </DialogHeader>

            <form className="mt-7 space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="auth-signup-modal-name" className="text-sm text-white/75 sm:text-base">
                  Name
                </Label>
                <Input
                  ref={firstInputRef}
                  id="auth-signup-modal-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClassName}
                  placeholder="Your name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-signup-modal-email" className="text-sm text-white/75 sm:text-base">
                  Email
                </Label>
                <Input
                  id="auth-signup-modal-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-signup-modal-password" className="text-sm text-white/75 sm:text-base">
                  Password
                </Label>
                <Input
                  id="auth-signup-modal-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Create a password"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

              <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.18 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-14 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-6 text-lg font-semibold text-[#0F0F0F] shadow-[0_0_20px_rgba(255,186,73,0.28)] transition hover:shadow-[0_0_32px_rgba(255,186,73,0.48)]"
                >
                  {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </motion.div>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold tracking-[0.14em] text-white/35">
                <span className="bg-[rgba(20,20,30,0.88)] px-3">OR CONTINUE WITH</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTwitterStub}
                className="min-h-12 gap-2 border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Twitter className="h-4 w-4" />
                Twitter / X
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePhoneStub}
                className="min-h-12 gap-2 border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Phone className="h-4 w-4" />
                Phone
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}