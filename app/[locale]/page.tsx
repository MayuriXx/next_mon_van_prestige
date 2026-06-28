import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import VehiculesTarifsWrapper from '@/components/sections/VehiculesTarifsWrapper';
import ServiceSection from '@/components/sections/ServiceSection';
import About from '@/components/sections/About';

const SECTIONS = [
  { id: 'transfert-aeroport', slug: 'transfert-aeroport' },
  { id: 'transfert-simple', slug: 'transfert-simple' },
  { id: 'mise-a-disposition', slug: 'mise-a-disposition' },
  { id: 'evenements-speciaux', slug: 'evenements-speciaux' },
  { id: 'escapades-loisirs', slug: 'escapades-loisirs' },
];

/**
 * Generates locale-aware metadata for the home page.
 * Canonical URL uses `as-needed` prefix strategy (fr = no prefix, en/nl = /en, /nl).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'seo' });

  const canonicalPath = locale === 'fr' ? '/' : `/${locale}`;
  const ogLocale = locale === 'fr' ? 'fr_FR' : locale === 'en' ? 'en_US' : 'nl_NL';

  return {
    title: t('home.title'),
    description: t('home.description'),
    alternates: {
      canonical: canonicalPath,
      languages: {
        fr: '/',
        en: '/en',
        nl: '/nl',
      },
    },
    openGraph: {
      title: t('home.ogTitle'),
      description: t('home.ogDescription'),
      url: canonicalPath,
      locale: ogLocale,
      images: [
        {
          url: '/og-home.jpg',
          width: 1200,
          height: 630,
          alt: t('home.ogImageAlt'),
        },
      ],
    },
    twitter: {
      title: t('home.ogTitle'),
      description: t('home.ogDescription'),
    },
  };
}

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <VehiculesTarifsWrapper />
      {SECTIONS.map((section) => (
        <ServiceSection
          key={section.id}
          sectionId={section.id}
          slug={section.slug}
        />
      ))}
      <About />
    </>
  );
}
