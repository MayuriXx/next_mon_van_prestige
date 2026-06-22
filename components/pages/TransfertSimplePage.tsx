'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getLocaleFromPath } from '@/lib/utils/locale';
import styles from './TransfertSimplePage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

const PRICE_PER_KM_BUSINESS = 2.2;
const PRICE_PER_KM_VAN = 3.5;
const MIN_BUSINESS = 22;
const MIN_VAN = 45;

function calcPrice(km: number, perKm: number, min: number): number {
  return Math.max(min, Math.round(km * perKm));
}

interface GeoPoint { lat: number; lng: number; label: string; }
interface Suggestion { display_name: string; lat: string; lon: string; }

async function geocode(address: string): Promise<GeoPoint | null> {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1';
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=5&addressdetails=1&countrycodes=fr,be';
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  return res.json();
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

  // Close on outside click
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
      const results = await fetchSuggestions(val);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 350);
  }

  function handleSelect(s: Suggestion) {
    onChange(s.display_name);
    onSelect({ lat: parseFloat(s.lat), lng: parseFloat(s.lon), label: s.display_name });
    setSuggestions([]);
    setOpen(false);
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
            <li key={i} className={styles.suggestionItem} onMouseDown={() => handleSelect(s)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.suggestionIcon}>
                <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
              </svg>
              <span>{s.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Icons ── */
const ICON_MAP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
  </svg>
);
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
export default function TransfertSimplePage() {
  const t = useTranslations('transfertSimple');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  const [departure, setDeparture] = useState('');
  const [arrival, setArrival]     = useState('');
  const [date, setDate]           = useState('');
  const [hour, setHour]           = useState('');
  const [tripType, setTripType]   = useState('one_way');
  const [passengers, setPassengers] = useState('1');

  // Pre-resolved points from autocomplete (skip geocode if already resolved)
  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint]     = useState<GeoPoint | null>(null);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<{ distanceKm: number; durationMin: number; businessPrice: number; vanPrice: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const mapColRef = useRef<HTMLDivElement>(null);

  // Reset resolved point when user edits manually
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
      // Use pre-resolved points if available, otherwise geocode
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
      setResult({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        businessPrice: calcPrice(km, PRICE_PER_KM_BUSINESS, MIN_BUSINESS),
        vanPrice: calcPrice(km, PRICE_PER_KM_VAN, MIN_VAN),
      });
      setTimeout(() => {
        mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [departure, arrival, fromPoint, toPoint, tripType, t]);

  return (
    <>
      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/transfert-simple.jpg"
            alt="Transfert Simple MS Prestige Driver"
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
            <h1 className={styles.heroTitle}>{t('title')}</h1>
            <p className={styles.heroSubtitle}>{t('subtitle')}</p>
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

          {/* Formulaire flottant droite */}
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
                {[1,2,3,4,5,6,7,8].map(n => (
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

      {/* ══ L'EXCELLENCE DU VOYAGE ══ */}
      <section className={styles.excellenceSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.excellenceLayout}>
            {/* Avantages */}
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
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
