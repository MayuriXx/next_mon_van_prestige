/**
 * app/admin/(dashboard)/reservations/[id]/page.tsx
 *
 * Server component wrapper required by output: 'export'.
 * generateStaticParams must live in a server component; the actual
 * page logic is in ReservationDetailClient.tsx (client component).
 */
import ReservationDetailClient from './ReservationDetailClient';

// Required for output: 'export' with a dynamic [id] segment.
// Reservation IDs are runtime Firestore document IDs — we return an
// empty array and let the client component fetch data after hydration.
export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <ReservationDetailClient />;
}
