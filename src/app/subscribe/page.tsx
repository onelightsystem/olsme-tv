'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Lock, CheckCircle, Sun } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';
import { auth, db } from '@lib/firebase/config';
import { useToast } from '@hooks/use-toast';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';

// TODO: move prices to Firebase Remote Config or .env for admin changes without redeploy
// Current monthly: Starter $0.25, Premium $1. Monthly can change anytime.
// Annual = one-time payment for 12 months (not recurring). Fixed "deal lock" against future monthly increases.
const STARTER_MONTHLY_PRICE = '0.25';
const PREMIUM_MONTHLY_PRICE = '1.00';
const STARTER_ANNUAL_PRICE = '10.00'; // one-time deal lock – 12 months
const PREMIUM_ANNUAL_PRICE = '30.00'; // one-time deal lock – 12 months

type Tier = 'tier1-monthly' | 'tier1-annual' | 'tier2-monthly' | 'tier2-annual';

type ProfileView = {
  name: string;
  email: string;
  liveId: string;
};

type TierCopy = {
  amount: string;
  title: string;
  button: string;
  features: string[];
  isAnnual: boolean;
  isPremium: boolean;
};

const TIER_COPY: Record<Tier, TierCopy> = {
  'tier1-monthly': {
    amount: STARTER_MONTHLY_PRICE,
    title: 'Starter Access',
    button: 'Choose Starter – $0.25/mo',
    features: [
      "olsme tech sub.",
      "Random non-video text chat",
      "AI politeness score",
      "Live users access",
      "real humans only",
      "market place",
      "Builds Global Live ID establishment",
    ],
    isAnnual: false,
    isPremium: false,
  },
  'tier1-annual': {
    // Annual = one-time payment for 12 months (not recurring). Fixed price to protect against future monthly increases.
    amount: STARTER_ANNUAL_PRICE,
    title: 'Starter Annual',
    button: 'Lock Starter – $10\u2009/ year',
    features: [
      "olsme tech sub.",
      "Random non-video text chat",
      "AI politeness score",
      "Live users access",
      "real humans only",
      "market place",
      "Builds Global Live ID establishment",
    ],
    isAnnual: true,
    isPremium: false,
  },
  'tier2-monthly': {
    amount: PREMIUM_MONTHLY_PRICE,
    title: 'Premium Access',
    button: 'Upgrade Now – $1/mo',
    features: [
      "everything in Starter, plus:",
      "make money on hosting tv only real live sessions",
      "Unlimited sessions",
      "Full AI politeness insights",
      "Priority matching",
    ],
    isAnnual: false,
    isPremium: true,
  },
  'tier2-annual': {
    // Annual = one-time payment for 12 months (not recurring). Fixed price to protect against future monthly increases.
    amount: PREMIUM_ANNUAL_PRICE,
    title: 'Premium Annual',
    button: 'Lock Premium – $30\u2009/ year',
    features: [
      "everything in Starter, plus:",
      "make money on hosting tv only real live sessions",
      "Unlimited sessions",
      "Full AI politeness insights",
      "Priority matching",
    ],
    isAnnual: true,
    isPremium: true,
  },
};

