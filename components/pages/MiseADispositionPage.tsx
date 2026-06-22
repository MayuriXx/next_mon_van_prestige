'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { localePath, getLocaleFromPath } from '@/lib/utils/locale';
import styles from './MiseADispositionPage.module.css';

// ── SVG icons ──────────────────────────────────────────────────
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const ICON_WAIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 1-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ICON_EXTEND = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const ADVANTAGES = [
  { id: 'dedicated',  titleKey: 'adv_dedicated_title',  descKey: 'adv_dedicated_desc',  icon: ICON_USER   },
  { id: 'flexible',   titleKey: 'adv_flexible_title',   descKey: 'adv_flexible_desc',   icon: ICON_CLOCK  },
  { id: 'wait',       titleKey: 'adv_wait_title',       descKey: 'adv_wait_desc',        icon: ICON_WAIT   },
  { id: 'extension',  titleKey: 'adv_extension_title',  descKey: 'adv_extension_desc',  icon: ICON_EXTEND },
];

export default function MiseADispositionPage() {
  const t = useTranslations('miseADisposition');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  return (
    <>
      {/* ── Hero : image de fond + overlay + split content ── */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/mise-a-disposition.jpg"
            alt="Mise à disposition — MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroContent}>
          {/* Left : copy */}
          <div className={styles.heroCopy}>
            <p className={styles.heroTag}>{t('tag')}</p>
            <h1 className={styles.heroTitle}>{t('title')}</h1>
            <p className={styles.heroSubtitle}>{t('subtitle')}</p>
            <p className={styles.heroNote}>{t('note')}</p>
            <div className={styles.badges}>
              <span className={styles.badge}>
                <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {t('badge_flexible')}
              </span>
              <span className={styles.badge}>
                <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {t('badge_dedicated')}
              </span>
              <span className={styles.badge}>
                <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {t('badge_security')}
              </span>
            </div>
          </div>

          {/* Right : booking form card */}
          <div className={styles.heroForm}>
            <h2 className={styles.formTitle}>{t('form_title')}</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('form_date')}</label>
                <div className={styles.inputWrap}>
                  <input type="date" className={styles.formInput} />
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('form_time')}</label>
                <div className={styles.inputWrap}>
                  <input type="time" className={styles.formInput} />
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <input type="text" placeholder={t('form_pickup')} className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <input type="text" placeholder={t('form_dropoff')} className={styles.formInput} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('form_duration')}</label>
              <select className={styles.formSelect}>
                <option value="2">2 {t('hours')}</option>
                <option value="3">3 {t('hours')}</option>
                <option value="4">4 {t('hours')}</option>
                <option value="5">5 {t('hours')}</option>
                <option value="6">6 {t('hours')}</option>
                <option value="8">8 {t('hours')}</option>
                <option value="10">10 {t('hours')}</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('form_passengers')}</label>
              <select className={styles.formSelect}>
                <option value="1">1 {t('passenger')}</option>
                <option value="2">2 {t('passengers')}</option>
                <option value="3">3 {t('passengers')}</option>
                <option value="4">4 {t('passengers')}</option>
                <option value="5">5 {t('passengers')}</option>
                <option value="6">6 {t('passengers')}</option>
                <option value="7">7 {t('passengers')}</option>
              </select>
            </div>

            <Link href={localePath('/reservation', locale)} className={styles.formBtn}>
              {t('form_cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section avantages ── */}
      <section className={styles.advantages}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('section_title')}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.advantagesGrid}>
            {ADVANTAGES.map((adv) => (
              <div key={adv.id} className={styles.advantageCard}>
                <div className={styles.advantageIconWrap}>{adv.icon}</div>
                <div>
                  <h3 className={styles.advantageTitle}>{t(adv.titleKey as any)}</h3>
                  <p className={styles.advantageDesc}>{t(adv.descKey as any)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
