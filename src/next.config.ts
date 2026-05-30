import type { NextConfig } from 'next';
import path from 'path';

const STYLES_DIR = path.resolve(__dirname, './app/_styles');

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
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

  turbopack: {
    root: path.resolve(__dirname, '../'),
  },

  sassOptions: {
    includePaths: [ STYLES_DIR ],
  },

  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'production',
  },

  productionBrowserSourceMaps: false,
};

export default nextConfig;
