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
