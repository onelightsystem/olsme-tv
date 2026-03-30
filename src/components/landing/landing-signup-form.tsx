'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Twitter, Phone } from 'lucide-react';
import { signUpWithEmail, signInWithX } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Button } from '@components/ui/button';

const inputClass =
  'min-h-[3rem] border-white/15 bg-black/30 text-base text-white placeholder:text-gray-500 focus-visible:border-[#FFD700]/40 focus-visible:ring-2 focus-visible:ring-[#FFD700]/35';

export default function LandingSignupForm() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      toast({ title: 'Welcome!', description: 'Your account has been created.', id: 'lsf-signup-success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwitter = async () => {
    try {
      await signInWithX();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Try again.';
      toast({ variant: 'destructive', title: 'Twitter sign-in failed', description: msg, id: 'lsf-twitter-err' });
    }
  };

  const handlePhoneStub = () => {
    toast({ title: 'Phone Sign-In', description: 'Coming soon — phone OTP is on the roadmap!', id: 'lsf-phone-stub' });
  };

  return (
    <section className="w-full max-w-xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="rounded-3xl border border-[#FFD700]/15 bg-[rgba(17,17,17,0.84)] p-8 sm:p-10 shadow-[0_8px_40px_rgba(255,215,0,0.06)] backdrop-blur-2xl"
      >
        <h2 className="mb-1 text-center text-2xl font-bold text-white sm:text-3xl">
          Create Your Live ID
        </h2>
        <p className="mb-8 text-center text-base text-white/50">
          Join the mindful chat revolution — sign up in seconds.
        </p>

        <form onSubmit={handleSignUp} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lsf-name" className="text-sm text-white/65">
              Name
            </Label>
            <Input
              id="lsf-name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lsf-email" className="text-sm text-white/65">
              Email
            </Label>
            <Input
              id="lsf-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lsf-password" className="text-sm text-white/65">
              Password
            </Label>
            <Input
              id="lsf-password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <p className="-mt-2 text-center text-sm text-red-400">{errorMessage}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[3.5rem] w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-5 text-lg font-semibold text-[#0F0F0F] transition-shadow hover:opacity-90 hover:shadow-[0_0_22px_rgba(255,215,0,0.32)]"
          >
            {isSubmitting ? 'Creating account…' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs tracking-widest text-white/30">OR CONTINUE WITH</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-[3rem] flex-1 gap-2 border-white/15 bg-transparent text-white hover:bg-white/8 hover:text-white"
            onClick={handleTwitter}
          >
            <Twitter className="h-4 w-4" />
            Twitter / X
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[3rem] flex-1 gap-2 border-white/15 bg-transparent text-white hover:bg-white/8 hover:text-white"
            onClick={handlePhoneStub}
          >
            <Phone className="h-4 w-4" />
            Phone
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
