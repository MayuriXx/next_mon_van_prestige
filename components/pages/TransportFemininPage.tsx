'use client';

import Image from 'next/image';
import { reportError } from '@/lib/errors/errorBus';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useContenus } from '@/lib/hooks/useContenus';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useWomenSurcharge } from '@/lib/hooks/useWomenSurcharge';
import { useTariffs, type TariffData } from '@/lib/hooks/useTariffs';
import { calculatePrice } from '@/lib/utils/pricing';
import type { VehicleType } from '@/lib/types/pricing';
import styles from './TransportFemininPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

/**
 * Base transfer price (before the women surcharge) for a given distance,
 * using the official grid brackets read live from Firestore (useTariffs).
 * Delegates to the shared pricing engine so this page matches the grid and the
 * /reservation calculator. The "Transport au Féminin" surcharge is applied on
 * top by the caller. No hardcoded rate remains.
 */
function transferPrice(km: number, vehicleType: VehicleType, tariffs: TariffData): number {
  return calculatePrice(
    { serviceType: 'TRANSFER', vehicleType, distanceKm: km },
    tariffs
  ).price as number;
}

interface GeoPoint { lat: number; lng: number; label: string; }
interface Suggestion { placeId: string; description: string; }

/* Address search is backed by Google (Places + Geocoding) proxied through the
   Firebase Cloud Functions (placesAutocomplete, placeDetails, geocode) so the
   Google Maps API key stays server-side. Autocomplete + Place Details share a
   per-typing-session token so Google bills them as one session unit. */
const FUNCTIONS_BASE = 'https://europe-west1-mon-van-prestige.cloudfunctions.net';

function newSessionToken(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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
  } catch (err) {
    reportError(err, "Adresse introuvable. Vérifiez votre saisie.", 'geocode');
    return null;
  }
}

async function fetchSuggestions(query: string, sessionToken: string): Promise<Suggestion[]> {
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
  } catch (err) {
    reportError(err, "Suggestions d'adresses indisponibles.", 'autocomplete', 'warning');
    return [];
  }
}

async function fetchPlaceDetails(placeId: string, sessionToken: string): Promise<GeoPoint | null> {
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
  } catch (err) {
    reportError(err, "Impossible de récupérer cette adresse.", 'geocode', 'warning');
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
  } catch (err) {
    reportError(err, "Impossible de calculer l'itinéraire. Réessayez.", 'route');
    return null;
  }
}

