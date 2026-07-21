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
import styles from './DeplProPage.module.css';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

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

  const [geo, setGeo] = useState<ReservationGeo>({ from: null, to: null, routeCoords: [] });
  const [result, setResult] = useState<ReservationEstimate | null>(null);
  const mapColRef = useRef<HTMLDivElement>(null);

  function handleEstimate(est: ReservationEstimate | null) {
    setResult(est);
    if (est) {
      setTimeout(() => mapColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

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

          {/* Formulaire flottant droite — partagé, sélecteur Transfert simple / MAD visible */}
          <ReservationForm
            title={t('form_title')}
            onGeoChange={setGeo}
            onEstimate={handleEstimate}
          />
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
                <LeafletMap from={geo.from} to={geo.to} routeCoords={geo.routeCoords} />
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
                    <p className={styles.priceValue}>{result.businessPrice}</p>
                    <p className={styles.priceSub}>{t('price_from')}</p>
                  </div>
                  <div className={styles.priceCard}>
                    <p className={styles.priceLabel}>Van</p>
                    <p className={styles.priceValue}>{result.vanPrice}</p>
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
