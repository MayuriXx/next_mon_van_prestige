import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ReservationPage from '@/components/pages/ReservationPage';

export const dynamic = 'force-static';

/**
 * Generates locale-aware metadata for the reservation page.
 * The reservation page is intentionally excluded from indexing (noindex)
 * to avoid duplicate content and keep paid funnel pages out of SERP.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.reservation' });

  const slugPath = '/reservation';
  const canonicalPath = locale === 'fr' ? slugPath : `/${locale}${slugPath}`;
  const ogLocale = locale === 'fr' ? 'fr_FR' : locale === 'en' ? 'en_US' : 'nl_NL';

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: false,
      follow: true,
    },
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

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReservationPage />;
}
