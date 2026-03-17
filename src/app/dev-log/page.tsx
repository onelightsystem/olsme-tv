'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';

type LogEntry = {
  date: Date;
  title: string;
  description: string;
};

const developerLogEntries: LogEntry[] = [
  {
    date: new Date('2026-03-17'),
    title: 'Premium subscription button & PayPal integration added',
    description:
      'We shipped the first premium activation path with a PayPal-ready flow and refined golden interactions across key entry points.',
  },
  {
    date: new Date('2026-03-01'),
    title: 'React 19 + Tailwind 4 modernization wave completed',
    description:
      'The platform moved to the latest stack for stronger type safety, performance, and smoother feature delivery.',
  },
  {
    date: new Date('2026-02-01'),
    title: 'Politeness scoring prototype live in dev mode',
    description:
      'Real-time AI politeness scoring entered active development to support more conscious and respectful conversations.',
  },
  {
    date: new Date('2026-01-01'),
    title: 'WebRTC video chat foundation stabilized',
    description:
      'Core camera and call lifecycle behavior was stabilized as the reliability base for mindful random chat.',
  },
  {
    date: new Date('2025-08-01'),
    title: 'olsme.tv project kickoff (branch from olsme.com)',
    description:
      'The product initiative started with a clear mission: use technology to support kinder human connection.',
  },
];

const cardMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DevLogPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(255, 215, 0, 0.07), transparent 40%), radial-gradient(circle at 80% 76%, rgba(255, 170, 0, 0.06), transparent 46%)',
        }}
        aria-hidden="true"
      />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur-md sm:p-10">
          <h1 className="mb-3 text-center text-4xl font-bold text-white sm:text-5xl">Developer Log</h1>
          <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-300">
            We&apos;re building olsme.tv - mindful random video chats with real-time AI politeness scoring and Live IDs.
            <br />
            Here&apos;s what we&apos;re shipping, step by step. Let&apos;s awaken humanity together.
          </p>

          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-[#FFD700]/70 via-[#FFB347]/40 to-transparent" aria-hidden="true" />

            <ol className="relative space-y-6">
              {developerLogEntries.map((entry, index) => (
                <motion.li
                  key={`${entry.title}-${index}`}
                  variants={cardMotion}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-md">
                    <time className="text-[#FFD700] font-medium">{format(entry.date, 'MMMM d, yyyy')}</time>
                    <h2 className="mt-2 text-xl font-bold text-white">{entry.title}</h2>
                    <p className="mt-2 text-gray-300">{entry.description}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
