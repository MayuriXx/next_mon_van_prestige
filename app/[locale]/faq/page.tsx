import type { Metadata } from 'next';
import FaqPage from '@/components/pages/FaqPage';

export const metadata: Metadata = {
  title: 'FAQ — Questions Fréquentes | MS Prestige Driver',
  description:
    "Retrouvez les réponses à toutes vos questions sur nos services VTC de luxe : réservation, paiement, véhicules, chauffeurs et bien plus encore.",
};

export const dynamic = 'force-static';

export default function Page() {
  return <FaqPage />;
}
