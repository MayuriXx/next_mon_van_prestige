import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
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
          <main style={{ paddingTop: '72px' }}>{children}</main>
          <Footer />
          <FloatingButtons />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
