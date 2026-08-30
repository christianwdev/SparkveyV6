import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const STYLES_DIR = path.resolve(__dirname, './app/_styles');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const NEXT_BUILD_CPUS = Number(process.env.NEXT_BUILD_CPUS ?? 2);

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  experimental: {
    workerThreads: false,
    cpus: Number.isFinite(NEXT_BUILD_CPUS) ? NEXT_BUILD_CPUS : 4,
  },

  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',

    // Offer-wall creatives use arbitrary CDNs — those render via <img>, not next/image.
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'worldflags.io' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'sparkvey.com' },
      { protocol: 'https', hostname: 'www.sparkvey.com' },
      { protocol: 'https', hostname: 'api.sparkvey.com' },
      { protocol: 'https', hostname: 'api.sparkveystaging.com' },
      { protocol: 'https', hostname: 'stagingapi.sparkvey.com' },
      { protocol: 'https', hostname: 'avatars.sparkvey.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  sassOptions: {
    includePaths: [ STYLES_DIR ],
  },

  turbopack: {
    root: path.resolve(__dirname, '../'),
  },

  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'production',
  },

  async headers() {
    return [
      {
        source: '/walls/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
};

const config = withNextIntl(nextConfig);

if (config.turbopack?.resolveAlias) {
  config.turbopack.resolveAlias['next-intl/config'] = './i18n/request.ts';
}

export default config;
