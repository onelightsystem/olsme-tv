// Path: next.config.mjs
// Improvements (Oct 2, 2025):
// - Added mocks for `node:fs` and `node:net` to resolve `ipfs-http-client` errors.
// - Removed invalid `srcDir` option (Next.js 15.5.3 compatibility).
// - Kept Webpack mock for `electron` and image domains.
// - Solo Tip: Run `npm run build` to verify no errors, test images from olsme.com.
//
// Known issue (Phase 3 refactor, Sep 2026): `firebase deploy` fails to bundle this file
// into the SSR Cloud Function with `"external" must be an array of strings`. Root cause:
// firebase-tools' esbuild-based bundler expects esbuild ^0.19.2, but the resolved esbuild
// (0.28.1) comes transitively from genkit-cli -> @genkit-ai/tools-common -> tsx. Pinning
// esbuild down would likely break tsx/genkit-cli, so no safe local fix exists yet; deploy
// currently proceeds with a warning and does not block hosting/functions releases.

// Build-time diagnostic (this file runs on the build machine / dev server only — it is never
// bundled into the client, so this cannot leak to the browser): confirms which Turnstile site
// key pair `next build` actually resolved. Next's env priority puts `process.env` above every
// `.env*` file, so a stray shell-exported NEXT_PUBLIC_TURNSTILE_SITE_KEY silently outranks
// `.env.production.local` — this line is the fastest way to catch that in the deploy log.
const turnstileSiteKeyAtBuild = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
console.log(
  '[next.config.mjs] NEXT_PUBLIC_TURNSTILE_SITE_KEY resolved as:',
  !turnstileSiteKeyAtBuild ? 'unset' : turnstileSiteKeyAtBuild.startsWith('1x0000') ? 'DUMMY test pair' : 'real key (value redacted)'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@olsystem/lt-lh'],
  // turbopack: {} — used by Firebase deploy (next build defaults to Turbopack in Next.js 16)
  // webpack: used by local dev/build (next dev --webpack / next build --webpack)
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true, // MVP speed (Month 1)
  },
  images: {
    unoptimized: true, // Prototype phase
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'olsme.com', pathname: '/assets/**' },
    ],
  },
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    NEXT_PUBLIC_IPFS_URL: process.env.NEXT_PUBLIC_IPFS_URL || 'https://ipfs.infura.io:5001',
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      electron: false,
      'node:fs': false, // Mock node:fs
      'node:net': false, // Mock node:net
    };
    return config;
  },
};

export default nextConfig;