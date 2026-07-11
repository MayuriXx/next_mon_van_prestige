'use client';

/**
 * components/pages/VehicleSelectionPage.tsx
 *
 * Vehicle selection step of the airport-package funnel. Reached from the
 * "Voir les véhicules" button of TransferModal, which forwards the trip
 * parameters via query string:
 *   ?departure=…&arrival=…&date=…&hour=…&passengers=…&trip=one_way|round_trip
 *    &returnDate=…&returnHour=…
 *
 * Layout: a "Résumé" sidebar (trip recap) + the available vehicles. The fleet
 * has exactly TWO tiers — BUSINESS (max 3 passengers) and VAN (max 7). When
 * the requested passenger count exceeds a vehicle's capacity the card is
 * disabled and shows an "Indisponible (max N passagers)" badge instead of the
 * price, so the visitor can only pick a vehicle that fits the group.
 *
 * Prices are computed live from the road distance (OSRM route between the
 * geocoded departure/arrival, via the same Cloud Functions used by
 * ReservationPage), through calculatePrice(TRANSFER). Round trips double the
 * distance and apply the -20 % return discount already reflected in the modal.
 *
 * Selecting a vehicle opens a compact client-info form and creates a Stripe
 * Checkout session through the existing createCheckoutSession Cloud Function.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { calculatePrice } from '@/lib/utils/pricing';
import type { VehicleType } from '@/lib/types/pricing';
import type { CheckoutPayload } from '@/lib/types/reservation';
import styles from './VehicleSelectionPage.module.css';

const FUNCTIONS_BASE = 'https://europe-west1-mon-van-prestige.cloudfunctions.net';

interface GeoPoint { lat: number; lng: number; label: string; }

/** Free-text geocoding via the `geocode` Cloud Function. */
async function geocode(address: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, language: 'fr' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
    return { lat: data.lat, lng: data.lng, label: data.formattedAddress ?? address };
  } catch { return null; }
}

/** OSRM driving route → distance in km. */
async function getRouteDistanceKm(from: GeoPoint, to: GeoPoint): Promise<number | null> {
  try {
    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes.length) return null;
    return data.routes[0].distance / 1000;
  } catch { return null; }
}

/* ── Fleet definition — the business only operates two vehicle tiers ── */
const MAX_PASSENGERS = 7;
const FLEET: { type: VehicleType; maxPax: number; modelKey: string }[] = [
  { type: 'BUSINESS', maxPax: 3, modelKey: 'business' },
  { type: 'VAN',      maxPax: 7, modelKey: 'van' },
];

const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ICON_BAG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const ICON_WIFI = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.5 16.11a6 6 0 0 1 7 0"/><line x1="12" y1="20" x2="12" y2="20"/>
  </svg>
);
const ICON_CLIM = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/>
  </svg>
);

type Params = {
  departure: string; arrival: string; date: string; hour: string;
  passengers: number; roundTrip: boolean; returnDate: string; returnHour: string;
};

