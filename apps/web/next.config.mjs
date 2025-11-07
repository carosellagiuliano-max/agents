import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@schnittwerk/ui', '@schnittwerk/lib'],
};

export default withSentryConfig(nextConfig, { silent: true }, { hideSourceMaps: true });
