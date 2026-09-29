export type LogEntry = {
  date: Date;
  title: string;
  description: string;
  screenshot?: string;
};

export const developerLogEntries: LogEntry[] = [
  {
    date: new Date('2026-09-29'),
    title: 'Turnstile gate 400 fixed — canonical URL moved to Firebase Hosting',
    description:
      'Fixed a local dev bug where the entry gate always rejected verification with a 400: ' +
      'Cloudflare\'s official dummy test key pair returns success without an "action" field, ' +
      'but our check required an exact action match. The route now recognizes the test-key ' +
      'response and only enforces the action match for real production tokens.\n\n' +
      'The custom domain olsme.tv is not being renewed. The canonical public URL is now the ' +
      'Firebase Hosting URL, https://studio-4615914296-4bd91.web.app. ' +
      'olsme.tv / OneLightSystem OLS is open for investors and collaborators — see /about for details.',
  },
  {
    date: new Date('2026-03-28'),
    title: 'v0.4.2 - Full SSR Restored – Cloud Run 409 Bug Resolved',
    description:
      'Version 0.4.2 restores full Server-Side Rendering via Firebase Hosting + Cloud Run.\n\n' +
      'The Cloud Run 409 revision-conflict bug (firebase-tools #10148 / #10155) is resolved in firebase-tools v15.12.0. ' +
      'All changes from the temporary static export workaround have been cleanly reverted:\n' +
      '- next.config.mjs: removed output: \'export\'\n' +
      '- firebase.json: restored frameworksBackend block (us-central1)\n' +
      '- API routes (/api/ipfs, /api/ipfs-upload, /api/verify-turnstile): original POST handlers restored\n' +
      '- PayPal callables and WebRTC signaling are now fully server-side again\n\n' +
      'SSR benefits restored: faster first paint, dynamic server rendering for /profile, /subscribe, and all API routes.',
  },
  {
    date: new Date('2026-03-22'),
    title: 'v0.4.1 - Subscription Cards & Lockable Deals Live',
    description:
      'Version 0.4.1 ships with refreshed subscription cards on the landing page.\n\n' +
      'We now offer three tiers:\n' +
      '- Entry Key - $0.10/month (recurring, low-barrier onboarding: verified Global Live ID, live hosts directory access, viewer-only Host TV watching)\n' +
      '- Starter Access - $0.25/month or lock $10/year\n' +
      '- Premium Access - $1/month or lock $30/year\n\n' +
      'Early adopters can lock annual deals at these rates - first come, first served. Once claimed, these historical prices stay tied to your account even if we adjust plans later. This rewards fast action and builds long-term community trust.\n\n' +
      '[Screenshot of current landing page with 3 cards]',
  },
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
