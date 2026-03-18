'use client';

import { Lock, Heart, Users, Sparkles } from 'lucide-react';
import DeveloperLogTimeline from '@/components/DeveloperLogTimeline';

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

          <DeveloperLogTimeline />
        </div>
      </section>
    </main>
  );
}