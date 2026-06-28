import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Bundle analyzer — only active when ANALYZE=true (run: ANALYZE=true npm run build)
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@next/bundle-analyzer')({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  /**
   * Static export — required for Firebase Hosting.
   * Because output:'export' disables the Next.js Image Optimization API,
   * we set `unoptimized: true` and rely on:
   *   1. Pre-converted WebP assets in /public/images/
   *   2. Correct `sizes` attributes on every <Image> for CLS prevention
   *   3. `priority` on above-the-fold images for LCP
   *   4. Self-hosted fonts via @fontsource (no FOUT)
   */
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
