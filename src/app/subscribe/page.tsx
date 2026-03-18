'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Crown, Lock, CheckCircle, Sun } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

type Tier = 'tier1' | 'tier2';

type ProfileView = {
  name: string;
  email: string;
  liveId: string;
};

const TIER_COPY: Record<Tier, { amount: string; title: string; button: string; features: string[] }> = {
  tier1: {
    amount: '0.25',
    title: 'Basic Entry',
    button: 'Choose Basic - $0.25/month',
    features: [
      'Random non-video text chat',
      'AI politeness score',
      'Live users access',
      'Global Live ID establishment',
    ],
  },
  tier2: {
    amount: '1.00',
    title: 'Full Awakening',
    button: 'Upgrade Now - $1/month',
    features: [
      'Unlimited sessions',
      'Full AI politeness insights',
      'Priority matching',
      'Builds Global Live ID history',
    ],
  },
};

export default function SubscribePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          router.replace('/');
          return;
        }

        setUser(currentUser);

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.exists() ? (userDoc.data() as Record<string, unknown>) : {};

        setProfile({
          name: typeof userData.displayName === 'string' && userData.displayName.length > 0
            ? userData.displayName
            : (currentUser.displayName || 'Awakener'),
          email: currentUser.email || 'No email provided',
          liveId:
            (typeof userData.decentralizedId === 'string' && userData.decentralizedId.length > 0
              ? userData.decentralizedId
              : currentUser.uid),
        });
      } catch {
        // Fall back to auth-only profile if Firestore read fails
        setProfile({
          name: currentUser.displayName || 'Awakener',
          email: currentUser.email || 'No email provided',
          liveId: currentUser.uid,
        });
      }
    });

    return () => unsubscribe();
  }, [router]);

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

    try {
      setIsUpdating(true);
      const functions = getFunctions();
      const updateSubscriptionStatus = httpsCallable(functions, 'updateSubscriptionStatus');
      await updateSubscriptionStatus({ tier, paypalOrderId: orderId ?? null });

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
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {isPaypalMisconfigured && (
              <div className="col-span-full rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                Payment checkout is currently unavailable. Please contact support.
              </div>
            )}
            {(['tier1', 'tier2'] as const).map((tier, index) => {
              const isPremium = tier === 'tier2';
              const copy = TIER_COPY[tier];
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                >
                  <Card className={isPremium
                    ? 'h-full rounded-2xl border border-[#FFD700]/35 bg-[rgba(17,17,17,0.84)] shadow-[0_0_30px_rgba(255,215,0,0.12)]'
                    : 'h-full rounded-2xl border border-white/20 bg-[rgba(17,17,17,0.78)]'}
                  >
                    <CardContent className="p-6 sm:p-7">
                      <div className="flex items-center gap-2">
                        {isPremium ? <Crown className="h-5 w-5 text-[#FFD700]" /> : <Lock className="h-5 w-5 text-white/75" />}
                        <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
                      </div>

                      <p className={isPremium ? 'mt-4 text-4xl font-bold text-[#FFD700]' : 'mt-4 text-4xl font-bold text-white'}>
                        ${copy.amount}
                        <span className="text-sm font-normal text-white/60"> / month</span>
                      </p>

                      <ul className="mt-5 space-y-2 text-sm text-white/90">
                        {copy.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className={isPremium ? 'h-4 w-4 text-[#FFD700]/85' : 'h-4 w-4 text-white/80'} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={isPremium
                          ? 'mt-6 min-h-12 w-full bg-gradient-to-r from-[#FFD700] to-[#FFAA00] font-bold text-[#0F0F0F] hover:shadow-[0_0_18px_rgba(255,215,0,0.4)]'
                          : 'mt-6 min-h-12 w-full border border-white/35 bg-white/5 font-semibold text-white hover:bg-white/15'}
                      >
                        {copy.button}
                      </Button>

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
                                    description: `olsme.tv ${copy.title} monthly subscription`,
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
