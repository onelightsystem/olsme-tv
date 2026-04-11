'use client';

import Link from 'next/link';
import { Lock, Heart, Users, Sparkles, Sun } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import DeveloperLogTimeline from '@/components/DeveloperLogTimeline';
import { useLightTime } from '@olsystem/lt-lh';

export default function AboutPage() {
  const { hour, day } = useLightTime();

  const accessLevels = [
    {
      name: 'Entry Key',
      price: '$0.10/month recurring',
      description:
        'Low-barrier entry for building and verifying your Global Live ID, joining Host TV sessions as a viewer, and unlocking live users directory access after passing advanced verification levels.',
    },
    {
      name: 'Starter',
      price: '$0.25/month or $10/year lock',
      description: 'Unlocks full random video chat and core hosting flow so you can connect more deeply and more often.',
    },
    {
      name: 'Premium',
      price: '$1/month or $30/year lock',
      description: 'Unlocks unlimited sessions, advanced hosting freedom, and the complete conscious communication experience.',
    },
  ];

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
          <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-[#FFD700]/35 bg-[#14110A]/75 p-5 text-center shadow-[0_0_40px_rgba(255,215,0,0.08)] sm:p-7">
            <h2 className="text-xl font-semibold leading-relaxed text-white sm:text-2xl">
              olsme.tv is <span className="text-[#FFD700]">powered by olsme.com</span>
            </h2>
            <p className="mt-2 text-base leading-relaxed text-gray-200 sm:text-lg">
              All olsme tech subscriptions and features are delivered directly through{' '}
              <span className="font-semibold text-[#FFD700]">olsme.com</span>.
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-gray-300 sm:text-lg">
            olsme.tv is a mindful random video chat platform inside the OneLightSystem vision, designed to turn online encounters into more respectful,
            heart-centered conversations. We are building for depth, safety, and awakening energy.
          </p>

          {/* OLS Light Time */}
          <article className="mx-auto mt-10 max-w-2xl rounded-2xl border border-[#FFD700]/30 bg-[#14110A]/80 p-6 shadow-[0_0_50px_rgba(255,215,0,0.10)] sm:p-8">
            <h2 className="flex items-center justify-center gap-2 text-center text-2xl font-semibold text-white">
              <Sun className="h-6 w-6 text-[#FFD700]" aria-hidden="true" />
              OLS Light Time
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {/* Light Hour / Dark Hour */}
              <div
                className="flex flex-col items-center justify-center rounded-xl p-5 sm:p-6"
                style={{
                  background: hour.isLightHour
                    ? 'linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FFA500 100%)'
                    : 'linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #1A1A1A 100%)',
                  border: hour.isDarkHour ? '1px solid rgba(255,255,255,0.12)' : 'none',
                }}
              >
                <span className={`text-sm font-medium uppercase tracking-wider ${hour.isLightHour ? 'text-black/60' : 'text-white/50'}`}>
                  {hour.isLightHour ? 'Light Hour' : 'Dark Hour'}
                </span>
                <span className={`mt-1 text-4xl font-bold sm:text-5xl ${hour.isLightHour ? 'text-black' : 'text-white'}`}>
                  {hour.lightTime}
                </span>
              </div>

              {/* Light Day */}
              <div className="flex flex-col items-center justify-center rounded-xl p-5 sm:p-6"
                style={{ background: 'linear-gradient(135deg, #0B3D0B 0%, #1A5C1A 50%, #2E7D2E 100%)' }}>
                <span className="text-sm font-medium uppercase tracking-wider text-white/60">Light Day</span>
                <span className="mt-1 text-4xl font-bold text-white sm:text-5xl">{(day.day - 1) % 365}<span className="text-2xl sm:text-3xl">LD</span></span>
              </div>
            </div>

            <p className="mt-5 text-center text-sm leading-relaxed text-gray-400">
              We are now using the official OneLightSystem OLS Light Time system.
              Light Hour (LH) shows your position in the natural solar day.
              Light Day (LD) tracks progress since the Winter Solstice.
            </p>
          </article>

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
                Version <span className="font-semibold text-[#FFD700]">v0.4.2 (March 2026)</span> is live with our three-tier model: <span className="font-semibold text-[#FFD700]">Entry Key</span>
                {' '}($0.10/month), <span className="font-semibold text-[#FFD700]">Starter</span> ($0.25/month or $10/year lock), and{' '}
                <span className="font-semibold text-[#FFD700]">Premium</span> ($1/month or $30/year lock).
                {' '}All tiers are currently in <span className="font-bold text-red-500">Beta Mode</span>.
                {' '}Lock your price now — these are early-stage rates and will increase as the platform grows.
                {' '}Early adopters keep their locked price forever, even after future adjustments.
              </p>
            </article>
          </div>

          <article className="mt-4 rounded-2xl border border-white/10 bg-[#111111]/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-white">Access Levels</h2>
            <p className="mt-3 text-gray-300">
              Every tier is designed to meet you where you are, while supporting a mindful and verified global community.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {accessLevels.map((tier) => (
                <div
                  key={tier.name}
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <h3 className="text-xl font-semibold text-[#FFD700]">{tier.name}</h3>
                  <p className="mt-1 text-sm font-medium text-gray-200">{tier.price}</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">{tier.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="group mt-4 rounded-2xl border border-white/10 bg-[#111111]/80 p-6 transition-all duration-300 hover:border-[#FFD700]/30 hover:shadow-[0_0_40px_rgba(255,215,0,0.10)] sm:p-8">
            <h2 className="text-2xl font-semibold text-white">
              <span className="text-[#FFD700]">Privacy</span> Policy
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-gray-300">
              At olsme.tv we protect your light. We collect minimal data: email, name, Live ID, politeness scores, and optional profile details (for
              verified levels). No tracking cookies beyond essential Firebase auth. All conversations are end-to-end encrypted where possible. We
              never sell your data. You control deletion via profile settings. Full policy available at olsme.com/privacy. We build for trust,
              transparency, and awakening - your privacy is sacred.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="https://olsme.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#FFD700]/35 bg-[#17120A] px-4 py-3 text-sm font-semibold text-[#FFD700] transition-colors hover:bg-[#20180D]"
              >
                View Full Policy
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-400">Last updated: March 22, 2026</p>
          </article>
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