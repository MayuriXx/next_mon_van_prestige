'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './ReservationSuccessPage.module.css';

const ICON_CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ICON_PHONE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className={styles.contactIcon}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function ReservationSuccessPage() {
  const t        = useTranslations('reservationSuccess');
  const pathname = usePathname();
  const locale   = getLocaleFromPath(pathname);

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        {/* Icon */}
        <div className={styles.iconWrap}>{ICON_CHECK}</div>

        {/* Heading */}
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>

        {/* Summary points */}
        <ul className={styles.list}>
          <li className={styles.listItem}>
            <span className={styles.dot} />
            {t('point_email')}
          </li>
          <li className={styles.listItem}>
            <span className={styles.dot} />
            {t('point_balance')}
          </li>
          <li className={styles.listItem}>
            <span className={styles.dot} />
            {t('point_contact')}
          </li>
        </ul>

        {/* Separator */}
        <div className={styles.sep} />

        {/* Contact block */}
        <div className={styles.contact}>
          <p className={styles.contactLabel}>{t('contact_label')}</p>
          <a href="tel:+33783698460" className={styles.contactLink}>
            {ICON_PHONE}
            07 83 69 84 60
          </a>
        </div>

        {/* CTA */}
        <Link href={localePath('/', locale)} className={styles.cta}>
          {t('cta_home')}
        </Link>
      </div>
    </main>
  );
}
