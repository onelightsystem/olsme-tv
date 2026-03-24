'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Crown, Key, Lock } from 'lucide-react';
import { Button } from '@components/ui/button';

// TODO: move prices to Firebase Remote Config or .env for admin changes without redeploy
// Current monthly: Starter $0.25, Premium $1. Monthly can change anytime.
// Annual = one-time payment for 12 months (not recurring). Fixed "deal lock" against future monthly increases.
// Entry Key = monthly recurring $0.10 onboarding tier.
const ENTRY_KEY_PRICE = 0.10;
const STARTER_MONTHLY_PRICE = 0.25;
const PREMIUM_MONTHLY_PRICE = 1.00;
const STARTER_ANNUAL_PRICE = 10;  // one-time deal lock – 12 months
const PREMIUM_ANNUAL_PRICE = 30;  // one-time deal lock – 12 months

const ENTRY_KEY_FEATURES = [
  "Verified Global Live ID",
  "Access to live hosts directory",
  "Watch Host TV sessions (viewer only)",
  "Basic AI politeness badge",
  "Access to real humans",
  "Establishes your presence on olsme.tv",
];

const STARTER_FEATURES = [
  "Olsme platform subscription",
  "Random non-video text chat",
  "AI politeness score",
  "Access to live users",
  "Real humans only",
  "Marketplace access",
  "Establishes your Global Live ID",
];

const PREMIUM_FEATURES = [
  "Everything in Starter, plus:",
  "Earn revenue by hosting live TV sessions",
  "Unlimited sessions",
  "Full AI politeness insights",
  "Priority matching",
];

const TIERS = [
  {
    id: 'entry-key',
    billingMode: 'monthly-only',
    isPremium: false,
    label: 'Entry Key',
    monthlyPrice: ENTRY_KEY_PRICE,
    features: ENTRY_KEY_FEATURES,
    monthlyCta: 'Start Entry Key – $0.10/month',
  },
  {
    id: 'starter',
    billingMode: 'monthly-annual',
    isPremium: false,
    label: 'Starter Access',
    monthlyPrice: STARTER_MONTHLY_PRICE,
    annualPrice: STARTER_ANNUAL_PRICE,
    features: STARTER_FEATURES,
    monthlyCta: 'Start Now – $0.25/mo',
    annualCta: 'Lock Starter – $10 / year',
  },
  {
    id: 'premium',
    billingMode: 'monthly-annual',
    isPremium: true,
    label: 'Premium Access',
    monthlyPrice: PREMIUM_MONTHLY_PRICE,
    annualPrice: PREMIUM_ANNUAL_PRICE,
    features: PREMIUM_FEATURES,
    monthlyCta: 'Upgrade Now – $1/mo',
    annualCta: 'Lock Premium – $30 / year',
  },
] as const;

type Props = {
  onSignUp: () => void;
  onUpgrade: () => void;
};

export default function SubscriptionCards({ onSignUp, onUpgrade }: Props) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-4">
      {/* Monthly / Annual switcher */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/45'}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={() => setIsAnnual((v) => !v)}
          className="relative h-7 w-14 rounded-full border border-white/20 bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`absolute top-1 h-5 w-5 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFAA00] shadow ${
              isAnnual ? 'left-8' : 'left-1'
            }`}
          />
        </button>
        <span className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isAnnual ? 'text-[#FFD700]' : 'text-white/45'}`}>
          Annual
          <span className="rounded-full bg-[#FFD700]/20 px-2 py-0.5 text-[10px] font-bold text-[#FFE7A0]">
            Best Deal
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TIERS.filter((tier) => !(isAnnual && tier.billingMode === 'monthly-only')).map((tier, index) => {
          const isMonthlyOnly = tier.billingMode === 'monthly-only';
          const price = isMonthlyOnly ? tier.monthlyPrice : (isAnnual ? tier.annualPrice : tier.monthlyPrice);
          const cta = isMonthlyOnly ? tier.monthlyCta : (isAnnual ? tier.annualCta : tier.monthlyCta);
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.08 }}
              whileHover={{ y: -5 }}
              className={`relative flex flex-col gap-4 rounded-2xl border p-6 pt-8 backdrop-blur-md ${
                tier.isPremium
                  ? 'border-[#FFD700]/35 bg-[rgba(17,17,17,0.78)] shadow-[0_0_28px_rgba(255,215,0,0.07)]'
                  : 'border-white/30 bg-[rgba(17,17,17,0.82)]'
              }`}
            >
              {/* Annual deal-lock badge – animates in/out with switcher */}
              <AnimatePresence>
                {isAnnual && !isMonthlyOnly && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -top-3.5 right-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-3 py-0.5 text-[11px] font-bold leading-5 text-[#0F0F0F]"
                  >
                    Best Deal – Lock Price
                  </motion.span>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                {isMonthlyOnly ? (
                  <Key className="h-5 w-5 text-white/85" />
                ) : tier.isPremium ? (
                  <Crown className="h-5 w-5 text-[#FFD700]" />
                ) : (
                  <Lock className="h-5 w-5 text-white/85" />
                )}
                <span className="text-base font-semibold text-white">{tier.label}</span>
              </div>

              {/* Price animates when billing period switches */}
              <div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${tier.id}-${isAnnual ? 'annual' : 'monthly'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className={`text-4xl font-bold ${tier.isPremium ? 'text-[#FFD700]' : 'text-white'}`}
                  >
                    ${price.toFixed(2)}
                    <span className="text-sm font-normal text-white/75">
                      &thinsp;{isMonthlyOnly ? '/ month' : (isAnnual ? '/ year' : '/ month')}
                    </span>
                  </motion.p>
                </AnimatePresence>
                {/* Fixed-price note fades in when annual is selected (not for Entry Key) */}
                <AnimatePresence>
                  {isAnnual && !isMonthlyOnly && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1 overflow-hidden text-[11px] text-white/50"
                    >
                      Billed once – fixed price for 12 months. Monthly prices may change in future.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <ul className="flex flex-col gap-2 text-sm text-white/90">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 shrink-0 ${tier.isPremium ? 'text-[#FFD700]/85' : 'text-white/85'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.div
                className="mt-auto"
                whileHover={{ scale: isMonthlyOnly ? 1.02 : (isAnnual ? 1.04 : 1.01) }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <Button
                  className={`w-full min-h-[3rem] font-semibold ${
                    isMonthlyOnly
                      ? 'bg-gradient-to-r from-white/20 to-[#FFD700]/30 text-white hover:opacity-90 hover:shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                      : 'bg-gradient-to-r from-[#FFD700] to-[#FFAA00] text-[#0F0F0F] hover:opacity-90 hover:shadow-[0_0_18px_rgba(255,215,0,0.38)]'
                  }`}
                  onClick={tier.isPremium ? onUpgrade : onSignUp}
                >
                  {cta}
                </Button>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
