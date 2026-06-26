/**
 * app/admin/(dashboard)/reservations/page.tsx
 *
 * Reservations dashboard — stub page for M4 issue #24.
 * Displays a "coming soon" placeholder so the nav link resolves correctly
 * while #24 is not yet implemented.
 */
export default function AdminReservationsPage() {
  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#fff' }}>
        Réservations
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 40px' }}>
        Gestion des réservations — à implémenter (issue #24)
      </p>
    </div>
  );
}
