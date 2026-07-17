'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useContenus } from '@/lib/hooks/useContenus';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './EvenementsSpeciauxPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

/* ── Types ── */
interface GeoPoint { lat: number; lng: number; label: string; }
interface Suggestion { placeId: string; description: string; }

/* ── Google Places helpers — proxied via Cloud Functions so the Google Maps API
   key stays server-side. Autocomplete + Place Details share a per-typing-session
   token so Google bills them as a single session unit. ── */
const FUNCTIONS_BASE = 'https://europe-west1-mon-van-prestige.cloudfunctions.net';

function newSessionToken(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
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

/* ── Autocomplete Field ── */
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

/* ── SVG Icons ── */
const ICON_HEART = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const FEATURES = [
  { id: 'decoration', icon: ICON_HEART, titleKey: 'feat_deco_title',   descKey: 'feat_deco_desc'    },
  { id: 'driver',     icon: ICON_USER,  titleKey: 'feat_driver_title', descKey: 'feat_driver_desc'  },
  { id: 'flex',       icon: ICON_CLOCK, titleKey: 'feat_flex_title',   descKey: 'feat_flex_desc'    },
];

const EVENT_TYPES_FR = ['Mariage', 'Soirée', 'Anniversaire', 'Cérémonie', 'Concert', 'Autre'];
const EVENT_TYPES_EN = ['Wedding', 'Party', 'Birthday', 'Ceremony', 'Concert', 'Other'];
const EVENT_TYPES_NL = ['Bruiloft', 'Feest', 'Verjaardag', 'Ceremonie', 'Concert', 'Andere'];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

const DURATIONS_FR = ['2 heures', '3 heures', '4 heures', '5 heures', '6 heures', 'Journée'];
const DURATIONS_EN = ['2 hours', '3 hours', '4 hours', '5 hours', '6 hours', 'Full day'];
const DURATIONS_NL = ['2 uur', '3 uur', '4 uur', '5 uur', '6 uur', 'Hele dag'];

type Locale = 'fr' | 'en' | 'nl';

export default function EvenementsSpeciauxPage() {
  const t = useTranslations('evenementsSpeciaux');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const contenus = useContenus('evenementsSpeciaux', locale as 'fr' | 'en' | 'nl');

  /* Form state */
  const [mode, setMode]             = useState<'trajet' | 'mad'>('mad');
  const [eventType, setEventType]   = useState('');
  const [pickup, setPickup]         = useState('');
  const [destination, setDest]      = useState('');
  const [date, setDate]             = useState('');
  const [hour, setHour]             = useState('');
  const [duration, setDuration]     = useState('');
  const [passengers, setPassengers] = useState('1');

  /* Map state */
  const [fromPoint, setFromPoint]   = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint]       = useState<GeoPoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [mapResult, setMapResult]   = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const mapColRef = useRef<HTMLDivElement>(null);

  function getEventTypes() {
    if (locale === 'en') return EVENT_TYPES_EN;
    if (locale === 'nl') return EVENT_TYPES_NL;
    return EVENT_TYPES_FR;
  }
  function getDurations() {
    if (locale === 'en') return DURATIONS_EN;
    if (locale === 'nl') return DURATIONS_NL;
    return DURATIONS_FR;
  }

  const handleCalculate = useCallback(async () => {
    if (!pickup.trim() || !destination.trim()) {
      setError(t('error_addresses'));
      return;
    }
    setLoading(true);
    setError('');
    setRouteCoords([]);
    setMapResult(null);
    try {
      const [from, to] = await Promise.all([
        fromPoint ? Promise.resolve(fromPoint) : geocode(pickup),
        toPoint   ? Promise.resolve(toPoint)   : geocode(destination),
      ]);
      if (!from || !to) { setError(t('error_geocode')); setLoading(false); return; }
      setFromPoint(from);
      setToPoint(to);
      const route = await getRoute(from, to);
      if (!route) { setError(t('error_route')); setLoading(false); return; }
      setRouteCoords(route.coords);
      setMapResult({ distanceKm: route.distanceKm, durationMin: route.durationMin });
      setTimeout(() => mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [pickup, destination, fromPoint, toPoint, t]);

  return (
    <>
      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/evenements-speciaux.jpg"
            alt="Événements Spéciaux MS Prestige Driver"
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
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {t('badge_elegance')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {t('badge_punctuality')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {t('badge_security')}
              </span>
              <span className={styles.heroBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.badgeIcon}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                {t('badge_flex')}
              </span>
            </div>
            <p className={styles.heroNote}>{t('hero_note')}</p>
          </div>

          {/* Formulaire flottant droite */}
          <div className={styles.heroForm}>
            <h3 className={styles.heroFormTitle}>{t('form_title')}</h3>

            {/* Toggle Trajet / Mise à Disposition */}
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === 'trajet' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('trajet')}
              >
                {t('mode_trajet')}
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'mad' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('mad')}
              >
                {t('mode_mad')}
              </button>
            </div>

            {/* Type d'événement */}
            <select
              className={styles.formSelect}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">{t('form_event_placeholder')}</option>
              {getEventTypes().map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>

            {/* Adresses avec autocomplete */}
            <AutocompleteField
              placeholder={t('form_pickup_placeholder')}
              value={pickup}
              onChange={(val) => { setPickup(val); setFromPoint(null); }}
              onSelect={(p) => { setFromPoint(p); setPickup(p.label); }}
            />
            <AutocompleteField
              placeholder={t('form_dest_placeholder')}
              value={destination}
              onChange={(val) => { setDest(val); setToPoint(null); }}
              onSelect={(p) => { setToPoint(p); setDest(p.label); }}
            />

            {/* Date + Heure */}
            <div className={styles.formRow}>
              <div className={styles.formInputWrap}>
                <label className={styles.formLabel}>{t('form_date_label')}</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className={styles.formInputWrap}>
                <label className={styles.formLabel}>{t('form_time_label')}</label>
                <select
                  className={styles.formSelect}
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                >
                  <option value="">{t('form_time_placeholder')}</option>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Durée + Passagers */}
            <div className={styles.formRow}>
              <select
                className={styles.formSelect}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="">{t('form_duration_placeholder')}</option>
                {getDurations().map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                className={styles.formSelect}
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              >
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <option key={n} value={n}>{n} {t('passengers_label')}</option>
                ))}
              </select>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <a href={localePath('/reservation', locale)} className={styles.formBtn}>
              {t('form_cta')}
            </a>
            <button className={styles.formBtnSecondary} onClick={handleCalculate} disabled={loading}>
              {loading ? t('calculating') : t('form_calculate')}
            </button>
          </div>
        </div>
      </section>

      {/* ══ SERVICE EVENTS ══ */}
      <section className={styles.serviceSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.serviceLayout}>
            {/* Features */}
            <div className={styles.features}>
              {FEATURES.map((feat) => (
                <div key={feat.id} className={styles.featureCard}>
                  <div className={styles.featureIconWrap}>{feat.icon}</div>
                  <div>
                    <h3 className={styles.featureTitle}>{t(feat.titleKey as any)}</h3>
                    <p className={styles.featureDesc}>{t(feat.descKey as any)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Carte Leaflet */}
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
                    <span className={styles.statValue}>{mapResult ? mapResult.distanceKm.toFixed(1) + ' km' : '-- km'}</span>
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
                      {mapResult
                        ? (mapResult.durationMin >= 60
                            ? Math.floor(mapResult.durationMin / 60) + 'h' + String(mapResult.durationMin % 60).padStart(2, '0')
                            : mapResult.durationMin + ' min')
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

