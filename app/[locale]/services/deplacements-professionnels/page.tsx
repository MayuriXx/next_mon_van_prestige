import type { Metadata } from 'next';
import DeplProPage from '@/components/pages/DeplProPage';

export const metadata: Metadata = {
  title: 'Déplacements Professionnels — MS Prestige Driver',
  description:
    'Transport VTC premium pour professionnels et entreprises à Valenciennes. Chauffeur privé pour vos déplacements pro, Wi-Fi à bord, facturation entreprise.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <DeplProPage />;
}