export default function VehicleSelectionPage() {
  const t = useTranslations('vehicleSelection');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const router = useRouter();

  const [params, setParams] = useState<Params | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);

  /* Client-info form (opens on SÉLECTIONNER) */
  const [selected, setSelected] = useState<VehicleType | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  /* Read params + compute route distance on mount. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const parsed: Params = {
      departure: p.get('departure') || 'Valenciennes',
      arrival: p.get('arrival') || '',
      date: p.get('date') || '',
      hour: p.get('hour') || '',
      passengers: Math.min(MAX_PASSENGERS, Math.max(1, parseInt(p.get('passengers') || '1', 10) || 1)),
      roundTrip: p.get('trip') === 'round_trip',
      returnDate: p.get('returnDate') || '',
      returnHour: p.get('returnHour') || '',
    };
    setParams(parsed);
    (async () => {
      setLoading(true); setGeoError(false);
      const [from, to] = await Promise.all([geocode(parsed.departure), geocode(parsed.arrival)]);
      if (!from || !to) { setGeoError(true); setLoading(false); return; }
      const km = await getRouteDistanceKm(from, to);
      if (km == null) { setGeoError(true); setLoading(false); return; }
      setDistanceKm(km);
      setLoading(false);
    })();
  }, []);

  /* Total billed distance (round trip doubles it). */
  const totalKm = useMemo(() => {
    if (distanceKm == null || !params) return null;
    return params.roundTrip ? distanceKm * 2 : distanceKm;
  }, [distanceKm, params]);

  function priceFor(type: VehicleType): number | null {
    if (totalKm == null) return null;
    const r = calculatePrice({ serviceType: 'TRANSFER', vehicleType: type, distanceKm: totalKm });
    return typeof r.price === 'number' ? r.price : r.price.min;
  }

  function fmtDate(d: string): string {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  async function handleSubmitBooking() {
    if (!params || !selected) return;
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      setBookingError(t('error_client_info')); return;
    }
    const price = priceFor(selected);
    if (price == null) { setBookingError(t('error_price')); return; }

    setBookingLoading(true); setBookingError('');
    try {
      const payload: CheckoutPayload = {
        totalPrice: price,
        departureDateTime: `${params.date}T${params.hour || '00:00'}:00`,
        departureAddress: params.departure,
        arrivalAddress: params.arrival,
        vehicleType: selected,
        serviceType: 'TRANSFER',
        tripType: params.roundTrip ? 'round_trip' : 'one_way',
        passengers: params.passengers,
        distanceKm: distanceKm ?? undefined,
        locale,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
      };
      const res = await fetch(`${FUNCTIONS_BASE}/createCheckoutSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) { setBookingError(t('error_stripe')); return; }
      const data = await res.json();
      const url = data?.result?.sessionUrl ?? data?.sessionUrl;
      if (url) { window.location.href = url; }
      else setBookingError(t('error_stripe'));
    } catch { setBookingError(t('error_generic')); }
    finally { setBookingLoading(false); }
  }

  const serviceLabel = params?.roundTrip ? t('service_roundtrip') : t('service_oneway');

  return (
    <section className={styles.wrapper}>
      <div className="container">
        <div className={styles.layout}>
          {/* ── Résumé sidebar ── */}
          <aside className={styles.summary}>
            <button type="button" className={styles.back} onClick={() => router.back()}>
              ← {t('back')}
            </button>
            <h2 className={styles.summaryTitle}>{t('summary_title')}</h2>
            <div className={styles.summarySeparator} />

            <SummaryRow label={t('service_type')} value={serviceLabel} />
            <SummaryRow label={t('departure_place')} value={params?.departure || '—'} />
            <SummaryRow label={t('destination_place')} value={params?.arrival || '—'} />
            {params?.roundTrip && (
              <SummaryRow label={t('return_destination')} value={params?.departure || '—'} />
            )}
            <SummaryRow
              label={t('total_distance')}
              value={totalKm != null ? `${Math.round(totalKm)} km` : (loading ? '…' : '—')}
            />
            <SummaryRow
              label={t('departure_datetime')}
              value={params ? `${fmtDate(params.date)}${params.hour ? `, ${params.hour}` : ''}` : '—'}
            />
            {params?.roundTrip && (
              <SummaryRow
                label={t('return_datetime')}
                value={`${fmtDate(params.returnDate)}${params.returnHour ? `, ${params.returnHour}` : ''} ${t('return_discount')}`}
              />
            )}
            <SummaryRow
              label={t('passengers')}
              value={params ? t('passengers_value', { count: params.passengers }) : '—'}
              last
            />
          </aside>

          {/* ── Vehicle cards ── */}
          <div className={styles.vehicles}>
            {geoError && <p className={styles.error}>{t('error_route')}</p>}

            {FLEET.map(({ type, maxPax, modelKey }) => {
              const disabled = (params?.passengers ?? 1) > maxPax;
              const price = priceFor(type);
              return (
                <div key={type} className={`${styles.card} ${disabled ? styles.cardDisabled : ''}`}>
                  <div className={styles.cardImage} aria-hidden />
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>
                      {modelKey === 'van' ? 'Mercedes Classe V' : 'Mercedes Classe E'} {t('or_equivalent')}
                    </h3>

                    {disabled ? (
                      <span className={styles.unavailable}>
                        {t('unavailable_max', { count: maxPax })}
                      </span>
                    ) : (
                      <p className={styles.cardPrice}>
                        {price != null ? `€${price}` : (loading ? '…' : '—')}
                      </p>
                    )}

                    <div className={styles.badges}>
                      <Badge icon={ICON_USER} label={`${maxPax} ${t('places')}`} />
                      <Badge icon={ICON_BAG} label={`${maxPax} ${t('bags')}`} />
                      <Badge icon={ICON_WIFI} label="Wifi" />
                      <Badge icon={ICON_CLIM} label="Clim" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.selectBtn}
                    disabled={disabled || loading || price == null}
                    onClick={() => { setSelected(type); setBookingError(''); }}
                  >
                    {t('select')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Client info modal ── */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)} role="presentation">
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label={t('close')}>×</button>
            <h3 className={styles.modalTitle}>{t('client_title')}</h3>
            <input className={styles.input} placeholder={t('client_name')} value={clientName} onChange={(e) => setClientName(e.target.value)} />
            <input className={styles.input} type="email" placeholder={t('client_email')} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            <input className={styles.input} type="tel" placeholder={t('client_phone')} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            {bookingError && <p className={styles.error}>{bookingError}</p>}
            <button type="button" className={styles.submit} disabled={bookingLoading} onClick={handleSubmitBooking}>
              {bookingLoading ? t('processing') : t('confirm')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={last ? styles.summaryRowLast : styles.summaryRow}>
      <p className={styles.summaryLabel}>{label}</p>
      <p className={styles.summaryValue}>{value}</p>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className={styles.badge}>
      <span className={styles.badgeIcon}>{icon}</span>
      <span className={styles.badgeLabel}>{label}</span>
    </span>
  );
}
