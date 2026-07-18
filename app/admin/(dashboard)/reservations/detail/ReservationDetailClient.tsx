'use client';

/**
 * app/admin/(dashboard)/reservations/[id]/page.tsx
 *
 * Admin — Reservation Detail Page (Issue #24)
 *
 * Business purpose:
 *  Full read-only view of a single reservation with the ability to update
 *  its status. Mohammed clicks a row in the list to land here.
 *
 * Features:
 *  - Full reservation data display (client, trip, payment, notes)
 *  - Status management with coloured badge and dropdown
 *  - Stripe session link (opens Stripe Dashboard)
 *  - Back navigation to the list
 *
 * Architecture:
 *  - Client component; fetches the single document via getDoc on mount
 *  - Auth guard inherited from (dashboard)/layout.tsx
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ReservationDoc, ReservationStatus } from '@/lib/types/reservation';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed      : 'Confirmée',
  completed      : 'Terminée',
  cancelled      : 'Annulée',
};

const STATUS_COLORS: Record<ReservationStatus, { bg: string; color: string }> = {
  pending_payment: { bg: 'rgba(234,179,8,0.15)',   color: '#EAB308' },
  confirmed      : { bg: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
  completed      : { bg: 'rgba(99,102,241,0.15)',  color: '#818CF8' },
  cancelled      : { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444' },
};

const SERVICE_LABELS: Record<string, string> = {
  airport_transfer   : 'Transfert aéroport',
  simple_transfer    : 'Transfert simple',
  mise_a_disposition : 'Mise à disposition',
  special_event      : 'Événement spécial',
  leisure            : 'Escapade loisirs',
  professional       : 'Déplacement professionnel',
};

const VEHICLE_LABELS: Record<string, string> = {
  business: 'Business', van: 'Van', eco: 'Éco',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value: unknown): string {
  if (!value) return '—';
  let d: Date;
  if (typeof value === 'object' && 'seconds' in (value as object)) {
    d = new Date((value as { seconds: number }).seconds * 1000);
  } else {
    d = new Date(value as string | number);
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatEur(amount: number | undefined | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ── Component ─────────────────────────────────────────────────────────────────


export default function ReservationDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router  = useRouter();

  const [reservation, setReservation] = useState<ReservationDoc | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'reservations', id))
      .then((snap) => {
        if (!snap.exists()) { setError('Réservation introuvable.'); return; }
        setReservation(snap.data() as ReservationDoc);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Status update ────────────────────────────────────────────────────────

  async function handleStatusChange(status: ReservationStatus) {
    if (!id || !reservation) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
      setReservation((prev) => prev ? { ...prev, status } : prev);
    } catch (e) {
      alert('Erreur lors de la mise à jour : ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div style={s.page}>
        <button onClick={() => router.back()} style={s.backBtn}>← Retour</button>
        <div style={s.errorBox}>{error ?? 'Réservation introuvable.'}</div>
      </div>
    );
  }

  const sc = STATUS_COLORS[reservation.status] ?? { bg: 'rgba(255,255,255,0.1)', color: '#fff' };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={s.topBar}>
        <button onClick={() => router.back()} style={s.backBtn}>← Retour</button>
        <div style={s.topRight}>
          {/* Status badge */}
          <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
            {STATUS_LABELS[reservation.status]}
          </span>
          {/* Status selector */}
          <select
            value={reservation.status}
            onChange={(e) => handleStatusChange(e.target.value as ReservationStatus)}
            disabled={saving}
            style={s.statusSelect}
          >
            {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>
          {saving && <span style={{ color: 'var(--color-gold)', fontSize: '13px' }}>Enregistrement…</span>}
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={s.title}>Réservation #{id?.slice(-8).toUpperCase()}</h1>
        <p style={s.sub}>Créée le {formatDate(reservation.createdAt)}</p>
      </div>

      {/* ── Grid layout ──────────────────────────────────────────────────── */}
      <div style={s.grid}>

        {/* Client */}
        <Section title="👤 Client">
          <Row label="Nom"       value={reservation.client?.name}  />
          <Row label="Email"     value={reservation.client?.email} link={`mailto:${reservation.client?.email}`} />
          <Row label="Téléphone" value={reservation.client?.phone} link={`tel:${reservation.client?.phone}`}  />
          {!!reservation.client?.notes && (
            <Row label="Notes" value={reservation.client.notes} />
          )}
        </Section>

        {/* Trip */}
        <Section title="🗺️ Trajet">
          <Row label="Service"   value={SERVICE_LABELS[reservation.serviceType] ?? reservation.serviceType} />
          <Row label="Véhicule"  value={VEHICLE_LABELS[reservation.vehicleType] ?? reservation.vehicleType} />
          <Row label="Départ"    value={reservation.departureAddress} />
          {!!reservation.arrivalAddress && (
            <Row label="Arrivée" value={reservation.arrivalAddress} />
          )}
          <Row label="Date/heure départ" value={reservation.departureDateTime
            ? new Date(reservation.departureDateTime).toLocaleDateString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : '—'} />
          <Row label="Passagers" value={reservation.passengers} />
          {reservation.distanceKm != null && (
            <Row label="Distance" value={`${reservation.distanceKm} km`} />
          )}
          {reservation.durationHours != null && (
            <Row label="Durée MAD" value={`${reservation.durationHours} h`} />
          )}
          {!!reservation.tripType && (
            <Row label="Aller/retour" value={reservation.tripType === 'round_trip' ? 'Aller-retour' : 'Aller simple'} />
          )}
        </Section>

        {/* Payment */}
        <Section title="💳 Paiement">
          <Row label="Prix total"  value={formatEur(reservation.totalPrice)} highlight />
          <Row label="Acompte"     value={`${formatEur(reservation.depositAmount)} (${Math.round((reservation.depositRatio ?? 0) * 100)} %)`} />
          {reservation.amountPaid != null && (
            <Row label="Montant encaissé" value={formatEur(reservation.amountPaid)} />
          )}
          {!!reservation.paidAt && (
            <Row label="Payé le" value={formatDate(reservation.paidAt)} />
          )}
          {!!reservation.stripeSessionId && (
            <Row
              label="Session Stripe"
              value={reservation.stripeSessionId.slice(0, 20) + '…'}
              link={`https://dashboard.stripe.com/payments/${reservation.stripeSessionId}`}
            />
          )}
          {!!reservation.stripePaymentId && (
            <Row label="Payment ID" value={reservation.stripePaymentId} />
          )}
          <Row label="Locale"  value={reservation.locale?.toUpperCase() ?? '—'} />
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sec.wrap}>
      <div style={sec.header}>{title}</div>
      <div style={sec.body}>{children}</div>
    </div>
  );
}

