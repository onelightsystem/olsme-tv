// src/components/GateOfProtection.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Sun } from 'lucide-react';
import { cn } from '@lib/utils';

// ---------- constants ----------
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SESSION_KEY = 'olsme_gate_verified';
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 12_000;

// ---------- Cloudflare Turnstile global types ----------
interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    cfturnstile?: TurnstileApi;
  }
}

type GateState = 'waiting-script' | 'idle' | 'verifying' | 'error';

const getTurnstileApi = () =>
  typeof window === 'undefined' ? undefined : window.turnstile ?? window.cfturnstile;

// Stable particle positions — no random values to avoid hydration mismatch
const PARTICLES = [
  { left: '8%',  top: '18%', size: 2, dur: 3.2, delay: 0.0 },
  { left: '19%', top: '62%', size: 3, dur: 4.1, delay: 0.5 },
  { left: '31%', top: '82%', size: 2, dur: 3.8, delay: 1.1 },
  { left: '67%', top: '22%', size: 3, dur: 4.5, delay: 0.3 },
  { left: '79%', top: '58%', size: 2, dur: 3.6, delay: 0.8 },
  { left: '88%', top: '75%', size: 3, dur: 4.2, delay: 1.4 },
  { left: '44%', top: '10%', size: 2, dur: 3.0, delay: 0.6 },
  { left: '56%', top: '88%', size: 3, dur: 4.8, delay: 0.2 },
] as const;

/**
 * Client-side UX gate only.
 * Server-rendered content still needs server-side checks (for example middleware + httpOnly cookie validation)
 * if it must be protected from direct HTTP access.
 */
