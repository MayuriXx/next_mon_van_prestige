'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useContenus } from '@/lib/hooks/useContenus';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useTariffs, type TariffData } from '@/lib/hooks/useTariffs';
import { calculatePrice } from '@/lib/utils/pricing';
import type { VehicleType } from '@/lib/types/pricing';
import styles from './DeplProPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

/**
 * Transfer price for a given distance, using the official grid brackets read
 * live from Firestore (useTariffs → TariffData). Delegates to the shared
 * pricing engine so this page always matches the grid and the /reservation
 * calculator. No hardcoded rate remains.
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
  } catch {
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
  } catch {
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
  } catch {
    return null;
  }
}

async function getRoute(from: GeoPoint, to: GeoPoint): Promise<{ distanceKm: number; durationMin: number; coords: [number, number][] } | null> {
  const url = 'https://router.project-osrm.org/route/v1/driving/' + from.lng + ',' + from.lat + ';' + to.lng + ',' + to.lat + '?overview=full&geometries=geojson';
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes.length) return null;
  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
    coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
  };
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
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

/* ── Page ── */
export default function DeplProPage() {
  const t = useTranslations('deplPro');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const contenus = useContenus('deplPro', locale as 'fr' | 'en' | 'nl');
  const { tariffs } = useTariffs();

  // Active form tab: 'simple' | 'mad'
  const [activeTab, setActiveTab] = useState<'simple' | 'mad'>('simple');

  // Simple transfer fields
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

  /* Route the entered trip into the vehicle-selection -> payment funnel (same
     funnel as the airport packages). VehicleSelectionPage re-geocodes the
     addresses and the price is recomputed server-side at checkout. */
  function handleBook() {
    if (!departure.trim() || !arrival.trim()) { setError(t('error_addresses')); return; }
    const params = new URLSearchParams({ departure, arrival, trip: tripType, passengers });
    if (date) params.set('date', date);
    if (hour) params.set('hour', hour);
    router.push(`${localePath('/reservation/vehicules', locale)}?${params.toString()}`);
  }

  function handleDepartureChange(val: string) { setDeparture(val); setFromPoint(null); }
  function handleArrivalChange(val: string)   { setArrival(val);   setToPoint(null);   }

  const handleCalculate = useCallback(async () => {
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
      // Round-trip discount: -20% on the return leg = 10% off the doubled-distance total.
      const rt = (n: number) => tripType === 'round_trip' ? Math.ceil(n * 0.9) : n;
      setResult({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        businessPrice: rt(transferPrice(km, 'BUSINESS', tariffs)),
        vanPrice: rt(transferPrice(km, 'VAN', tariffs)),
      });
      setTimeout(() => mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch { setError(t('error_generic')); }
    finally { setLoading(false); }
  }, [departure, arrival, fromPoint, toPoint, tripType, tariffs, t]);

  return (
    <>
      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/deplacements-professionnels.jpg"
            alt="Déplacements Professionnels MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroInner}>
          {/* Texte gauche */}
          <div className={styles.heroText}>
            <p className={styles.heroTag}>{t('tag')}</p>
            <h1 className={styles.heroTitle}>{contenus.get('title') || t('title')}</h1>
            <p className={styles.heroSubtitle}>{contenus.get('subtitle') || t('subtitle')}</p>
            <div className={styles.heroBadges}>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t('badge_tarif')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {t('badge_ponct')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {t('badge_secu')}
              </span>
            </div>
          </div>

          {/* Formulaire flottant droite */}
          <div className={styles.heroForm}>
            <h3 className={styles.heroFormTitle}>{t('form_title')}</h3>

            {/* Tabs */}
            <div className={styles.formTabs}>
              <button
                className={`${styles.formTab} ${activeTab === 'simple' ? styles.formTabActive : ''}`}
                onClick={() => setActiveTab('simple')}
              >
                {t('tab_simple')}
              </button>
              <button
                className={`${styles.formTab} ${activeTab === 'mad' ? styles.formTabActive : ''}`}
                onClick={() => setActiveTab('mad')}
              >
                {t('tab_mad')}
              </button>
            </div>

            {activeTab === 'simple' && (
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
                  <input type="date" className={styles.formInput} value={date} onChange={(e) => setDate(e.target.value)} />
                  <input type="time" className={styles.formInput} value={hour} onChange={(e) => setHour(e.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <select className={styles.formSelect} value={tripType} onChange={(e) => setTripType(e.target.value)}>
                    <option value="one_way">{t('trip_one_way')}</option>
                    <option value="round_trip">{t('trip_round_trip')}</option>
                  </select>
                  <select className={styles.formSelect} value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} {t('passengers_label')}</option>
                    ))}
                  </select>
                </div>
                <button className={styles.formBtn} onClick={handleCalculate} disabled={loading}>
                  {loading ? t('calculating') : t('form_calculate')}
                </button>
                {error && <p className={styles.errorMsg}>{error}</p>}
              </>
            )}

            {activeTab === 'mad' && (
              <>
                <AutocompleteField
                  placeholder={t('form_departure_placeholder')}
                  value={departure}
                  onChange={handleDepartureChange}
                  onSelect={(p) => { setFromPoint(p); setDeparture(p.label); }}
                />
                <div className={styles.formRow}>
                  <input type="date" className={styles.formInput} value={date} onChange={(e) => setDate(e.target.value)} />
                  <input type="time" className={styles.formInput} value={hour} onChange={(e) => setHour(e.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <select className={styles.formSelect} value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} {t('passengers_label')}</option>
                    ))}
                  </select>
                </div>
                <button className={styles.formBtn} onClick={() => { window.location.href = `/${locale}/reservation`; }}>
                  {t('form_calculate')}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══ POURQUOI NOUS CHOISIR ══ */}
      <section className={styles.excellenceSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.excellenceLayout}>
            {/* Avantages */}
            <div className={styles.advantages}>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_CLOCK}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_ponct_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_ponct_desc')}</p>
                </div>
              </div>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_USER}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_pro_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_pro_desc')}</p>
                </div>
              </div>
              <div className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{ICON_SHIELD}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t('adv_secu_title')}</h3>
                  <p className={styles.advantageDesc}>{t('adv_secu_desc')}</p>
                </div>
              </div>
            </div>

            {/* Carte + stats */}
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

