'use client';

/**
 * components/reservation/ReservationForm.tsx
 *
 * Single, uniform reservation form card shared by every booking surface of the
 * site (Transfert simple, Mise à Disposition, Transport au Féminin,
 * Déplacements professionnels, Événements spéciaux…). Its visual language and
 * behaviour mirror the reference form on `/reservation` (ReservationPage) so the
 * whole site is consistent.
 *
 * Key behaviours:
 *  - A "Transfert simple / Mise à Disposition" selector is shown by default.
 *    Pass `lockedService` to hide the selector and pin the form to one service
 *    (used on the dedicated /services/transfert-simple and
 *    /services/mise-a-disposition pages, where the service is already implied).
 *  - `women` applies the Transport au Féminin surcharge to the inline estimate
 *    and forwards `women=1` to the funnel.
 *  - On "Réserver", the form forwards the trip to the shared vehicle-selection →
 *    payment funnel (`/reservation/vehicules`), which owns the recap pop-up and
 *    the Stripe checkout. This form never completes payment inline; that keeps
 *    every page's existing pop-up flow intact.
 *
 * Pages that render a live map / price recap outside the card can subscribe to
 * `onGeoChange` (resolved points + route polyline) and `onEstimate` (computed
 * Business/Van prices) to keep those sections working.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useTariffs } from '@/lib/hooks/useTariffs';
import { useWomenSurcharge } from '@/lib/hooks/useWomenSurcharge';
import { calculatePrice, formatPrice } from '@/lib/utils/pricing';
import type { VehicleType } from '@/lib/types/pricing';
import {
  type GeoPoint,
  type Suggestion,
  newSessionToken,
  fetchSuggestions,
  fetchPlaceDetails,
  geocode,
  getRoute,
} from '@/lib/reservation/places';
import styles from './ReservationForm.module.css';

type ServiceTab = 'simple' | 'mad';

/** Estimate surfaced to the host page (both vehicle tiers, formatted). */
export interface ReservationEstimate {
  distanceKm: number;
  durationMin: number;
  businessPrice: string;
  vanPrice: string;
}

export interface ReservationGeo {
  from: GeoPoint | null;
  to: GeoPoint | null;
  routeCoords: [number, number][];
}

interface ReservationFormProps {
  /** Pin the form to one service and hide the selector. */
  lockedService?: ServiceTab;
  /** Default selected service when the selector is shown. */
  initialService?: ServiceTab;
  /** Apply the Transport au Féminin surcharge + forward women=1. */
  women?: boolean;
  /** Optional heading above the form. Defaults to the reservation form title. */
  title?: string;
  /** Live map feed for host pages that render a route map. */
  onGeoChange?: (geo: ReservationGeo) => void;
  /** Computed estimate feed for host pages that render a price recap. */
  onEstimate?: (estimate: ReservationEstimate | null) => void;
}

/** MAD is billed for a minimum of 2 hours (CGV). */
const MAD_DURATIONS = [2, 3, 4, 5, 6, 7, 8, 10, 12];

/* ── Autocomplete field (shared helpers, local UI) ── */
interface AutocompleteFieldProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (point: GeoPoint) => void;
}

