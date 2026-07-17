'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { calculatePrice, formatPrice } from '@/lib/utils/pricing';
import { useTariffs } from '@/lib/hooks/useTariffs';
import type { VehicleType } from '@/lib/types/pricing';
import type { CheckoutPayload } from '@/lib/types/reservation';
import styles from './ReservationPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

/* ── Google Places helpers (proxied through Firebase Cloud Functions) ──
 *
 * The Google Maps API key is NOT exposed to the browser. The functions below
 * (placesAutocomplete, placeDetails, geocode) live in functions/src/index.ts
 * and hold the key server-side as a Firebase secret.
 *
 * Autocomplete + Place Details share a per-typing-session token so Google bills
 * them as a single session unit instead of per keystroke. */
const FUNCTIONS_BASE = 'https://europe-west1-mon-van-prestige.cloudfunctions.net';

interface GeoPoint { lat: number; lng: number; label: string; }
interface Suggestion { placeId: string; description: string; }

/** Generate a session token for grouping autocomplete + details billing. */
function newSessionToken(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchSuggestions(
  query: string,
  sessionToken: string
): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/placesAutocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query, sessionToken, language: 'fr' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.suggestions ?? []) as Suggestion[];
  } catch {
    return [];
  }
}

/** Resolve a place_id to precise coordinates via Place Details. */
async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/placeDetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, sessionToken, language: 'fr' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
    return { lat: data.lat, lng: data.lng, label: data.formattedAddress ?? '' };
  } catch {
    return null;
  }
}

/** Free-text geocoding fallback (used when the user typed an address without
 *  picking a suggestion). Backed by the Geocoding API via the `geocode`
 *  Cloud Function. */
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
    return { lat: data.lat, lng: data.lng, label: data.formattedAddress ?? '' };
  } catch {
    return null;
  }
}

async function getRoute(from: GeoPoint, to: GeoPoint): Promise<{ distanceKm: number; durationMin: number; coords: [number, number][] } | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { lat: from.lat, lng: from.lng }, destination: { lat: to.lat, lng: to.lng } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.distanceKm !== 'number' || !Array.isArray(data.coords)) return null;
    return { distanceKm: data.distanceKm, durationMin: data.durationMin, coords: data.coords as [number, number][] };
  } catch {
    return null;
  }
}

