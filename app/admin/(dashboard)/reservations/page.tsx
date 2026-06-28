/**
 * app/admin/(dashboard)/reservations/page.tsx
 *
 * Admin — Reservations Dashboard (Issue #24)
 *
 * Business purpose:
 *  Mohammed uses this page to monitor and manage all incoming bookings.
 *  It gives him a real-time overview of the day's and month's activity,
 *  with the ability to filter, search, change status, and export to CSV.
 *
 * Features:
 *  - KPI counters: today's bookings, this month's bookings, monthly revenue
 *  - Filters: status, service type, date range, free-text search (name/email)
 *  - Sortable table: date, client, route, vehicle, price, status
 *  - Status badge with colour coding
 *  - Quick status update via inline dropdown
 *  - Row click → detail page (/admin/reservations/[id])
 *  - CSV export of the current filtered view
 *
 * Architecture:
 *  - Pure client component using useReservations() real-time Firestore hook
 *  - No API routes (static export constraint)
 *  - Auth guard inherited from (dashboard)/layout.tsx
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReservations, ReservationFilters } from '@/lib/hooks/useReservations';
import type { ReservationStatus } from '@/lib/types/reservation';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending_payment: 'En attente',
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
  professional       : 'Déplacement pro',
};

const VEHICLE_LABELS: Record<string, string> = {
  business: 'Business',
  van      : 'Van',
  eco      : 'Éco',
};

const DEFAULT_FILTERS: ReservationFilters = {
  status     : 'all',
  serviceType: '',
  dateFrom   : '',
  dateTo     : '',
  search     : '',
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function exportCSV(rows: ReturnType<typeof useReservations>['filtered']) {
  const headers = [
    'Date','Client','Email','Téléphone','Service','Trajet départ','Trajet arrivée',
    'Véhicule','Passagers','Prix total','Acompte','Statut',
  ];
  const lines = rows.map((r) => [
    formatDate(r.createdAt),
    r.client?.name ?? '',
    r.client?.email ?? '',
    r.client?.phone ?? '',
    SERVICE_LABELS[r.serviceType] ?? r.serviceType,
    r.departureAddress ?? '',
    r.arrivalAddress   ?? '',
    VEHICLE_LABELS[r.vehicleType] ?? r.vehicleType,
    r.passengers ?? '',
    r.totalPrice ?? 0,
    r.depositAmount ?? 0,
    STATUS_LABELS[r.status] ?? r.status,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reservations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReservationsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ReservationFilters>(DEFAULT_FILTERS);

  const { filtered, kpis, loading, error, updateStatus } = useReservations(filters);

  function setFilter<K extends keyof ReservationFilters>(key: K, value: ReservationFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>, id: string) {
    e.stopPropagation();
    await updateStatus(id, e.target.value as ReservationStatus);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Réservations</h1>
          <p style={s.subtitle}>Gestion et suivi des réservations clients</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          style={s.exportBtn}
          disabled={filtered.length === 0}
        >
          ↓ Exporter CSV ({filtered.length})
        </button>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={s.kpiGrid}>
        <KpiCard label="Aujourd'hui" value={kpis.todayCount} unit="résa" icon="📅" />
        <KpiCard label="Ce mois"     value={kpis.monthCount} unit="résa" icon="📆" />
        <KpiCard label="CA du mois"  value={formatEur(kpis.monthRevenue)} icon="💶" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div style={s.filtersBar}>
        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher client, email…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          style={s.input}
        />

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value as ReservationFilters['status'])}
          style={s.select}
        >
          <option value="all">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {/* Service type */}
        <select
          value={filters.serviceType}
          onChange={(e) => setFilter('serviceType', e.target.value)}
          style={s.select}
        >
          <option value="">Tous les services</option>
          {Object.entries(SERVICE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          style={s.input}
          title="Date de début"
        />

        {/* Date to */}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          style={s.input}
          title="Date de fin"
        />

        {/* Reset */}
        <button onClick={resetFilters} style={s.resetBtn}>
          Réinitialiser
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={s.centered}>
          <div style={s.spinner} />
        </div>
      ) : error ? (
        <div style={s.errorBox}>Erreur : {error}</div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: '40px' }}>📭</span>
          <p>Aucune réservation trouvée</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Date', 'Client', 'Trajet', 'Véhicule', 'Prix', 'Acompte', 'Statut', ''].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  style={s.tr}
                  onClick={() => router.push(`/admin/reservations/detail?id=${r.id}`)}
                >
                  <td style={s.td}>{formatDate(r.createdAt)}</td>

                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                      {r.client?.name ?? '—'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                      {r.client?.email ?? ''}
                    </div>
                  </td>

                  <td style={s.td}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', maxWidth: '200px' }}>
                      <span style={{ color: '#C9A84C' }}>↑</span> {r.departureAddress ?? '—'}
                    </div>
                    {r.arrivalAddress && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ color: '#C9A84C' }}>↓</span> {r.arrivalAddress}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>
                      {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                    </div>
                  </td>

                  <td style={s.td}>
                    <span style={s.vehicleBadge}>
                      {VEHICLE_LABELS[r.vehicleType] ?? r.vehicleType}
                    </span>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      {r.passengers} pass.
                    </div>
                  </td>

                  <td style={{ ...s.td, fontWeight: 700, color: '#C9A84C' }}>
                    {formatEur(r.totalPrice ?? 0)}
                  </td>

                  <td style={{ ...s.td, color: 'rgba(255,255,255,0.6)' }}>
                    {formatEur(r.depositAmount ?? 0)}
                  </td>

                  <td style={s.td}>
                    <StatusBadge status={r.status} />
                  </td>

                  {/* Quick status change — stops row click propagation */}
                  <td style={s.td} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(e, r.id)}
                      style={s.statusSelect}
                      title="Changer le statut"
                    >
                      {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((st) => (
                        <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, icon }: {
  label: string; value: string | number; unit?: string; icon: string;
}) {
  return (
    <div style={kpi.card}>
      <div style={kpi.icon}>{icon}</div>
      <div>
        <div style={kpi.value}>
          {value}{unit && <span style={kpi.unit}> {unit}</span>}
        </div>
        <div style={kpi.label}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const c = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.1)', color: '#fff' };
  return (
    <span style={{
      display      : 'inline-block',
      padding      : '3px 10px',
      borderRadius : '20px',
      fontSize     : '12px',
      fontWeight   : 600,
      background   : c.bg,
      color        : c.color,
      whiteSpace   : 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: '16px',
  },
  title   : { margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' },
  subtitle: { margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' },
  exportBtn: {
    padding: '10px 18px', background: 'rgba(201,168,76,0.12)',
    border: '1px solid rgba(201,168,76,0.35)', borderRadius: '8px',
    color: '#C9A84C', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px',
  },
  filtersBar: {
    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
    background: '#111', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', padding: '16px',
  },
  input: {
    flex: '1 1 160px', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff', fontSize: '13px',
    outline: 'none',
  },
  select: {
    flex: '1 1 160px', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff', fontSize: '13px',
    outline: 'none', cursor: 'pointer',
  },
  resetBtn: {
    padding: '9px 14px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer',
  },
  tableWrap: {
    background: '#111', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', overflow: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '11px',
    fontWeight: 600, color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: '.07em',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    whiteSpace: 'nowrap',
  },
  tr: {
    cursor: 'pointer', transition: 'background .12s',
  },
  td: {
    padding: '14px 16px', fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'top',
  },
  vehicleBadge: {
    display: 'inline-block', padding: '2px 10px',
    background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
    borderRadius: '20px', fontSize: '11px', color: '#C9A84C', fontWeight: 600,
  },
  statusSelect: {
    padding: '5px 8px', background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
    color: '#fff', fontSize: '12px', cursor: 'pointer',
  },
  centered: {
    display: 'flex', justifyContent: 'center', padding: '60px',
  },
  spinner: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    padding: '20px', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    color: '#EF4444', fontSize: '14px',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '12px', padding: '60px', color: 'rgba(255,255,255,0.35)', fontSize: '14px',
  },
};

const kpi: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex', alignItems: 'center', gap: '16px',
    background: '#111', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', padding: '20px',
  },
  icon : { fontSize: '28px' },
  value: { fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1.1 },
  unit : { fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' },
  label: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' },
};
