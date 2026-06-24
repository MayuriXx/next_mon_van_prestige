import type { Metadata } from 'next';
import EvenementsSpeciauxPage from '@/components/pages/EvenementsSpeciauxPage';

export const metadata: Metadata = {
  title: 'Événements Spéciaux — MS Prestige Driver',
  description:
    'Chauffeur privé pour vos événements spéciaux à Valenciennes. Mariage, soirée, anniversaire, cérémonie. Élégance et flexibilité totale.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <EvenementsSpeciauxPage />;
}