/* ── AutocompleteField ── */
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
  // One session token per typing session; regenerated after each selection so
  // Google bills autocomplete + details as a single session unit.
  const sessionTokenRef = useRef<string>(newSessionToken());

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
    // The session ends once details are fetched — start a fresh token next time.
    sessionTokenRef.current = newSessionToken();
    if (point) {
      onSelect({ ...point, label: point.label || s.description });
    }
  }

  return (
    <div className={styles.autocompleteWrap} ref={wrapRef}>
      <input
        type="text"
        className={styles.formInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        autoComplete="off"
      />
      {open && (
        <ul className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <li key={s.placeId || i} className={styles.suggestionItem} onMouseDown={() => handleSelect(s)}>
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

/* ── SVG Icons ── */
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ── MAD duration options ── */
const MAD_DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

/* ══════════════════════════════════════════════
   ReservationPage
   ══════════════════════════════════════════════ */
export default function ReservationPage() {
  const t = useTranslations('reservation');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { tariffs } = useTariffs();

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<'simple' | 'mad'>('simple');

  /* ── Shared fields ── */
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [tripType, setTripType] = useState('one_way');
  const [vehicleType, setVehicleType] = useState<VehicleType>('BUSINESS');
  const [duration, setDuration] = useState('2');

  /* ── US-04: Business seats max 3, Van required beyond that, hard cap 7 ── */
  const businessAllowed = parseInt(passengers, 10) <= 3;

  /* ── Geo / route state ── */
  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint] = useState<GeoPoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Result state ── */
  const [result, setResult] = useState<{
    distanceKm: number;
    durationMin: number;
    businessPrice: string;
    vanPrice: string;
    rawPrice: number; // numeric total for Stripe
  } | null>(null);

  /* ── Client info modal state ── */
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const mapColRef = useRef<HTMLDivElement>(null);

  /* ── Prefill from airport-package modal (TransferModal → /reservation?…) ──
     Reads query params on mount and pre-populates the transfer form so the
     visitor lands on the calculator with their route/date already filled.
     Uses window.location.search (not useSearchParams) to avoid forcing a
     Suspense boundary on this force-static page. ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('departure')) setDeparture(p.get('departure') as string);
    if (p.get('arrival')) setArrival(p.get('arrival') as string);
    if (p.get('date')) setDate(p.get('date') as string);
    if (p.get('hour')) setHour(p.get('hour') as string);
    if (p.get('passengers')) handlePassengersChange(p.get('passengers') as string);
    if (p.get('trip')) setTripType(p.get('trip') as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Field change handlers ── */
  function handleDepartureChange(val: string) { setDeparture(val); setFromPoint(null); setResult(null); }
  function handleArrivalChange(val: string) { setArrival(val); setToPoint(null); setResult(null); }

  /* ── Calculate — TRANSFER ── */
  const handleCalculateTransfer = useCallback(async () => {
    if (!departure.trim() || !arrival.trim()) { setError(t('error_addresses')); return; }
    setLoading(true); setError(''); setResult(null); setRouteCoords([]);
    try {
      const [from, to] = await Promise.all([
        fromPoint ? Promise.resolve(fromPoint) : geocode(departure),
        toPoint   ? Promise.resolve(toPoint)   : geocode(arrival),
      ]);
      if (!from || !to) { setError(t('error_geocode')); setLoading(false); return; }
      setFromPoint(from); setToPoint(to);
      const route = await getRoute(from, to);
      if (!route) { setError(t('error_route')); setLoading(false); return; }

      const multiplier = tripType === 'round_trip' ? 2 : 1;
      const km = route.distanceKm * multiplier;
      setRouteCoords(route.coords);

      const businessResult = calculatePrice({ serviceType: 'TRANSFER', vehicleType: 'BUSINESS', distanceKm: km }, tariffs);
      const vanResult      = calculatePrice({ serviceType: 'TRANSFER', vehicleType: 'VAN',      distanceKm: km }, tariffs);

      const bPrice = typeof businessResult.price === 'number' ? businessResult.price : businessResult.price.min;
      const vPrice = typeof vanResult.price === 'number' ? vanResult.price : vanResult.price.min;
      // Round-trip discount: -20% on the return leg. For a symmetric round trip
      // (outbound = return) this equals 10% off the doubled-distance total.
      const rawB = tripType === 'round_trip' ? Math.ceil(bPrice * 0.9) : bPrice;
      const rawV = tripType === 'round_trip' ? Math.ceil(vPrice * 0.9) : vPrice;

      setResult({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        businessPrice: formatPrice(rawB),
        vanPrice: formatPrice(rawV),
        rawPrice: vehicleType === 'BUSINESS' ? rawB : rawV,
      });
      setTimeout(() => mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch { setError(t('error_generic')); }
    finally { setLoading(false); }
  }, [departure, arrival, fromPoint, toPoint, tripType, vehicleType, tariffs, t]);

  /* ── Calculate — MAD ── */
  const handleCalculateMAD = useCallback(() => {
    const hours = parseInt(duration, 10);
    const businessResult = calculatePrice({ serviceType: 'MAD', vehicleType: 'BUSINESS', durationHours: hours }, tariffs);
    const vanResult      = calculatePrice({ serviceType: 'MAD', vehicleType: 'VAN',      durationHours: hours }, tariffs);
    const rawB = typeof businessResult.price === 'number' ? businessResult.price : businessResult.price.min;
    const rawV = typeof vanResult.price === 'number' ? vanResult.price : vanResult.price.min;
    setResult({
      distanceKm: 0,
      durationMin: hours * 60,
      businessPrice: formatPrice(businessResult.price),
      vanPrice: formatPrice(vanResult.price),
      rawPrice: vehicleType === 'BUSINESS' ? rawB : rawV,
    });
  }, [duration, vehicleType, tariffs]);

  /* ── Update rawPrice when vehicle type changes ── */
  function handleVehicleChange(v: VehicleType) {
    if (v === 'BUSINESS' && !businessAllowed) return; // guard: Business unavailable beyond 3 passengers
    setVehicleType(v);
    setResult(null); // reset so user recalculates with new vehicle
  }

  /* ── US-04: passenger count change — force Van beyond 3 passengers ── */
  function handlePassengersChange(val: string) {
    setPassengers(val);
    if (parseInt(val, 10) > 3 && vehicleType === 'BUSINESS') {
      setVehicleType('VAN');
    }
    setResult(null);
  }

  /* ── Open client info form ── */
  function handleBook() {
    if (!result) return;
    setShowClientForm(true);
    setBookingError('');
  }

  /* ── Submit booking → Cloud Function → Stripe ── */
  const handleSubmitBooking = useCallback(async () => {
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      setBookingError(t('error_client_info'));
      return;
    }
    if (!date || !hour) {
      setBookingError(t('error_datetime'));
      return;
    }
    if (!result) return;

    setBookingLoading(true);
    setBookingError('');

    try {
      const departureDateTime = `${date}T${hour}:00`;
      const currentPrice = vehicleType === 'BUSINESS' ? result.rawPrice : result.rawPrice;

      const payload: CheckoutPayload = {
        totalPrice       : currentPrice,
        departureDateTime,
        departureAddress : departure,
        arrivalAddress   : activeTab === 'simple' ? arrival : undefined,
        vehicleType,
        serviceType      : activeTab === 'simple' ? 'TRANSFER' : 'MAD',
        tripType         : activeTab === 'simple' ? tripType : undefined,
        passengers       : parseInt(passengers, 10),
        durationHours    : activeTab === 'mad' ? parseInt(duration, 10) : undefined,
        distanceKm       : activeTab === 'simple' ? result.distanceKm : undefined,
        locale,
        clientName       : clientName.trim(),
        clientEmail      : clientEmail.trim(),
        clientPhone      : clientPhone.trim(),
        notes            : clientNotes.trim() || undefined,
      };

      // Call Firebase Cloud Function directly via fetch (httpsCallable SDK
      // does not handle CORS correctly with Cloud Functions Gen 2 / Cloud Run)
      const fnUrl = 'https://europe-west1-mon-van-prestige.cloudfunctions.net/createCheckoutSession';
      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: payload }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Function error:', errText);
        setBookingError(t('error_stripe'));
        return;
      }

      const checkoutResult = await response.json();
      const sessionUrl = checkoutResult?.result?.sessionUrl ?? checkoutResult?.sessionUrl;

      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        setBookingError(t('error_stripe'));
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(t('error_generic'));
    } finally {
      setBookingLoading(false);
    }
  }, [
    clientName, clientEmail, clientPhone, clientNotes,
    date, hour, result, vehicleType, departure, arrival,
    activeTab, tripType, passengers, duration, locale, t,
  ]);

  return (
    <>
      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/deplacements-professionnels.jpg"
            alt="Réservation MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroInner}>
          {/* ── Left: heading ── */}
          <div className={styles.heroText}>
            <p className={styles.heroTag}>{t('tag')}</p>
            <h1 className={styles.heroTitle}>{t('title')}</h1>
            <p className={styles.heroSubtitle}>{t('subtitle')}</p>
            <div className={styles.heroBadges}>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('badge_price')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {t('badge_punctuality')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {t('badge_security')}
              </span>
            </div>
          </div>

          {/* ── Right: booking form card ── */}
          <div className={styles.heroForm}>
            <h3 className={styles.heroFormTitle}>{t('form_title')}</h3>

            {/* Tabs */}
            <div className={styles.formTabs}>
              <button
                className={`${styles.formTab} ${activeTab === 'simple' ? styles.formTabActive : ''}`}
                onClick={() => { setActiveTab('simple'); setResult(null); setError(''); setShowClientForm(false); }}
              >
                {t('tab_simple')}
              </button>
              <button
                className={`${styles.formTab} ${activeTab === 'mad' ? styles.formTabActive : ''}`}
                onClick={() => { setActiveTab('mad'); setResult(null); setError(''); setShowClientForm(false); }}
              >
                {t('tab_mad')}
              </button>
            </div>

            {/* ── Tab: Trajet Simple ── */}
            {activeTab === 'simple' && !showClientForm && (
              <>
                <AutocompleteField
                  placeholder={t('form_departure_placeholder')}
                  value={departure}
                  onChange={handleDepartureChange}
                  onSelect={(p) => { setFromPoint(p); setDeparture(p.label); }}
                />
                <AutocompleteField
                  placeholder={t('form_arrival_placeholder')}
                  value={arrival}
                  onChange={handleArrivalChange}
                  onSelect={(p) => { setToPoint(p); setArrival(p.label); }}
                />
                <div className={styles.formRow}>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <input
                    type="time"
                    className={styles.formInput}
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                  />
                </div>
                <div className={styles.formRow}>
                  <select
                    className={styles.formSelect}
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                  >
                    <option value="one_way">{t('trip_one_way')}</option>
                    <option value="round_trip">{t('trip_round_trip')}</option>
                  </select>
                  <select
                    className={styles.formSelect}
                    value={passengers}
                    onChange={(e) => handlePassengersChange(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} {t('passengers_label')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle selector */}
                <div className={styles.vehicleSelector}>
                  <button
                    className={`${styles.vehicleBtn} ${vehicleType === 'BUSINESS' ? styles.vehicleBtnActive : ''} ${!businessAllowed ? styles.vehicleBtnDisabled : ''}`}
                    onClick={() => handleVehicleChange('BUSINESS')}
                    type="button"
                    disabled={!businessAllowed}
                    aria-disabled={!businessAllowed}
                  >
                    <span className={styles.vehicleEmoji}>🚗</span>
                    <span>Business</span>
                  </button>
                  <button
                    className={`${styles.vehicleBtn} ${vehicleType === 'VAN' ? styles.vehicleBtnActive : ''}`}
                    onClick={() => handleVehicleChange('VAN')}
                    type="button"
                  >
                    <span className={styles.vehicleEmoji}>🚐</span>
                    <span>Van</span>
                  </button>
                </div>
                {!businessAllowed && (
                  <p className={styles.vanRequiredNote}>{t('van_required_note')}</p>
                )}

                <button
                  className={styles.formBtn}
                  onClick={handleCalculateTransfer}
                  disabled={loading}
                >
                  {loading ? t('calculating') : t('form_calculate')}
                </button>
                {error && <p className={styles.errorMsg}>{error}</p>}

                {/* Inline price result */}
                {result && (
                  <div className={styles.inlinePrice}>
                    <div className={styles.inlinePriceRow}>
                      <span className={styles.inlinePriceLabel}>{t('estimated_price')}</span>
                      <span className={styles.inlinePriceValue}>
                        {vehicleType === 'BUSINESS' ? result.businessPrice : result.vanPrice}
                      </span>
                    </div>
                    <button className={styles.bookBtn} onClick={handleBook}>
                      {t('book_cta')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Mise à Disposition ── */}
            {activeTab === 'mad' && !showClientForm && (
              <>
                <AutocompleteField
                  placeholder={t('form_departure_placeholder')}
                  value={departure}
                  onChange={handleDepartureChange}
                  onSelect={(p) => { setFromPoint(p); setDeparture(p.label); }}
                />
                <div className={styles.formRow}>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <input
                    type="time"
                    className={styles.formInput}
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                  />
                </div>
                <div className={styles.formRow}>
                  <select
                    className={styles.formSelect}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    {MAD_DURATIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}h {t('mad_duration_label')}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.formSelect}
                    value={passengers}
                    onChange={(e) => handlePassengersChange(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} {t('passengers_label')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle selector */}
                <div className={styles.vehicleSelector}>
                  <button
                    className={`${styles.vehicleBtn} ${vehicleType === 'BUSINESS' ? styles.vehicleBtnActive : ''} ${!businessAllowed ? styles.vehicleBtnDisabled : ''}`}
                    onClick={() => handleVehicleChange('BUSINESS')}
                    type="button"
                    disabled={!businessAllowed}
                    aria-disabled={!businessAllowed}
                  >
                    <span className={styles.vehicleEmoji}>🚗</span>
                    <span>Business</span>
                  </button>
                  <button
                    className={`${styles.vehicleBtn} ${vehicleType === 'VAN' ? styles.vehicleBtnActive : ''}`}
                    onClick={() => handleVehicleChange('VAN')}
                    type="button"
                  >
                    <span className={styles.vehicleEmoji}>🚐</span>
                    <span>Van</span>
                  </button>
                </div>
                {!businessAllowed && (
                  <p className={styles.vanRequiredNote}>{t('van_required_note')}</p>
                )}

                <button className={styles.formBtn} onClick={handleCalculateMAD}>
                  {t('form_calculate')}
                </button>

                {/* MAD price result */}
                {result && (
                  <div className={styles.inlinePrice}>
                    <div className={styles.inlinePriceRow}>
                      <span className={styles.inlinePriceLabel}>{t('estimated_price')}</span>
                      <span className={styles.inlinePriceValue}>
                        {vehicleType === 'BUSINESS' ? result.businessPrice : result.vanPrice}
                      </span>
                    </div>
                    <p className={styles.madRateNote}>
                      {`${tariffs.mad[vehicleType]} €/h · ${vehicleType === 'BUSINESS' ? 'Business' : 'Van'}`}
                    </p>
                    <button className={styles.bookBtn} onClick={handleBook}>
                      {t('book_cta')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Client info form (step 2) ── */}
            {showClientForm && result && (
              <div className={styles.clientForm}>
                <button
                  className={styles.backBtn}
                  onClick={() => { setShowClientForm(false); setBookingError(''); }}
                  type="button"
                >
                  ← {t('back')}
                </button>

                {/* Price recap */}
                <div className={styles.priceRecap}>
                  <span className={styles.priceRecapLabel}>{t('estimated_price')}</span>
                  <span className={styles.priceRecapValue}>
                    {vehicleType === 'BUSINESS' ? result.businessPrice : result.vanPrice}
                  </span>
                </div>
                <p className={styles.depositNote}>{t('deposit_note')}</p>

                <input
                  type="text"
                  className={styles.formInput}
                  placeholder={t('client_name_placeholder')}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoComplete="name"
                />
                <input
                  type="email"
                  className={styles.formInput}
                  placeholder={t('client_email_placeholder')}
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  type="tel"
                  className={styles.formInput}
                  placeholder={t('client_phone_placeholder')}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  autoComplete="tel"
                />
                <textarea
                  className={styles.formTextarea}
                  placeholder={t('client_notes_placeholder')}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={2}
                />

                {bookingError && <p className={styles.errorMsg}>{bookingError}</p>}

                <button
                  className={styles.bookBtn}
                  onClick={handleSubmitBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? t('redirecting') : t('pay_cta')}
                </button>

                <p className={styles.stripeNote}>
                  🔒 {t('stripe_note')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ POURQUOI NOUS CHOISIR ══ */}
      <section className={styles.advantageSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.advantageLayout}>
            {/* Avantages */}
            <div className={styles.advantages}>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_CLOCK}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_punctuality_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_punctuality_desc')}</p>
                </div>
              </div>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_USER}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_driver_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_driver_desc')}</p>
                </div>
              </div>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_SHIELD}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_security_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_security_desc')}</p>
                </div>
              </div>
            </div>

            {/* Map + stats */}
            <div className={styles.mapCol} ref={mapColRef}>
              <div className={styles.mapWrapper}>
                <LeafletMap from={fromPoint} to={toPoint} routeCoords={routeCoords} />
              </div>
              <div className={styles.mapStats}>
                <div className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.statIcon}>
                    <circle cx="12" cy="11" r="3" />
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                  </svg>
                  <div>
                    <span className={styles.statLabel}>{t('result_distance')}</span>
                    <span className={styles.statValue}>
                      {result && result.distanceKm > 0 ? result.distanceKm.toFixed(1) + ' km' : '-- km'}
                    </span>
                  </div>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.statIcon}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <span className={styles.statLabel}>{t('result_duration')}</span>
                    <span className={styles.statValue}>
                      {result
                        ? activeTab === 'mad'
                          ? parseInt(duration, 10) + 'h'
                          : result.durationMin >= 60
                            ? Math.floor(result.durationMin / 60) + 'h' + String(result.durationMin % 60).padStart(2, '0')
                            : result.durationMin + ' min'
                        : '-- min'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

