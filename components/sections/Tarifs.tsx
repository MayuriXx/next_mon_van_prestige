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
 *   Prices are the "from" (à partir de) teaser figures shown on the cards.
 *   They are intentionally static display data (not fetched from Firestore),
 *   but as of the 2026 tariff-consistency pass they are aligned to the
 *   BUSINESS minimum of each airport package in the official grid
 *   (lib/data/tariffs.ts → AIRPORT_PRICES[dest].BUSINESS.min). Business is the
 *   cheapest vehicle tier for every destination, so this is a truthful floor:
 *   a visitor will never be quoted less than the advertised "from" price in
 *   the calculator. Keep these in sync whenever AIRPORT_PRICES changes.
 *
 *     CDG 300 · ORLY 360 · ZAVENTEM 190 · CHARLEROI 145 · LESQUIN 90 · GARES 90
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './Tarifs.module.css';

const TARIFS = [
  { id: 'orly', icon: '✈', price: '360', popular: false },
  { id: 'cdg', icon: '✈', price: '300', popular: true },
  { id: 'zaventem', icon: '✈', price: '190', popular: false },
  { id: 'charleroi', icon: '✈', price: '145', popular: false },
  { id: 'lesquin', icon: '✈', price: '90', popular: false },
  { id: 'gares', icon: '🚉', price: '90', popular: true },
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
