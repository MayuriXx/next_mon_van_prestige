import { setRequestLocale } from 'next-intl/server';
import ReservationSuccessPage from '@/components/pages/ReservationSuccessPage';

export const dynamic = 'force-static';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReservationSuccessPage />;
}
