import { setRequestLocale } from 'next-intl/server';
import ReservationPage from '@/components/pages/ReservationPage';

export const dynamic = 'force-static';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReservationPage />;
}
