'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useContenus } from '@/lib/hooks/useContenus';
import { getLocaleFromPath } from '@/lib/utils/locale';
import ReservationForm, {
  type ReservationEstimate,
  type ReservationGeo,
} from '@/components/reservation/ReservationForm';
import styles from './EvenementsSpeciauxPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

/* ── Icons ── */
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

type Locale = 'fr' | 'en' | 'nl';

export default function EvenementsSpeciauxPage() {
  const t = useTranslations('evenementsSpeciaux');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const contenus = useContenus('evenementsSpeciaux', locale as 'fr' | 'en' | 'nl');

  const [geo, setGeo] = useState<ReservationGeo>({ from: null, to: null, routeCoords: [] });
  const [mapResult, setMapResult] = useState<ReservationEstimate | null>(null);
  const mapColRef = useRef<HTMLDivElement>(null);

  function handleEstimate(est: ReservationEstimate | null) {
    setMapResult(est);
    if (est && est.distanceKm > 0) {
      setTimeout(() => mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

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

          {/* Formulaire flottant droite — partagé, sélecteur Transfert simple / MAD visible */}
          <ReservationForm
            title={t('form_title')}
            initialService="mad"
            onGeoChange={setGeo}
            onEstimate={handleEstimate}
          />
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
                <LeafletMap from={geo.from} to={geo.to} routeCoords={geo.routeCoords} />
              </div>
              <div className={styles.mapStats}>
                <div className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.statIcon}>
                    <circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
                  </svg>
                  <div>
                    <span className={styles.statLabel}>{t('result_distance')}</span>
                    <span className={styles.statValue}>{mapResult && mapResult.distanceKm > 0 ? mapResult.distanceKm.toFixed(1) + ' km' : '-- km'}</span>
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
                      {mapResult && mapResult.distanceKm > 0
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
