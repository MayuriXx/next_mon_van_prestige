'use client';

/**
 * components/sections/Tarifs.tsx
 *
 * "Most requested transfers" pricing grid on the homepage.
 *
 * i18n (issue #87 / US-08, sub-task 08b):
 *   Route labels ("from"/"to"), section title, price label and CTA used to
 *   be hardcoded in French. They now come from messages/{locale}.json under
 *   `tarifs.routes.{routeId}.*` and `tarifs.*`, so the section is
 *   translated when switching locale (FR/EN/NL). City names are localized
 *   where there is a natural translation (e.g. "Bruxelles" -> "Brussels" /
 *   "Brussel"); "Valenciennes" stays the same across locales.
 *
 *   While touching this file, also fixed a `localePath` violation on the
 *   "Réserver" CTA (same pattern flagged for Vehicles.tsx in #87): it used
 *   a raw `href="/reservation"` instead of `localePath('/reservation',
 *   locale)`.
 *
 *   Price (`320`, `260`, ...) stays as static display data — same rationale
 *   as Vehicles.tsx.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './Tarifs.module.css';

const TARIFS = [
  { id: 'orly', icon: '✈', price: '320', popular: false },
  { id: 'cdg', icon: '✈', price: '260', popular: true },
  { id: 'zaventem', icon: '✈', price: '160', popular: false },
  { id: 'charleroi', icon: '✈', price: '125', popular: false },
  { id: 'lesquin', icon: '✈', price: '80', popular: false },
  { id: 'gares', icon: '🚉', price: '80', popular: true },
];

export default function Tarifs() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('tarifs');

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>{t('title')}</h2>
          <div className={styles.separator} />
        </div>

        <div className={styles.grid}>
          {TARIFS.map((tarif) => (
            <div
              key={tarif.id}
              className={`${styles.card} ${tarif.popular ? styles.cardPopular : ''}`}
            >
              {tarif.popular && (
                <div className={styles.popularBadge}>POPULAIRE</div>
              )}

              <div className={styles.route}>
                <span className={styles.from}>{t(`routes.${tarif.id}.from`)}</span>
                <span className={styles.arrow}>↓</span>
                <span className={styles.to}>{t(`routes.${tarif.id}.to`)}</span>
                <span className={styles.icon}>{tarif.icon}</span>
              </div>

              <div className={styles.divider} />

              <div className={styles.pricing}>
                <span className={styles.label}>{t('priceLabel')}</span>
                <span className={styles.price}>{tarif.price}€</span>
              </div>

              <Link href={localePath('/reservation', locale)} className={styles.cta}>
                {t('cta')}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
