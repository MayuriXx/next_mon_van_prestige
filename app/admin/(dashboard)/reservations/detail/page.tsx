/**
 * app/admin/(dashboard)/reservations/detail/page.tsx
 *
 * Static page for reservation detail view.
 * The reservation ID is passed via ?id=xxx query parameter,
 * read client-side with useSearchParams.
 *
 * Using a static route (instead of dynamic [id]) is required for
 * Next.js output: 'export' — dynamic segments need generateStaticParams
 * which is incompatible with runtime Firestore IDs.
 */
import ReservationDetailClient from './ReservationDetailClient';

export default function Page() {
  return <ReservationDetailClient />;
}
