'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { developerLogEntries } from '@/lib/developer-log';

const cardMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DeveloperLogTimeline() {
  return (
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
  );
}
