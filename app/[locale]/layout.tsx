import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FloatingButtons from '@/components/layout/FloatingButtons';
import SplashScreen from '@/components/layout/SplashScreen';
import OrganizationJsonLd from '@/components/seo/OrganizationJsonLd';
import './fonts.css';
import '../globals.css';

export const dynamic = 'force-static';

/**
 * Site-level metadata defaults.
 * metadataBase is required for Next.js to resolve relative OG image URLs.
 * Individual pages override title/description/openGraph via their own
 * generateMetadata() exports; these values act as fallbacks.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://mon-van-prestige.web.app'),
  title: {
    default: 'MS Prestige Driver — VTC de luxe à Valenciennes',
    template: '%s | MS Prestige Driver',
  },
  description:
    'Service de transport VTC premium à Valenciennes. Transferts aéroport, déplacements professionnels, événements spéciaux. Chauffeur privé haut de gamme.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'manifest', url: '/site.webmanifest' }],
  },
  openGraph: {
    siteName: 'MS Prestige Driver',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'MS Prestige Driver — VTC de luxe à Valenciennes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@MSPrestigeDriver',
    images: ['/og-default.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Required for static export with next-intl:
  // Tells next-intl to use the locale from params (not from headers/cookies),
  // making all downstream getTranslations/getMessages calls header-free.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        {/*
         * OrganizationJsonLd renders a <script type="application/ld+json"> tag.
         * Next.js App Router hoists script tags placed as direct children of the
         * layout into the document <head> automatically — no explicit <head>
         * element needed here.
         */}
        <OrganizationJsonLd />
        <NextIntlClientProvider messages={messages}>
          <SplashScreen />
          <Navbar />
          <main style={{ paddingTop: 'var(--nav-height)' }}>{children}</main>
          <Footer />
          <FloatingButtons />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
