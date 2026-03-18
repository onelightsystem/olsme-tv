'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Lock, Heart, Users, Sparkles } from 'lucide-react';

export type LogEntry = {
  date: Date;
  title: string;
  description: string;
  screenshot?: string;
};

export const developerLogEntries: LogEntry[] = [
  {
    date: new Date('2026-03-17'),
    title: 'Premium subscription button & PayPal integration added',
    description:
      'We shipped the first premium activation path with a PayPal-ready flow and polished golden interactions to match the olsme.tv visual language.',
  },
  {
    date: new Date('2026-03-01'),
    title: 'React 19 + Tailwind 4 modernization wave completed',
    description:
      'The app was fully modernized to Next.js 15, React 19, and Tailwind v4, improving type safety, performance, and iteration speed across the product.',
  },
  {
    date: new Date('2026-02-01'),
    title: 'Politeness scoring prototype live in dev mode',
    description:
      'Real-time AI politeness scoring was connected in development, enabling fast experimentation with mindful behavior feedback loops.',
  },
  {
    date: new Date('2026-01-01'),
    title: 'WebRTC video chat foundation stabilized',
    description:
      'Core call flow and camera lifecycle handling were stabilized, creating a reliable base for random mindful chat sessions.',
  },
  {
    date: new Date('2025-08-01'),
    title: 'olsme.tv project kickoff (branch from olsme.com)',
    description:
      'The olsme.tv branch began as a focused effort to build spiritually aligned social technology for kinder human connection.',
  },
];

const cardMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutPage() {
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

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-10">
          <h1 className="text-balance text-center text-4xl font-bold leading-tight text-white sm:text-5xl">
            About <span className="text-[#FFD700]">olsme.tv</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-gray-300 sm:text-lg">
            olsme.tv is a mindful random video chat platform inside the OneLightSystem vision, designed to turn online encounters into more respectful,
            heart-centered conversations. We are building for depth, safety, and awakening energy.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-semibold text-white">
                <Heart className="h-6 w-6 text-[#FFD700]" aria-hidden="true" />
                Why We Exist
              </h2>
              <p className="mt-3 text-gray-300">
                Traditional social platforms reward noise. We focus on mindful dialogue, emotional presence, and conscious interaction through real-time video.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-semibold text-white">
                <Lock className="h-6 w-6 text-[#FFD700]" aria-hidden="true" />
                Privacy + Trust
              </h2>
              <p className="mt-3 text-gray-300">
                Live IDs, moderation controls, and transparent product iteration help create a safer space where users can show up authentically.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-semibold text-white">
                <Users className="h-6 w-6 text-[#FFD700]" aria-hidden="true" />
                Community Direction
              </h2>
              <p className="mt-3 text-gray-300">
                We are shaping a global culture where technology supports empathy, reflection, and meaningful connection between strangers.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-semibold text-white">
                <Sparkles className="h-6 w-6 text-[#FFD700]" aria-hidden="true" />
                Current Phase
              </h2>
              <p className="mt-3 text-gray-300">
                We are iterating quickly on premium experience, AI politeness scoring, and resilient real-time chat foundations to scale with integrity.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="developer-log" className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur-md sm:p-10">
          <h2 className="mb-8 text-center text-3xl font-bold text-white">Developer Log</h2>
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
                  className="ml-0"
                  variants={cardMotion}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-md">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <time className="text-[#FFD700] font-medium">{format(entry.date, 'MMMM d, yyyy')}</time>
                      <span className="inline-flex min-h-12 items-center rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 text-xs font-semibold tracking-wide text-[#FFE7A0]">
                        Shipping Update
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white">{entry.title}</h3>
                        <p className="mt-2 text-gray-300">{entry.description}</p>
                      </div>

                      {entry.screenshot ? (
                        <img
                          src={entry.screenshot}
                          alt={`Screenshot for ${entry.title}`}
                          className="h-28 w-full rounded-lg object-cover md:h-32"
                        />
                      ) : (
                        <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center text-sm text-gray-400 md:h-32">
                          Screenshot placeholder
                        </div>
                      )}
                    </div>
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