function AutocompleteField({ placeholder, value, onChange, onSelect }: AutocompleteFieldProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(newSessionToken());

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(val, sessionTokenRef.current);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 350);
  }

  async function handleSelect(s: Suggestion) {
    onChange(s.description);
    setSuggestions([]);
    setOpen(false);
    const point = await fetchPlaceDetails(s.placeId, sessionTokenRef.current);
    // Session ends once details are fetched — start a fresh token next time.
    sessionTokenRef.current = newSessionToken();
    if (point) onSelect({ ...point, label: point.label || s.description });
  }

  return (
    <div className={styles.autocompleteWrap} ref={wrapRef}>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <li
              key={s.placeId || i}
              className={styles.suggestionItem}
              onMouseDown={() => handleSelect(s)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.suggestionIcon}>
                <circle cx="12" cy="11" r="3" />
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
              </svg>
              <span>{s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Shared reservation form ── */
export default function ReservationForm({
  lockedService,
  initialService = 'simple',
  women = false,
  title,
  onGeoChange,
  onEstimate,
}: ReservationFormProps) {
  const t = useTranslations('reservation');
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { tariffs } = useTariffs();
  const surchargePercent = useWomenSurcharge();

  const [service, setService] = useState<ServiceTab>(lockedService ?? initialService);
  const activeService: ServiceTab = lockedService ?? service;

  // Shared fields
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [tripType, setTripType] = useState('one_way');
  const [duration, setDuration] = useState(String(MAD_DURATIONS[0]));
  const [passengers, setPassengers] = useState('1');
  const [vehicleType, setVehicleType] = useState<VehicleType>('BUSINESS');

  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint] = useState<GeoPoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<(ReservationEstimate & { rawPrice: number }) | null>(null);

  const businessAllowed = parseInt(passengers, 10) <= 3;

  const surcharge = useCallback(
    (n: number) => (women ? Math.ceil(n * (1 + surchargePercent / 100)) : n),
    [women, surchargePercent],
  );

  // Host-page callbacks are kept in refs so effects don't loop when the parent
  // passes fresh inline functions on every render.
  const onGeoRef = useRef(onGeoChange);
  const onEstRef = useRef(onEstimate);
  // Refresh the refs after each render (never during render).
  useEffect(() => {
    onGeoRef.current = onGeoChange;
    onEstRef.current = onEstimate;
  });

  // Feed the host page's route map whenever the resolved points / polyline move.
  useEffect(() => {
    onGeoRef.current?.({ from: fromPoint, to: toPoint, routeCoords });
  }, [fromPoint, toPoint, routeCoords]);

  // Feed the host page's price recap whenever the estimate changes.
  useEffect(() => {
    onEstRef.current?.(
      result
        ? { distanceKm: result.distanceKm, durationMin: result.durationMin, businessPrice: result.businessPrice, vanPrice: result.vanPrice }
        : null,
    );
  }, [result]);

  /** Reset the current estimate (e.g. when an input changes). */
  function clearEstimate() { setResult(null); }

  function handleDepartureChange(val: string) { setDeparture(val); setFromPoint(null); clearEstimate(); }
  function handleArrivalChange(val: string) { setArrival(val); setToPoint(null); clearEstimate(); }

  function handleServiceChange(next: ServiceTab) {
    if (lockedService) return;
    setService(next);
    clearEstimate();
    setError('');
  }

  function handleVehicleChange(v: VehicleType) {
    if (v === 'BUSINESS' && !businessAllowed) return;
    setVehicleType(v);
    clearEstimate();
  }

  function handlePassengersChange(val: string) {
    setPassengers(val);
    if (parseInt(val, 10) > 3 && vehicleType === 'BUSINESS') setVehicleType('VAN');
    clearEstimate();
  }

  /* ── Calculate — transfer ── */
  const handleCalculateTransfer = useCallback(async () => {
    if (!departure.trim() || !arrival.trim()) { setError(t('error_addresses')); return; }
    setLoading(true); setError(''); setResult(null); setRouteCoords([]);
    try {
      const [from, to] = await Promise.all([
        fromPoint ? Promise.resolve(fromPoint) : geocode(departure),
        toPoint ? Promise.resolve(toPoint) : geocode(arrival),
      ]);
      if (!from || !to) { setError(t('error_geocode')); setLoading(false); return; }
      setFromPoint(from); setToPoint(to);
      const route = await getRoute(from, to);
      if (!route) { setError(t('error_route')); setLoading(false); return; }

      const multiplier = tripType === 'round_trip' ? 2 : 1;
      const km = route.distanceKm * multiplier;

      const businessResult = calculatePrice({ serviceType: 'TRANSFER', vehicleType: 'BUSINESS', distanceKm: km }, tariffs);
      const vanResult = calculatePrice({ serviceType: 'TRANSFER', vehicleType: 'VAN', distanceKm: km }, tariffs);
      const bPrice = typeof businessResult.price === 'number' ? businessResult.price : businessResult.price.min;
      const vPrice = typeof vanResult.price === 'number' ? vanResult.price : vanResult.price.min;
      // Round-trip discount (-20% on the return leg = -10% on the doubled total),
      // applied before the Transport au Féminin surcharge to match the server.
      const rawB = surcharge(tripType === 'round_trip' ? Math.ceil(bPrice * 0.9) : bPrice);
      const rawV = surcharge(tripType === 'round_trip' ? Math.ceil(vPrice * 0.9) : vPrice);

      setRouteCoords(route.coords);
      setResult({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        businessPrice: formatPrice(rawB),
        vanPrice: formatPrice(rawV),
        rawPrice: vehicleType === 'BUSINESS' ? rawB : rawV,
      });
    } catch { setError(t('error_generic')); }
    finally { setLoading(false); }
  }, [departure, arrival, fromPoint, toPoint, tripType, vehicleType, tariffs, t, surcharge]);

  /* ── Calculate — MAD ── */
  const handleCalculateMAD = useCallback(() => {
    const hours = parseInt(duration, 10);
    const businessResult = calculatePrice({ serviceType: 'MAD', vehicleType: 'BUSINESS', durationHours: hours }, tariffs);
    const vanResult = calculatePrice({ serviceType: 'MAD', vehicleType: 'VAN', durationHours: hours }, tariffs);
    const bRaw = typeof businessResult.price === 'number' ? businessResult.price : businessResult.price.min;
    const vRaw = typeof vanResult.price === 'number' ? vanResult.price : vanResult.price.min;
    const rawB = surcharge(bRaw);
    const rawV = surcharge(vRaw);
    setRouteCoords([]);
    setResult({
      distanceKm: 0,
      durationMin: hours * 60,
      businessPrice: formatPrice(rawB),
      vanPrice: formatPrice(rawV),
      rawPrice: vehicleType === 'BUSINESS' ? rawB : rawV,
    });
  }, [duration, vehicleType, tariffs, surcharge]);

  function handleCalculate() {
    if (activeService === 'mad') handleCalculateMAD();
    else handleCalculateTransfer();
  }

  /* ── Réserver → shared vehicle-selection + payment funnel (keeps pop-ups) ── */
  function handleBook() {
    if (activeService === 'simple' && (!departure.trim() || !arrival.trim())) {
      setError(t('error_addresses'));
      return;
    }
    const qp = new URLSearchParams();
    qp.set('service', activeService === 'mad' ? 'mad' : 'transfer');
    if (departure) qp.set('departure', departure);
    if (date) qp.set('date', date);
    if (hour) qp.set('hour', hour);
    qp.set('passengers', passengers);
    if (activeService === 'simple') {
      if (arrival) qp.set('arrival', arrival);
      qp.set('trip', tripType);
    } else {
      qp.set('duration', duration);
    }
    if (women) qp.set('women', '1');
    if (lockedService) qp.set('lock', '1');
    router.push(`${localePath('/reservation/vehicules', locale)}?${qp.toString()}`);
  }

  const showSelector = !lockedService;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title ?? t('form_title')}</h3>

      {showSelector && (
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeService === 'simple' ? styles.tabActive : ''}`}
            onClick={() => handleServiceChange('simple')}
          >
            {t('tab_simple')}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeService === 'mad' ? styles.tabActive : ''}`}
            onClick={() => handleServiceChange('mad')}
          >
            {t('tab_mad')}
          </button>
        </div>
      )}

      <AutocompleteField
        placeholder={t('form_departure_placeholder')}
        value={departure}
        onChange={handleDepartureChange}
        onSelect={(p) => { setFromPoint(p); setDeparture(p.label); clearEstimate(); }}
      />

      {activeService === 'simple' && (
        <AutocompleteField
          placeholder={t('form_arrival_placeholder')}
          value={arrival}
          onChange={handleArrivalChange}
          onSelect={(p) => { setToPoint(p); setArrival(p.label); clearEstimate(); }}
        />
      )}

      <div className={styles.row}>
        <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" className={styles.input} value={hour} onChange={(e) => setHour(e.target.value)} />
      </div>

      <div className={styles.row}>
        {activeService === 'simple' ? (
          <select className={styles.select} value={tripType} onChange={(e) => { setTripType(e.target.value); clearEstimate(); }}>
            <option value="one_way">{t('trip_one_way')}</option>
            <option value="round_trip">{t('trip_round_trip')}</option>
          </select>
        ) : (
          <select className={styles.select} value={duration} onChange={(e) => { setDuration(e.target.value); clearEstimate(); }}>
            {MAD_DURATIONS.map((h) => (
              <option key={h} value={h}>{h}h {t('mad_duration_label')}</option>
            ))}
          </select>
        )}
        <select className={styles.select} value={passengers} onChange={(e) => handlePassengersChange(e.target.value)}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>{n} {t('passengers_label')}</option>
          ))}
        </select>
      </div>

      {!businessAllowed && <p className={styles.vanRequiredNote}>{t('van_required_note')}</p>}

      <div className={styles.vehicleSelector}>
        <button
          type="button"
          className={`${styles.vehicleBtn} ${vehicleType === 'BUSINESS' ? styles.vehicleBtnActive : ''} ${!businessAllowed ? styles.vehicleBtnDisabled : ''}`}
          onClick={() => handleVehicleChange('BUSINESS')}
          disabled={!businessAllowed}
        >
          <span className={styles.vehicleEmoji}>🚘</span> Business
        </button>
        <button
          type="button"
          className={`${styles.vehicleBtn} ${vehicleType === 'VAN' ? styles.vehicleBtnActive : ''}`}
          onClick={() => handleVehicleChange('VAN')}
        >
          <span className={styles.vehicleEmoji}>🚐</span> Van
        </button>
      </div>

      <button className={styles.calcBtn} onClick={handleCalculate} disabled={loading}>
        {loading ? t('calculating') : t('form_calculate')}
      </button>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {result && (
        <div className={styles.inlinePrice}>
          <div className={styles.inlinePriceRow}>
            <span className={styles.inlinePriceLabel}>{t('estimated_price')}</span>
            <span className={styles.inlinePriceValue}>
              {vehicleType === 'BUSINESS' ? result.businessPrice : result.vanPrice}
            </span>
          </div>
          {activeService === 'mad' && <p className={styles.rateNote}>{t('deposit_note')}</p>}
          <button className={styles.bookBtn} onClick={handleBook}>{t('book_cta')}</button>
        </div>
      )}
    </div>
  );
}