export default function SubscribePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Controls which billing period is shown. Switching resets any open PayPal panel.
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          router.replace('/');
          return;
        }

        setUser(currentUser);
        unsubscribeUserDoc?.();
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          const userData = docSnap.exists() ? (docSnap.data() as Record<string, unknown>) : {};
          const hasPremiumAccess =
            userData?.isPremium === true ||
            userData?.subscriptionTier === 'tier2' ||
            userData?.subscriptionStatus === 'active';

          if (hasPremiumAccess) {
            router.replace('/');
            return;
          }

          setProfile({
            name:
              typeof userData.displayName === 'string' && userData.displayName.length > 0
                ? userData.displayName
                : currentUser.displayName || 'Awakener',
            email: currentUser.email || 'No email provided',
            liveId:
              typeof userData.decentralizedId === 'string' && userData.decentralizedId.length > 0
                ? userData.decentralizedId
                : currentUser.uid,
          });
        });
      } catch {
        if (currentUser) {
          setProfile({
            name: currentUser.displayName || 'Awakener',
            email: currentUser.email || 'No email provided',
            liveId: currentUser.uid,
          });
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeUserDoc?.();
    };
  }, [router]);

  // Reset selected tier when billing period switches to avoid stale PayPal panel
  const handleBillingToggle = () => {
    setIsAnnual((v) => !v);
    setSelectedTier(null);
  };

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isPaypalMisconfigured = !paypalClientId && process.env.NODE_ENV === 'production';
  if (isPaypalMisconfigured) {
    console.error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set. PayPal checkout is disabled.');
  }

  const paypalOptions: ReactPayPalScriptOptions = useMemo(
    () => ({
      clientId: paypalClientId ?? 'test',
      currency: 'USD',
      intent: 'capture',
    }),
    [paypalClientId]
  );

  const handleApprove = async (tier: Tier, orderId: string | undefined) => {
    if (!user) return;

    // Map 4-variant frontend tier to backend tier1/tier2 identifier
    const backendTier = tier.startsWith('tier2') ? 'tier2' : 'tier1';
    // Business logic: annual = one-time payment (not recurring); monthly = recurring subscription
    const billingPeriod = tier.endsWith('-annual') ? 'annual' : 'monthly';

    try {
      setIsUpdating(true);
      const functions = getFunctions();
      const updateSubscriptionStatus = httpsCallable(functions, 'updateSubscriptionStatus');
      await updateSubscriptionStatus({ tier: backendTier, paypalOrderId: orderId ?? null, billingPeriod });

      toast({ title: 'Subscription active', description: 'Your mindful access has been unlocked.' });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Subscription update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user || !profile) {
    return <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">Loading...</main>;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] px-4 py-10 text-white sm:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 14% 18%, rgba(255,215,0,0.08), transparent 42%), radial-gradient(circle at 78% 72%, rgba(255,170,0,0.06), transparent 45%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-2xl border border-[#FFD700]/25 bg-[rgba(17,17,17,0.82)] p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#FFD700]/15 p-2">
              <Sun className="h-5 w-5 text-[#FFD700]" />
            </div>
            <Badge className="bg-[#FFD700]/20 text-[#FFE7A0] hover:bg-[#FFD700]/20">Restricted Mode</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Subscription Required</h1>
          <p className="mt-2 text-white/80">
            Your account is in pending mode. Subscribe to unlock full mindful video/text chat.
          </p>

          <div className="mt-6 grid gap-3 rounded-xl border border-white/15 bg-black/25 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Name</p>
              <p className="text-base font-semibold text-white">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Email</p>
              <p className="text-base font-semibold text-white">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Live ID</p>
              <p className="text-base font-semibold text-[#FFD700]">{profile.liveId}</p>
            </div>
          </div>
        </motion.div>

        <PayPalScriptProvider options={paypalOptions}>
          {/* Monthly / Annual switcher */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/45'}`}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              onClick={handleBillingToggle}
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

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {isPaypalMisconfigured && (
              <div className="col-span-full rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                Payment checkout is currently unavailable. Please contact support.
              </div>
            )}
            {(['tier1', 'tier2'] as const).map((base, index) => {
              // Derive the full tier key from billing period state
              const tier: Tier = isAnnual ? `${base}-annual` : `${base}-monthly`;
              const copy = TIER_COPY[tier];
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="relative"
                >
                  {/* Annual deal-lock badge */}
                  <AnimatePresence>
                    {copy.isAnnual && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.85, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -top-3.5 right-4 z-10 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] px-3 py-0.5 text-[11px] font-bold leading-5 text-[#0F0F0F]"
                      >
                        Best Deal – Lock Price
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Card className={copy.isPremium
                    ? 'h-full rounded-2xl border border-[#FFD700]/35 bg-[rgba(17,17,17,0.84)] shadow-[0_0_30px_rgba(255,215,0,0.12)]'
                    : 'h-full rounded-2xl border border-white/20 bg-[rgba(17,17,17,0.78)]'}
                  >
                    <CardContent className="p-6 sm:p-7">
                      <div className="flex items-center gap-2">
                        {copy.isPremium ? <Crown className="h-5 w-5 text-[#FFD700]" /> : <Lock className="h-5 w-5 text-white/75" />}
                        <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
                      </div>

                      <p className={copy.isPremium ? 'mt-4 text-4xl font-bold text-[#FFD700]' : 'mt-4 text-4xl font-bold text-white'}>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={tier}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="inline-block"
                          >
                            ${copy.amount}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-sm font-normal text-white/60">
                          {copy.isAnnual ? ' / year' : ' / month'}
                        </span>
                      </p>

                      {/* Fixed-price note shown only on annual cards */}
                      {copy.isAnnual && (
                        <p className="mt-1 text-[11px] text-white/50">
                          Billed once – fixed price for 12 months. Monthly prices may change in future.
                        </p>
                      )}

                      <ul className="mt-5 space-y-2 text-sm text-white/90">
                        {copy.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className={copy.isPremium ? 'h-4 w-4 text-[#FFD700]/85' : 'h-4 w-4 text-white/80'} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Annual CTA gets stronger scale pulse on hover */}
                      <motion.div
                        whileHover={{ scale: copy.isAnnual ? 1.04 : 1.01 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      >
                        <Button
                          type="button"
                          onClick={() => setSelectedTier(tier)}
                          className="mt-6 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F] hover:shadow-[0_0_18px_rgba(255,215,0,0.4)]"
                        >
                          {copy.button}
                        </Button>
                      </motion.div>

                      {selectedTier === tier && (
                        <div className="mt-4 rounded-xl border border-white/15 bg-black/25 p-3">
                          {isPaypalMisconfigured ? (
                            <p className="text-center text-sm text-red-300">Payment checkout is unavailable.</p>
                          ) : (
                          <PayPalButtons
                            style={{ layout: 'vertical', label: 'paypal', height: 48 }}
                            forceReRender={[copy.amount, tier]}
                            disabled={isUpdating}
                            createOrder={(_data, actions) => {
                              return actions.order.create({
                                intent: 'CAPTURE',
                                purchase_units: [
                                  {
                                    amount: { currency_code: 'USD', value: copy.amount },
                                    // Business logic: both annual and monthly are one-time payments (not recurring) via PayPal Orders
                                    description: `olsme.tv ${copy.title} – ${
                                      copy.isAnnual
                                        ? '12-month plan (one-time payment)'
                                        : '30-day access (one-time, non-recurring)'
                                    }`,
                                  },
                                ],
                              });
                            }}
                            onApprove={async (data, actions) => {
                              if (!actions.order) return;
                              await actions.order.capture();
                              await handleApprove(tier, data.orderID);
                            }}
                          />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </PayPalScriptProvider>
      </div>
    </main>
  );
}