/* ── Autocomplete field ── */
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        className={styles.formInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <li key={s.placeId || i} className={styles.suggestionItem} onMouseDown={() => handleSelect(s)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.suggestionIcon}>
                <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
              </svg>
              <span>{s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Icons ── */
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const ICON_MAP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
  </svg>
);
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const ADV_KEYS = [
  { id: 'custom',  icon: ICON_MAP,    titleKey: 'adv_custom_title',  descKey: 'adv_custom_desc'  },
  { id: 'secure',  icon: ICON_SHIELD, titleKey: 'adv_secure_title',  descKey: 'adv_secure_desc'  },
  { id: 'support', icon: ICON_USER,   titleKey: 'adv_support_title', descKey: 'adv_support_desc' },
];

/* ── Page ── */
export default function TransportFemininPage() {
  const t = useTranslations('transportFeminin');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const contenus = useContenus('transportFeminin', locale as 'fr' | 'en' | 'nl');
  const { tariffs } = useTariffs();
  const surchargePercent = useWomenSurcharge();

  const [departure, setDeparture] = useState('');
  const [arrival, setArrival]     = useState('');
  const [date, setDate]           = useState('');
  const [hour, setHour]           = useState('');
  const [tripType, setTripType]   = useState('one_way');
  const [passengers, setPassengers] = useState('1');

  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint]     = useState<GeoPoint | null>(null);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<{ distanceKm: number; durationMin: number; businessPrice: number; vanPrice: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const mapColRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* Route the entered trip into the vehicle-selection -> payment funnel with the
     women=1 flag so the surcharge is applied and billed online. Shown only after
     a successful estimate, so the addresses are already resolved. */
  function handleBook() {
    const qp = new URLSearchParams({ departure, arrival, trip: tripType, passengers, women: '1' });
    if (date) qp.set('date', date);
    if (hour) qp.set('hour', hour);
    router.push(`${localePath('/reservation/vehicules', locale)}?${qp.toString()}`);
  }

  function handleDepartureChange(val: string) {
    setDeparture(val);
    setFromPoint(null);
  }
  function handleArrivalChange(val: string) {
    setArrival(val);
    setToPoint(null);
  }

  const handleCalculate = useCallback(async () => {
    if (!departure.trim() || !arrival.trim()) {
      setError(t('error_addresses'));
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setRouteCoords([]);

    try {
      const [from, to] = await Promise.all([
        fromPoint ? Promise.resolve(fromPoint) : geocode(departure),
        toPoint   ? Promise.resolve(toPoint)   : geocode(arrival),
      ]);

      if (!from || !to) { setError(t('error_geocode')); setLoading(false); return; }
      setFromPoint(from);
      setToPoint(to);

      const route = await getRoute(from, to);
      if (!route) { setError(t('error_route')); setLoading(false); return; }

      const multiplier = tripType === 'round_trip' ? 2 : 1;
      const km = route.distanceKm * multiplier;
      setRouteCoords(route.coords);
      const surchargeMultiplier = 1 + surchargePercent / 100;
      // Round-trip discount (-20% on the return leg) applied before the
      // Transport au Féminin surcharge, matching the server-side order.
      const rt = (n: number) => tripType === 'round_trip' ? Math.ceil(n * 0.9) : n;
      setResult({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        businessPrice: Math.ceil(rt(transferPrice(km, 'BUSINESS', tariffs)) * surchargeMultiplier),
        vanPrice: Math.ceil(rt(transferPrice(km, 'VAN', tariffs)) * surchargeMultiplier),
      });
      setTimeout(() => {
        mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [departure, arrival, fromPoint, toPoint, tripType, surchargePercent, tariffs, t]);

  return (
    <>
      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/transport-feminin.jpg"
            alt="Transport au Féminin MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroInner}>
          {/* Left text */}
          <div className={styles.heroText}>
            <p className={styles.heroTag}>{t('tag')}</p>
            <h1 className={styles.heroTitle}>{contenus.get('title') || t('title')}</h1>
            <p className={styles.heroSubtitle}>{contenus.get('subtitle') || t('subtitle')}</p>
            <div className={styles.heroBadges}>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {t('badge_security')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {t('badge_punctuality')}
              </span>
            </div>
          </div>

          {/* Floating form right */}
          <div className={styles.heroForm}>
            <h3 className={styles.heroFormTitle}>{t('form_title')}</h3>

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
              <input type="date" className={styles.formInput} value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" className={styles.formInput} value={hour} onChange={(e) => setHour(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <select className={styles.formSelect} value={tripType} onChange={(e) => setTripType(e.target.value)}>
                <option value="one_way">{t('trip_one_way')}</option>
                <option value="round_trip">{t('trip_round_trip')}</option>
              </select>
              <select className={styles.formSelect} value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                {[1,2,3,4,5,6,7].map(n => (
                  <option key={n} value={n}>{n} {t('passengers_label')}</option>
                ))}
              </select>
            </div>

            <button className={styles.formBtn} onClick={handleCalculate} disabled={loading}>
              {loading ? t('calculating') : t('form_calculate')}
            </button>
            {error && <p className={styles.errorMsg}>{error}</p>}
          </div>
        </div>
      </section>

      {/* ══ EXCELLENCE SECTION ══ */}
      <section className={styles.excellenceSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.excellenceLayout}>
            {/* Advantages */}
            <div className={styles.advantages}>
              {ADV_KEYS.map((adv) => (
                <div key={adv.id} className={styles.advantageCard}>
                  <div className={styles.advantageIconWrap}>{adv.icon}</div>
                  <div>
                    <h3 className={styles.advantageTitle}>{t(adv.titleKey as any)}</h3>
                    <p className={styles.advantageDesc}>{t(adv.descKey as any)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Map + stats */}
            <div className={styles.mapCol} ref={mapColRef}>
              <div className={styles.mapWrapper}>
                <LeafletMap from={fromPoint} to={toPoint} routeCoords={routeCoords} />
              </div>
              <div className={styles.mapStats}>
                <div className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.statIcon}>
                    <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
                  </svg>
                  <div>
                    <span className={styles.statLabel}>{t('result_distance')}</span>
                    <span className={styles.statValue}>{result ? result.distanceKm.toFixed(1) + ' km' : '-- km'}</span>
                  </div>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.statIcon}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <div>
                    <span className={styles.statLabel}>{t('result_duration')}</span>
                    <span className={styles.statValue}>
                      {result
                        ? (result.durationMin >= 60
                            ? Math.floor(result.durationMin / 60) + 'h' + String(result.durationMin % 60).padStart(2, '0')
                            : result.durationMin + ' min')
                        : '-- min'}
                    </span>
                  </div>
                </div>
              </div>

              {result && (
                <>
                  <div className={styles.priceRow}>
                    <div className={styles.priceCard}>
                      <p className={styles.priceLabel}>Business</p>
                      <p className={styles.priceValue}>{result.businessPrice} €</p>
                      <p className={styles.priceSub}>{t('price_from')}</p>
                    </div>
                    <div className={styles.priceCard}>
                      <p className={styles.priceLabel}>Van</p>
                      <p className={styles.priceValue}>{result.vanPrice} €</p>
                      <p className={styles.priceSub}>{t('price_from')}</p>
                    </div>
                  </div>
                  <button className={styles.formBtn} onClick={handleBook}>
                    {t('book_cta')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
