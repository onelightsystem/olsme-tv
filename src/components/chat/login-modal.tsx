'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const router = useRouter();
  const [mindfulMode, setMindfulMode] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSignIn = async () => {
    setIsConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    router.push('/profile');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="[&>button]:hidden w-[min(94vw,35rem)] max-w-[35rem] rounded-3xl border border-[#FFD700]/15 bg-[#111111]/85 p-0 text-white shadow-[0_8px_32px_rgba(255,215,0,0.08)] backdrop-blur-xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        >
          <div className="login-sun-halo pointer-events-none absolute inset-0" aria-hidden="true" />

          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close login modal"
              className="absolute right-5 top-5 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FFD700]/30 bg-[#FFD700]/15 text-white shadow-[0_0_24px_rgba(255,215,0,0.25)] transition hover:scale-105 hover:bg-[#FFD700]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>

          <DialogHeader className="relative z-10 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#FFD873]">
              <Sparkles className="h-4 w-4" />
              Awakening Session
            </div>
            <DialogTitle className="text-3xl font-bold leading-tight text-white sm:text-4xl">
              Begin Your Random Video Awaken Chat
            </DialogTitle>
            <div className="h-[3px] w-44 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC93C] to-transparent" />
            <DialogDescription className="text-base text-gray-200 sm:text-xl">
              Sign in to start your mindful chat experience.
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 mt-8 space-y-5">
            <AnimatePresence mode="wait">
              {isConnecting ? (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-[#FFD700]/20 bg-black/20 p-5 text-center"
                >
                  <motion.div
                    className="rounded-full bg-[#FFD700]/15 p-4"
                    animate={{ y: [10, -10, 10], opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sun className="h-8 w-8 text-[#FFD700]" aria-hidden="true" />
                  </motion.div>
                  <p className="mt-4 text-lg font-medium text-gray-100 sm:text-xl">
                    Connecting to the Light Network...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <Button
                    onClick={handleSignIn}
                    className="h-16 w-full rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-8 text-lg font-bold text-[#0F0F0F] shadow-lg shadow-[#FFD700]/30 transition focus-visible:ring-[#FFD700] hover:shadow-xl hover:shadow-[#FFD700]/45 sm:h-[72px] sm:text-xl"
                  >
                    <motion.span
                      whileHover={{ scale: 1.03 }}
                      whileFocus={{ scale: 1.03 }}
                      className="inline-flex items-center"
                    >
                      Sign In / Sign Up
                    </motion.span>
                  </Button>

                  <div className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <label htmlFor="mindful-mode" className="text-sm text-gray-300 sm:text-base">
                      Enable Mindful Mode
                    </label>
                    <Switch
                      id="mindful-mode"
                      checked={mindfulMode}
                      onCheckedChange={setMindfulMode}
                      aria-label="Enable Mindful Mode"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
