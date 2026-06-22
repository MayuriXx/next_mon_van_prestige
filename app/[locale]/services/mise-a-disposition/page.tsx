import type { Metadata } from 'next';
import MiseADispositionPage from '@/components/pages/MiseADispositionPage';

export const metadata: Metadata = {
  title: 'Mise à Disposition — MS Prestige Driver',
  description:
    'Service de chauffeur privé à la disposition à Valenciennes. Business 55 €/h, Van 90 €/h. Flexibilité totale, chauffeur dédié, attente incluse.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <MiseADispositionPage />;
}
