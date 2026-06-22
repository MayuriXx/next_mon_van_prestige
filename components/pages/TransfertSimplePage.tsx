'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './TransfertSimplePage.module.css';

// Leaflet must not SSR
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

// Pricing (per km, with minimums)
const PRICE_PER_KM_BUSINESS = 2.2;
const PRICE_PER_KM_VAN = 3.5;
const MIN_BUSINESS = 22;
const MIN_VAN = 45;

function calcPrice(km: number, perKm: number, min: number): number {
  return Math.max(min, Math.round(km * perKm));
}

interface GeoPoint { lat: number; lng: number; label: string; }

async function geocode(address: string): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

async function getRoute(from: GeoPoint, to: GeoPoint): Promise<{ distanceKm: number; durationMin: number; coords: [number, number][] } | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes.length) return null;
  const route = data.routes[0];
  const distanceKm = route.distance / 1000;
  const durationMin = Math.round(route.duration / 60);
  const coords: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
  );
  return { distanceKm, durationMin, coords };
}

const ICON_MAP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
  </svg>
);
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const ICON_STAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ADV_KEYS = [
  { id: 'flexible', icon: ICON_MAP,    titleKey: 'adv_flexible_title',    descKey: 'adv_flexible_desc'    },
  { id: 'punctual', icon: ICON_CLOCK,  titleKey: 'adv_punctual_title',    descKey: 'adv_punctual_desc'    },
  { id: 'secure',   icon: ICON_SHIELD, titleKey: 'adv_secure_title',      descKey: 'adv_secure_desc'      },
  { id: 'comfort',  icon: ICON_STAR,   titleKey: 'adv_comfort_title',     descKey: 'adv_comfort_desc'     },
];

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

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<{ distanceKm: number; durationMin: number; businessPrice: number; vanPrice: number } | null>(null);
  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [toPoint, setToPoint]     = useState<GeoPoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

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
      const [from, to] = await Promise.all([geocode(departure), geocode(arrival)]);
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
    } catch {
      setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [departure, arrival, tripType, t]);

  return (
    <>
      {/* ── Hero ── */}
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

        <div className={styles.heroContent}>
          <p className={styles.heroTag}>{t('tag')}</p>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSubtitle}>{t('subtitle')}</p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {t('badge_door_to_door')}
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {t('badge_punctuality')}
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {t('badge_fixed_price')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section Calculator ── */}
      <section className={styles.calcSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.calcLayout}>
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

            {/* Form Panel */}
            <div className={styles.formPanel}>
              <h3 className={styles.formTitle}>{t('form_title')}</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>{t('form_departure')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder={t('form_departure_placeholder')}
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>{t('form_arrival')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder={t('form_arrival_placeholder')}
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{t('form_date')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{t('form_time')}</label>
                  <input
                    type="time"
                    className={styles.formInput}
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{t('form_trip_type')}</label>
                  <select
                    className={styles.formSelect}
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                  >
                    <option value="one_way">{t('trip_one_way')}</option>
                    <option value="round_trip">{t('trip_round_trip')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{t('form_passengers')}</label>
                  <select
                    className={styles.formSelect}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className={styles.formBtn}
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? t('calculating') : t('form_calculate')}
              </button>

              {error && <p className={styles.errorMsg}>{error}</p>}

              {result && (
                <div className={styles.result}>
                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>{t('result_distance')}</span>
                    <span className={styles.resultValue}>{result.distanceKm.toFixed(1)} km{tripType === 'round_trip' ? ` × 2` : ''}</span>
                  </div>
                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>{t('result_duration')}</span>
                    <span className={styles.resultValue}>
                      {result.durationMin >= 60
                        ? `${Math.floor(result.durationMin / 60)}h${(result.durationMin % 60).toString().padStart(2, '0')}`
                        : `${result.durationMin} min`}
                    </span>
                  </div>
                  <div className={styles.resultDivider} />
                  <div className={styles.resultPrices}>
                    <div className={styles.priceCard}>
                      <p className={styles.priceCardLabel}>Business</p>
                      <p className={styles.priceCardValue}>{result.businessPrice}€</p>
                      <p className={styles.priceCardSub}>{t('price_from')}</p>
                    </div>
                    <div className={styles.priceCard}>
                      <p className={styles.priceCardLabel}>Van</p>
                      <p className={styles.priceCardValue}>{result.vanPrice}€</p>
                      <p className={styles.priceCardSub}>{t('price_from')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Map Section ── */}
      {(fromPoint || toPoint) && (
        <section className={styles.mapSection}>
          <div className="container">
            <div className={styles.mapWrapper}>
              <LeafletMap from={fromPoint} to={toPoint} routeCoords={routeCoords} />
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className="container">
          <h2 className={styles.ctaTitle}>{t('cta_title')}</h2>
          <p className={styles.ctaSubtitle}>{t('cta_subtitle')}</p>
          <div className={styles.ctaButtons}>
            <Link href={localePath('/reservation', locale)} className={styles.ctaBtnPrimary}>
              {t('cta_book')}
            </Link>
            <Link href={localePath('/#contact', locale)} className={styles.ctaBtnSecondary}>
              {t('cta_contact')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
