import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import FaqPage from '@/components/pages/FaqPage';

/**
 * Generates locale-aware metadata for the FaqPage page.
 * OG image: /og-default.jpg (1200x630, should exist in /public).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.faq' });

  const slugPath = '/faq';
  const canonicalPath = locale === 'fr' ? slugPath : `/${locale}${slugPath}`;
  const ogLocale = locale === 'fr' ? 'fr_FR' : locale === 'en' ? 'en_US' : 'nl_NL';

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: canonicalPath,
      languages: {
        fr: slugPath,
        en: `/en${slugPath}`,
        nl: `/nl${slugPath}`,
      },
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: canonicalPath,
      locale: ogLocale,
      images: [
        {
          url: '/og-default.jpg',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    twitter: {
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
  };
}

export default function Page() {
  return <FaqPage />;
}
