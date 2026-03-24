'use client';

import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@hooks/use-toast';
import { useRouter } from 'next/navigation';

type PremiumButtonProps = {
  amount?: string;
  currency?: string;
  className?: string;
};

export default function PremiumButton({
  amount = '1.00',
  currency = 'USD',
  className,
}: PremiumButtonProps) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isPaypalMisconfigured = !paypalClientId && process.env.NODE_ENV === 'production';
  const { toast } = useToast();
  const router = useRouter();

  if (isPaypalMisconfigured) {
    console.error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set. PayPal checkout is disabled.');
    return null;
  }

  const paypalOptions: ReactPayPalScriptOptions = {
    clientId: paypalClientId ?? 'test',
    currency,
    intent: 'capture',
  };

  return (
    <div
      className={[
        'w-full rounded-3xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {paypalOptions ? (
        <PayPalScriptProvider options={paypalOptions}>
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-2 rounded-[1.4rem] bg-gradient-to-r from-[#FFD700]/0 via-[#FFD700]/35 to-[#FFAA00]/0 opacity-[0] blur-xl transition-opacity duration-300 group-hover:opacity-[1]" />

            <motion.div
              whileHover={{ boxShadow: '0 0 28px rgba(255, 196, 0, 0.45)' }}
              transition={{ duration: 0.25 }}
              className="group relative w-full overflow-hidden rounded-2xl"
            >
              <div className="pointer-events-none absolute -left-14 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[#FFD700]/25 blur-2xl transition-all duration-300 group-hover:scale-125 group-hover:bg-[#FFD700]/35" />

              <button
                type="button"
                className="relative mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFAA00] py-5 text-base font-semibold text-slate-950"
                aria-label="Upgrade to Premium – $1/month"
              >
                <Crown className="h-5 w-5" />
                Upgrade to Premium – $1/month
              </button>

              <PayPalButtons
                style={{ layout: 'horizontal', label: 'paypal', height: 48 }}
                forceReRender={[amount, currency]}
                createOrder={async (_data, actions) => {
                  // Call backend to create PayPal order server-side
                  const functions = getFunctions();
                  const createOrder = httpsCallable(functions, 'createPaypalOrder');
                  const result = await createOrder({
                    amount,
                    tier: 'tier2',
                    period: 'monthly',
                  }) as {data: {orderID: string}};
                  return result.data.orderID;
                }}
                onApprove={async (data) => {
                  try {
                    // Capture server-side: verifies payment, sets premium claim, updates Firestore
                    const functions = getFunctions();
                    const captureOrder = httpsCallable(functions, 'capturePaypalOrder');
                    await captureOrder({
                      orderId: data.orderID,
                      tier: 'tier2',
                      period: 'monthly',
                    });
                    toast({ title: 'Premium activated', description: 'Your premium access is now active.' });
                    router.push('/');
                  } catch (error) {
                    toast({
                      variant: 'destructive',
                      title: 'Error',
                      description: error instanceof Error ? error.message : 'Payment failed. Please try again.',
                    });
                  }
                }}
              />
            </motion.div>
          </motion.div>
        </PayPalScriptProvider>
      ) : (
        <p className="text-sm text-red-400">
          PayPal checkout is currently unavailable. Please try again later.
        </p>
      )}
    </div>
  );
}
