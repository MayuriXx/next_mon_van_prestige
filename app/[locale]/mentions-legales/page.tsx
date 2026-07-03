import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import MentionsLegalesPage from '@/components/pages/MentionsLegalesPage';

/**
 * app/[locale]/mentions-legales/page.tsx
 *
 * Route handler for the legal notice page.
 * Content is a French legal obligation and always displayed in French.
 * Metadata is locale-aware for correct canonical / alternate URLs.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const slugPath = '/mentions-legales';
  const canonicalPath = locale === 'fr' ? slugPath : `/${locale}${slugPath}`;

  return {
    title: 'Mentions Légales | MS Prestige Driver',
    description:
      'Mentions légales du site MS Prestige Driver — informations sur l\'éditeur, l\'hébergeur, le SIRET et les coordonnées de contact.',
    alternates: {
      canonical: canonicalPath,
      languages: {
        fr: slugPath,
        en: `/en${slugPath}`,
        nl: `/nl${slugPath}`,
      },
    },
  };
}

export default function Page() {
  return <MentionsLegalesPage />;
}
