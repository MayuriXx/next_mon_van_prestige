import type { Metadata } from 'next';
import MiseADispositionPage from '@/components/pages/MiseADispositionPage';

export const metadata: Metadata = {
  title: 'Mise à Disposition — MS Prestige Driver',
  description:
    'Chauffeur privé à votre disposition à Valenciennes. Flexibilité totale pour vos rendez-vous, shopping, événements. Tarif horaire, durée sur mesure.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <MiseADispositionPage />;
}
