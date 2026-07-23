import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import Icons from 'unplugin-icons/webpack';

const STYLES_DIR = path.resolve(__dirname, './app/_styles');
const withNextIntl = createNextIntlPlugin();
const NEXT_BUILD_CPUS = Number(process.env.NEXT_BUILD_CPUS ?? 2);

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: false,
    cpus: Number.isFinite(NEXT_BUILD_CPUS) ? NEXT_BUILD_CPUS : 2,
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

  reactStrictMode: true,
  reactCompiler: true,
  productionBrowserSourceMaps: false,

  webpack(config) {
    config.cache = false;
    config.plugins.push(
      Icons({
        compiler: 'jsx',
        jsx: 'react',
      }),
    );

    return config;
  },
};

export default withNextIntl(nextConfig);
