import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL = 'https://mon-van-prestige.web.app';

/**
 * Static sitemap generated at build time (compatible with output: 'export').
 *
 * Covers all public pages across the 3 supported locales:
 *   - fr  → no prefix  (e.g. /services/transfert-aeroport/)
 *   - en  → /en/       (e.g. /en/services/transfert-aeroport/)
 *   - nl  → /nl/       (e.g. /nl/services/transfert-aeroport/)
 *
 * The reservation page is excluded because it is noindex (booking funnel).
 * Admin routes are excluded entirely.
 *
 * Change-frequency and priority values follow standard SEO conventions:
 *   - Homepage      → weekly  / 1.0
 *   - Service pages → monthly / 0.8
 *   - FAQ           → monthly / 0.6
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['fr', 'en', 'nl'] as const;

  /** Resolve the locale-prefixed path.
   *  French (default) has no prefix thanks to localePrefix: 'as-needed'. */
  function localePath(locale: typeof locales[number], path: string): string {
    const prefix = locale === 'fr' ? '' : `/${locale}`;
    return `${BASE_URL}${prefix}${path}`;
  }

  const servicePages = [
    '/services/transfert-aeroport/',
    '/services/transfert-simple/',
    '/services/mise-a-disposition/',
    '/services/evenements-speciaux/',
    '/services/escapades-loisirs/',
    '/services/deplacements-professionnels/',
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    // Homepage
    entries.push({
      url: localePath(locale, '/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    });

    // Service pages
    for (const page of servicePages) {
      entries.push({
        url: localePath(locale, page),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }

    // FAQ
    entries.push({
      url: localePath(locale, '/faq/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });

    // NOTE: /reservation/ is intentionally excluded (robots: noindex).
    // NOTE: /admin/* routes are intentionally excluded.
  }

  return entries;
}
