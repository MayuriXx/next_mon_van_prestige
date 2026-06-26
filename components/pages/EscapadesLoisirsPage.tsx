'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useContenus } from '@/lib/hooks/useContenus';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './EscapadesLoisirsPage.module.css';

const PARKS = [
  {
    id: 'asterix',
    destination_fr: 'Parc Astérix',
    destination_en: 'Parc Astérix',
    destination_nl: 'Parc Astérix',
    minPrice: 240,
    icon: '🎡',
  },
  {
    id: 'disney',
    destination_fr: 'Disneyland Paris',
    destination_en: 'Disneyland Paris',
    destination_nl: 'Disneyland Paris',
    minPrice: 330,
    icon: '🏰',
  },
  {
    id: 'walibi',
    destination_fr: 'Walibi Belgium',
    destination_en: 'Walibi Belgium',
    destination_nl: 'Walibi Belgium',
    minPrice: 140,
    icon: '🎢',
  },
];

const SPORTS = [
  {
    id: 'lens',
    destination_fr: 'Stade Bollaert-Delelis (Lens)',
    destination_en: 'Bollaert-Delelis Stadium (Lens)',
    destination_nl: 'Stadion Bollaert-Delelis (Lens)',
    minPrice: 90,
    icon: '⚽',
  },
  {
    id: 'lille',
    destination_fr: 'Stade Pierre Mauroy (Lille)',
    destination_en: 'Pierre Mauroy Stadium (Lille)',
    destination_nl: 'Stadion Pierre Mauroy (Rijsel)',
    minPrice: 80,
    icon: '⚽',
  },
];

const ICON_SUN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const ICON_USERS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ADV_KEYS = [
  { id: 'relax',   titleKey: 'adv_relax_title',   descKey: 'adv_relax_desc',   icon: ICON_SUN   },
  { id: 'group',   titleKey: 'adv_group_title',   descKey: 'adv_group_desc',   icon: ICON_USERS },
  { id: 'flexible',titleKey: 'adv_flexible_title',descKey: 'adv_flexible_desc',icon: ICON_CLOCK },
];

type Locale = 'fr' | 'en' | 'nl';

export default function EscapadesLoisirsPage() {
  const t = useTranslations('escapadesLoisirs');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const contenus = useContenus('escapadesLoisirs', locale as 'fr' | 'en' | 'nl');

  function getDest(item: typeof PARKS[0] | typeof SPORTS[0]): string {
    if (locale === 'en') return item.destination_en;
    if (locale === 'nl') return item.destination_nl;
    return item.destination_fr;
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/escapades-loisirs.jpg"
            alt="Escapades Loisirs MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroContent}>
          <p className={styles.heroTag}>{t('tag')}</p>
          <h1 className={styles.heroTitle}>{contenus.get('title') || t('title')}</h1>
          <p className={styles.heroSubtitle}>{contenus.get('subtitle') || t('subtitle')}</p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {t('badge_relax')}
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {t('badge_group')}
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {t('badge_safety')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section Forfaits Loisirs ── */}
      <section className={styles.forfaits}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.forfaitsLayout}>
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

            {/* Destination cards */}
            <div className={styles.destinationsCol}>

              {/* Parcs d'attractions */}
              <div className={styles.categoryBlock}>
                <h3 className={styles.categoryTitle}>{t('parks_title')}</h3>
                <div className={styles.cardsGrid}>
                  {PARKS.map((park) => (
                    <div key={park.id} className={styles.destCard}>
                      <p className={styles.cardFrom}>{t('from')}</p>
                      <span className={styles.cardArrow}>↓</span>
                      <p className={styles.cardDest}>{getDest(park)}</p>
                      <span className={styles.cardIcon}>{park.icon}</span>
                      <p className={styles.cardFromLabel}>{t('from_label')}</p>
                      <p className={styles.cardPrice}>
                        {park.minPrice}<span className={styles.cardCurrency}>€</span>
                      </p>
                      <Link href={localePath('/reservation', locale)} className={styles.cardBtn}>
                        {t('book_btn')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Événements sportifs */}
              <div className={styles.categoryBlock}>
                <h3 className={styles.categoryTitle}>{t('sports_title')}</h3>
                <div className={styles.cardsGrid}>
                  {SPORTS.map((sport) => (
                    <div key={sport.id} className={styles.destCard}>
                      <p className={styles.cardFrom}>{t('from')}</p>
                      <span className={styles.cardArrow}>↓</span>
                      <p className={styles.cardDest}>{getDest(sport)}</p>
                      <span className={styles.cardIcon}>{sport.icon}</span>
                      <p className={styles.cardFromLabel}>{t('from_label')}</p>
                      <p className={styles.cardPrice}>
                        {sport.minPrice}<span className={styles.cardCurrency}>€</span>
                      </p>
                      <Link href={localePath('/reservation', locale)} className={styles.cardBtn}>
                        {t('book_btn')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  );
}

