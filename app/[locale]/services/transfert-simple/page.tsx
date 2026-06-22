import type { Metadata } from 'next';
import TransfertSimplePage from '@/components/pages/TransfertSimplePage';

export const metadata: Metadata = {
  title: 'Transfert Simple — MS Prestige Driver',
  description:
    'Service de transfert VTC simple à Valenciennes et dans la région. Calculez votre trajet, estimez le prix et réservez votre chauffeur privé.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <TransfertSimplePage />;
}
