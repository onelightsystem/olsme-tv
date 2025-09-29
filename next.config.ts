/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // MVP speed (Month 1)
  },
  eslint: {
    ignoreDuringBuilds: true, // Solo efficiency
  },
  images: {
    unoptimized: true, // Prototype phase
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'olsme.com', pathname: '/assets/**' }, // OLS meditation assets
    ],
  },
  turbopack: {
    root: './',
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'], // Hand-drawn Sun icons (blueprint)
        as: '*.js',
      },
    },
    resolveAlias: {
      '@ols-components': './src/components', // Biofeedback prompts (Day 11)
      '@lib': './src/lib', // Firebase, IPFS utils (Day 2/4)
      '@ui': './src/components/ui', // shadcn UI components
      '@utils': './src/lib/utils', // shadcn utilities
      '@hooks': './src/hooks', // Custom hooks (e.g., auth)
    },
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.mdx'],
  },
  env: {
    // Secure Firebase keys (Day 2, avoid hardcoding)
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  },
};

export default nextConfig;