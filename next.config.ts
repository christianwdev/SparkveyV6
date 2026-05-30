import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const STYLES_DIR = path.resolve(__dirname, './src/app/_styles');
const withNextIntl = createNextIntlPlugin();
const NEXT_BUILD_CPUS = Number(process.env.NEXT_BUILD_CPUS ?? 2);

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: false,
    cpus: Number.isFinite(NEXT_BUILD_CPUS) ? NEXT_BUILD_CPUS : 2,
  },

  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  sassOptions: {
    includePaths: [ STYLES_DIR ],
  },

  turbopack: {
    root: __dirname,
  },

  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'production',
  },

  reactStrictMode: true,
  productionBrowserSourceMaps: false,
};

export default withNextIntl(nextConfig);
