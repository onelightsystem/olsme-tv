'use client';

import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';

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
  const resolvedClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ??
    (process.env.NODE_ENV === 'development' ? 'test' : undefined);

  if (!resolvedClientId) {
    console.error(
      'PayPal client ID is missing. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID to enable PayPal checkout.'
    );
  }

  const paypalOptions: ReactPayPalScriptOptions | undefined = resolvedClientId
    ? {
        clientId: resolvedClientId,
        currency,
        intent: 'capture',
      }
    : undefined;

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
                createOrder={(_data, actions) => {
                  return actions.order.create({
                    intent: 'CAPTURE',
                    purchase_units: [
                      {
                        amount: {
                          currency_code: currency,
                          value: amount,
                        },
                        description: 'OLS Premium Monthly Plan',
                      },
                    ],
                  });
                }}
                onApprove={async (_data, actions) => {
                  if (!actions.order) return;
                  await actions.order.capture();
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
