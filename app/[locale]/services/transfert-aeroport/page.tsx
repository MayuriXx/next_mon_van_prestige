import type { Metadata } from 'next';
import TransfertAeropurtPage from '@/components/pages/TransfertAeropurtPage';

export const metadata: Metadata = {
  title: 'Transfert Aéroport — MS Prestige Driver',
  description:
    'Service de transfert aéroport premium à Valenciennes. Forfaits pour CDG, Orly, Zaventem, Charleroi, Lesquin. Sécurité, ponctualité, meilleur tarif.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <TransfertAeropurtPage />;
}
