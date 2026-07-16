import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import VehicleSelectionPage from '@/components/pages/VehicleSelectionPage';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Sélection du véhicule | MS Prestige Driver',
  robots: { index: false, follow: true },
};

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VehicleSelectionPage />;
}