function Row({ label, value, link, highlight }: {
  label: string; value: unknown; link?: string; highlight?: boolean;
}) {
  const text = value == null || value === '' ? '—' : String(value);
  return (
    <div style={row.wrap}>
      <span style={row.label}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" style={row.link}>
          {text}
        </a>
      ) : (
        <span style={{ ...row.value, ...(highlight ? { color: 'var(--color-gold)', fontWeight: 700 } : {}) }}>
          {text}
        </span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page   : { display: 'flex', flexDirection: 'column', gap: '24px' },
  topBar : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  topRight: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  backBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: 'rgba(255,255,255,0.6)', padding: '8px 14px',
    fontSize: '13px', cursor: 'pointer',
  },
  badge: {
    display: 'inline-block', padding: '5px 14px',
    borderRadius: '20px', fontSize: '13px', fontWeight: 600,
  },
  statusSelect: {
    padding: '7px 12px', background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
    color: '#fff', fontSize: '13px', cursor: 'pointer',
  },
  title  : { margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' },
  sub    : { margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.35)' },
  grid   : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '16px' },
  centered: { display: 'flex', justifyContent: 'center', padding: '80px' },
  spinner: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid rgba(var(--color-gold-rgb), 0.2)', borderTopColor: 'var(--color-gold)',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    padding: '20px', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    color: '#EF4444', fontSize: '14px',
  },
};

const sec: Record<string, React.CSSProperties> = {
  wrap  : { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' },
  header: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '14px', fontWeight: 600, color: '#fff' },
  body  : { padding: '4px 0' },
};

const row: Record<string, React.CSSProperties> = {
  wrap : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  label: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: '120px' },
  value: { fontSize: '13px', color: '#fff', textAlign: 'right' as const, wordBreak: 'break-all' as const },
  link : { fontSize: '13px', color: 'var(--color-gold)', textAlign: 'right' as const, textDecoration: 'none', wordBreak: 'break-all' as const },
};
