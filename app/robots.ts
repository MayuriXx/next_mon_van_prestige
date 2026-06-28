import type { MetadataRoute } from 'next';

const BASE_URL = 'https://mon-van-prestige.web.app';

/**
 * Robots configuration generated at build time (compatible with output: 'export').
 *
 * Rules:
 *  - All crawlers are allowed on public pages.
 *  - /admin/ and its locale variants (/en/admin/, /nl/admin/) are blocked.
 *  - The sitemap URL is advertised for automatic discovery by search engines.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/en/admin/',
          '/nl/admin/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
