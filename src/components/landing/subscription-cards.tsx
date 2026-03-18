'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Crown, Lock } from 'lucide-react';
import { Button } from '@components/ui/button';

const STARTER_FEATURES = [
  'Random non-video text chat',
  'AI politeness score',
  'Live users access',
  'Global Live ID establishment',
];

const PREMIUM_FEATURES = [
  'Unlimited sessions',
  'Full AI politeness insights',
  'Priority matching',
  'Builds Global Live ID history',
];

type Props = {
  onSignUp: () => void;
  onUpgrade: () => void;
};

export default function SubscriptionCards({ onSignUp, onUpgrade }: Props) {
  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Starter Tier */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          whileHover={{ y: -5 }}
          className="relative flex flex-col gap-5 rounded-2xl border border-white/30 bg-[rgba(17,17,17,0.82)] p-7 backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-white/85" />
            <span className="text-lg font-semibold text-white">Starter Access</span>
          </div>

          <p className="text-4xl font-bold text-white">
            $0.25
            <span className="text-sm font-normal text-white/75">&thinsp;/ month</span>
          </p>

          <ul className="flex flex-col gap-2.5 text-sm text-white/90">
            {STARTER_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-white/85" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            variant="outline"
            className="mt-auto min-h-[3rem] border-white/45 bg-white/5 font-semibold text-white hover:bg-white/15 hover:text-white"
            onClick={onSignUp}
          >
            Start Now
          </Button>
        </motion.div>

        {/* Premium Tier */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          whileHover={{ y: -5 }}
          className="relative flex flex-col gap-5 rounded-2xl border border-[#FFD700]/35 bg-[rgba(17,17,17,0.78)] p-7 backdrop-blur-md shadow-[0_0_28px_rgba(255,215,0,0.07)]"
        >
          {/* Lifetime badge */}
          <span className="absolute -top-3.5 right-5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-3 py-0.5 text-[11px] font-bold leading-5 text-[#0F0F0F]">
            OLS student = lifetime free
          </span>

          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#FFD700]" />
            <span className="text-lg font-semibold text-white">Premium Access</span>
          </div>

          <p className="text-4xl font-bold text-[#FFD700]">
            $1
            <span className="text-sm font-normal text-white/45">&thinsp;/ month</span>
          </p>

          <ul className="flex flex-col gap-2.5 text-sm text-white/90">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#FFD700]/85" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            className="mt-auto min-h-[3rem] bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-semibold text-[#0F0F0F] transition-shadow hover:opacity-90 hover:shadow-[0_0_18px_rgba(255,215,0,0.38)]"
            onClick={onUpgrade}
          >
            Upgrade Now – $1/month
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
