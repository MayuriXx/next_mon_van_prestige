import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import CgvPage from '@/components/pages/CgvPage';

/**
 * app/[locale]/cgv/page.tsx
 *
 * Route handler for the general terms and conditions page.
 * Content is a French legal/commercial obligation and always displayed in French.
 * Metadata is locale-aware for correct canonical / alternate URLs.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const slugPath = '/cgv';
  const canonicalPath = locale === 'fr' ? slugPath : `/${locale}${slugPath}`;

  return {
    title: 'Conditions Générales de Vente | MS Prestige Driver',
    description:
      'Conditions générales de vente de MS Prestige Driver — réservation, tarifs, acompte, annulation et responsabilité pour notre service VTC à Valenciennes.',
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
  return <CgvPage />;
}
