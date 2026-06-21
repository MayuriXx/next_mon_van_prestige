'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './TransfertAeroportPage.module.css';

const AIRPORTS = [
  { id: 'cdg',       destination_fr: 'Aéroport Charles de Gaulle', destination_en: 'Charles de Gaulle Airport', destination_nl: 'Luchthaven Charles de Gaulle', businessMin: 260, icon: '✈' },
  { id: 'orly',      destination_fr: "Aéroport d'Orly",            destination_en: 'Orly Airport',              destination_nl: 'Luchthaven Orly',              businessMin: 320, icon: '✈' },
  { id: 'zaventem',  destination_fr: 'Aéroport Brussels Zaventem', destination_en: 'Brussels Zaventem Airport', destination_nl: 'Luchthaven Brussel Zaventem',  businessMin: 160, icon: '✈' },
  { id: 'charleroi', destination_fr: 'Aéroport de Charleroi',      destination_en: 'Charleroi Airport',         destination_nl: 'Luchthaven Charleroi',         businessMin: 125, icon: '✈' },
  { id: 'lesquin',   destination_fr: 'Aéroport de Lesquin',        destination_en: 'Lesquin Airport',           destination_nl: 'Luchthaven Lesquin',           businessMin: 80,  icon: '✈' },
  { id: 'gares',     destination_fr: 'Gare de Lille',              destination_en: 'Lille Train Station',       destination_nl: 'Station Rijsel',               businessMin: 80,  icon: '🚉' },
];

const ICON_EDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
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

const ADV_KEYS = [
  { id: 'custom',      titleKey: 'adv_custom_title',      descKey: 'adv_custom_desc',      icon: ICON_EDIT  },
  { id: 'punctuality', titleKey: 'adv_punctuality_title', descKey: 'adv_punctuality_desc', icon: ICON_CLOCK },
  { id: 'support',     titleKey: 'adv_support_title',     descKey: 'adv_support_desc',     icon: ICON_USER  },
];

type Locale = 'fr' | 'en' | 'nl';

export default function TransfertAeroportPage() {
  const t = useTranslations('transfertAeroport');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;

  function getDestination(a: typeof AIRPORTS[0]): string {
    if (locale === 'en') return a.destination_en;
    if (locale === 'nl') return a.destination_nl;
    return a.destination_fr;
  }

  return (
    <div className={styles.page}>
      {/* Image de fond persistante sur toute la page */}
      <div className={styles.pageBg}>
        <Image
          src="/images/sections/transfert-aeroport.jpg"
          alt=""
          fill
          className={styles.pageBgImage}
          priority
          quality={85}
        />
        <div className={styles.pageBgOverlay} />
      </div>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroTag}>{t('tag')}</p>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSubtitle}>{t('subtitle')}</p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {t('badge_security')}
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
              {t('badge_price')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Forfaits ── */}
      <section className={styles.forfaits}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.forfaitsLayout}>
            {/* Avantages */}
            <div className={styles.advantages}>
              {ADV_KEYS.map((adv) => (
                <div key={adv.id} className={styles.advantageCard}>
                  <div className={styles.advantageIconCircle}>{adv.icon}</div>
                  <div>
                    <h3 className={styles.advantageTitle}>{t(adv.titleKey as any)}</h3>
                    <p className={styles.advantageDesc}>{t(adv.descKey as any)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Grille forfaits */}
            <div className={styles.airportsGrid}>
              {AIRPORTS.map((airport) => (
                <div key={airport.id} className={styles.airportCard}>
                  <p className={styles.cardFrom}>{t('from')}</p>
                  <span className={styles.cardArrow}>↓</span>
                  <p className={styles.cardDest}>{getDestination(airport)}</p>
                  <span className={styles.cardIcon}>{airport.icon}</span>
                  <p className={styles.cardFromLabel}>{t('from_label')}</p>
                  <p className={styles.cardPrice}>{airport.businessMin}<span className={styles.cardCurrency}>€</span></p>
                  <Link href={localePath('/reservation', locale)} className={styles.cardBtn}>{t('book_btn')}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