export default function GateOfProtection() {
  // Start hidden to avoid SSR/hydration mismatch; mount effect reveals if not verified
  const [visible, setVisible] = useState(false);
  const [token, setToken] = useState('');
  const [gateState, setGateState] = useState<GateState>('waiting-script');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Render the Turnstile widget into containerRef ----
  const renderWidget = useCallback(() => {
    if (!containerRef.current) return;
    if (widgetIdRef.current) return; // already rendered
    const turnstile = getTurnstileApi();
    if (!turnstile) return;

    if (!SITE_KEY) {
      if (process.env.NODE_ENV === 'production') {
        setGateState('error');
        setErrorMsg(
          'Verification is unavailable. Please refresh the page or contact support if the problem persists.'
        );
      } else {
        // Development: no site key configured — allow bypass with a warning
        console.warn(
          '[GateOfProtection] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. ' +
          'Gate is bypassed in dev mode. Set the key for production.'
        );
        setToken('__dev_bypass__');
        setGateState('idle');
      }
      return;
    }

    const id = turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      action: 'gate',
      theme: 'dark',
      size: 'normal',
      appearance: 'always',
      callback: (t) => {
        setToken(t);
        setGateState('idle');
      },
      'expired-callback': () => {
        setToken('');
        setGateState('idle');
      },
      'error-callback': () => {
        setGateState('error');
        setErrorMsg('Verification widget encountered an error. Please try again or refresh.');
      },
    });

    widgetIdRef.current = id;
  }, []);

  // ---- Poll for the Turnstile global (script loads async) ----
  const startPolling = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Script may already be loaded (e.g. second render or retry)
    if (getTurnstileApi()) {
      setGateState('idle');
      renderWidget();
      return;
    }

    setGateState('waiting-script');
    let elapsed = 0;

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;
      if (getTurnstileApi()) {
        clearInterval(pollIntervalRef.current!);
        setGateState('idle');
        renderWidget();
      } else if (elapsed >= POLL_TIMEOUT_MS) {
        clearInterval(pollIntervalRef.current!);
        setGateState('error');
        setErrorMsg(
          'Verification service could not load. ' +
          'Please check your connection and refresh the page.'
        );
      }
    }, POLL_INTERVAL_MS);
  }, [renderWidget]);

  // ---- Session check on mount (client-only, no SSR) ----
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') return;
    } catch {
      // sessionStorage blocked in some private-browsing environments → still show gate
    }
    setVisible(true);
  }, []);

  // ---- Start polling once gate becomes visible ----
  useEffect(() => {
    if (!visible) return;
    startPolling();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [visible, startPolling]);

  // ---- Prevent Escape key from dismissing (non-dismissible requirement) ----
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [visible]);

  // ---- Lock body scroll while gate is open ----
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // ---- Focus dialog for keyboard users when it opens ----
  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
  }, [visible]);

  // ---- Clean up Turnstile widget on component unmount ----
  useEffect(() => {
    return () => {
      const turnstile = getTurnstileApi();
      if (widgetIdRef.current && turnstile) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore — widget may already be gone
        }
      }
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ---- Verify handler ----
  const handleVerify = async () => {
    if (!token || gateState === 'verifying') return;

    // Dev bypass (no site key configured)
    if (token === '__dev_bypass__') {
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // ignore
      }
      setVisible(false);
      return;
    }

    setGateState('verifying');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken: token, expectedAction: 'gate' }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        try {
          sessionStorage.setItem(SESSION_KEY, 'true');
        } catch {
          // ignore
        }
        setVisible(false);
      } else {
        setGateState('error');
        setErrorMsg(
          'Verification did not pass. Please complete the challenge and try again.'
        );
        const turnstile = getTurnstileApi();
        if (widgetIdRef.current && turnstile) {
          turnstile.reset(widgetIdRef.current);
        }
        setToken('');
      }
    } catch {
      setGateState('error');
      setErrorMsg('Connection issue. Please check your network and try again.');
    }
  };

  // ---- Retry handler ----
  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setToken('');
    const turnstile = getTurnstileApi();
    if (widgetIdRef.current && turnstile) {
      // Widget is rendered — just reset it
      turnstile.reset(widgetIdRef.current);
      setGateState('idle');
    } else {
      // Widget was never rendered or was removed — start fresh
      widgetIdRef.current = null;
      startPolling();
    }
  }, [startPolling]);

  const canVerify = !!token && gateState === 'idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={dialogRef}
          key="olsme-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background:
              'radial-gradient(ellipse 140% 90% at 50% -5%, rgba(20,17,2,0.98) 0%, rgba(5,5,5,0.995) 60%)',
          }}
          // Prevent any underlying interaction (backdrop click does nothing)
          onClick={(e) => e.stopPropagation()}
          aria-modal="true"
          role="dialog"
          aria-label="Entry verification gate"
          aria-describedby="gate-description"
          tabIndex={0}
        >
          {/* Sun glow backdrop */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,215,0,0.16) 0%, rgba(255,165,0,0.07) 45%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          {/* Floating sun particles */}
          {PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute rounded-full bg-[#FFD700]"
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                top: p.top,
                opacity: 0.18,
              }}
              animate={{ y: [0, -10, 0], opacity: [0.18, 0.4, 0.18] }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
              aria-hidden="true"
            />
          ))}

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.91, y: 32, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative mx-4 max-h-[94vh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-[#FFD700]/20 bg-[rgba(10,10,10,0.93)] shadow-[0_0_80px_rgba(255,215,0,0.10),0_24px_64px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
          >
            {/* Top gold rule */}
            <div className="h-[2px] w-full rounded-t-2xl bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center">
                {/* Sun icon with pulse ring */}
                <div className="relative mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#FFD700]/25 bg-gradient-to-b from-[rgba(255,215,0,0.10)] to-[rgba(255,165,0,0.04)]">
                  <Sun className="h-7 w-7 text-[#FFD700]" aria-hidden="true" />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-[#FFD700]/20"
                    animate={{ scale: [1, 1.55, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                </div>

                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  Entry Verification Gate
                </h1>
                <div className="mt-2 h-[1.5px] w-16 rounded-full bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
                <p
                  id="gate-description"
                  className="mt-3 text-sm leading-relaxed text-white/50"
                >
                  Protecting mindful conversations from automated crawlers.
                  <br />
                  Real humans always enter free.
                </p>
              </div>

              {/* Verification area */}
              <div className="mt-6 flex flex-col items-center gap-4">
                {/* Script-loading spinner */}
                {gateState === 'waiting-script' && (
                  <div className="flex min-h-[66px] items-center gap-2 text-sm text-[#FFD700]/50">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Loading verification…</span>
                  </div>
                )}

                {/* Cloudflare Turnstile widget mount point */}
                <div
                  ref={containerRef}
                  className="overflow-hidden rounded-lg"
                  aria-label="Human verification challenge"
                />

                {/* Error message */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full items-start gap-2 rounded-xl border border-[#FFA500]/22 bg-[#FFA500]/[0.05] px-3 py-2.5"
                    role="alert"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#FFA500]"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-[#FFE7A0]">{errorMsg}</p>
                  </motion.div>
                )}

                {/* Primary "Verify & Enter" button */}
                <motion.button
                  onClick={handleVerify}
                  disabled={!canVerify}
                  whileHover={canVerify ? { scale: 1.025 } : undefined}
                  whileTap={canVerify ? { scale: 0.975 } : undefined}
                  className={cn(
                    'relative min-h-[52px] w-full overflow-hidden rounded-xl px-6 py-3 text-base font-semibold transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD700]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    canVerify
                      ? 'cursor-pointer bg-gradient-to-r from-[#FFD700] via-[#FFC93C] to-[#FFA500] text-black shadow-[0_4px_28px_rgba(255,215,0,0.28)]'
                      : 'cursor-not-allowed bg-white/[0.05] text-white/22'
                  )}
                  aria-label={
                    gateState === 'verifying'
                      ? 'Verifying identity…'
                      : 'Verify and enter the site'
                  }
                  aria-busy={gateState === 'verifying'}
                >
                  {/* Pulse shimmer on enabled state */}
                  {canVerify && (
                    <motion.span
                      className="absolute inset-0 bg-white/[0.12]"
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {gateState === 'verifying' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Verify &amp; Enter
                      </>
                    )}
                  </span>
                </motion.button>

                {/* Retry link (shown after errors) */}
                {(gateState === 'error' || (gateState === 'idle' && errorMsg)) && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 text-sm text-[#FFD700]/50 underline underline-offset-2 transition-colors hover:text-[#FFD700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/35"
                    aria-label="Try the verification again"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Try again
                  </button>
                )}
              </div>

              {/* AI Crawler & Bot Policy */}
              <div className="mt-6 rounded-xl border border-[#FFD700]/12 bg-[#FFD700]/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-[3px] w-[3px] rounded-full bg-[#FFD700]" aria-hidden="true" />
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFD700]/70">
                    AI Crawler &amp; Bot Policy
                  </h2>
                </div>
                <p className="text-[11px] leading-[1.7] text-white/38">
                  Automated AI systems, scrapers, and bots must contact us to arrange a daily
                  access fee for any indexing or research activities. Unauthorized crawling
                  violates our terms. Legitimate human visitors receive free access after
                  completing this verification. For fee arrangements please reach out via{' '}
                  <a
                    href="https://x.com/onelightsystem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFD700]/60 underline underline-offset-2 hover:text-[#FFD700] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFD700]/40"
                    aria-label="Contact on X (formerly Twitter) at onelightsystem"
                  >
                    X @onelightsystem
                  </a>
                  . This gate protects our community and supports the platform&apos;s mission.
                </p>
              </div>
            </div>

            {/* Bottom gold rule */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#FFD700]/22 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
