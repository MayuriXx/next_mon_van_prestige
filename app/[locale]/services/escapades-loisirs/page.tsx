import type { Metadata } from 'next';
import EscapadesLoisirsPage from '@/components/pages/EscapadesLoisirsPage';

export const metadata: Metadata = {
  title: 'Escapades Loisirs — MS Prestige Driver',
  description:
    'Transport VTC premium pour parcs d\'attractions et événements sportifs. Disneyland, Parc Astérix, Walibi, Stade de Lens, Pierre Mauroy. Tarifs fixes depuis Valenciennes.',
};

export const dynamic = 'force-static';

export default function Page() {
  return <EscapadesLoisirsPage />;
}
