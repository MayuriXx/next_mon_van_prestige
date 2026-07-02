'use client';

/**
 * components/sections/Vehicles.tsx
 *
 * "Our vehicles" grid on the homepage (Business / Van cards).
 *
 * i18n (issue #87 / US-08, sub-task 08b):
 *   Vehicle name/models/badges/CTA/price prefix used to be hardcoded in
 *   French. They now come from messages/{locale}.json under
 *   `vehicles.items.{vehicleId}.*` and `vehicles.*`, so the section is
 *   translated when switching locale (FR/EN/NL).
 *
 *   Also fixes a localePath violation flagged in #87: the "Réserver" CTA
 *   used a raw `href="/reservation"` instead of `localePath('/reservation',
 *   locale)`, so it always linked to the French route regardless of the
 *   active locale.
 *
 *   Prices are the "from" (à partir de) teaser figures on each vehicle card.
 *   They stay static display data (not fetched from Firestore), but as of the
 *   2026 tariff-consistency pass they are aligned to the guaranteed minimum
 *   fare of each vehicle tier in the official grid
 *   (lib/data/tariffs.ts → MINIMUM_FARES): BUSINESS 22 €, VAN 45 €.
 *   This is the lowest amount the calculator can ever return for that vehicle,
 *   so the "from" figure is truthful. Keep in sync with MINIMUM_FARES.
 */

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './Vehicles.module.css';

const VEHICLES = [
  {
    id: 'business',
    price: '22',
    image: '/images/vehicles/business.webp',
    popular: false,
  },
  {
    id: 'van',
    price: '45',
    image: '/images/vehicles/van.webp',
    popular: false,
  },
];

export default function Vehicles() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('vehicles');

  return (
    <section className={styles.section} id="vehicules">
      <div className="container">
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>{t('title')}</h2>
          <div className={styles.separator} />
        </div>

        <div className={styles.grid}>
          {VEHICLES.map((vehicle) => {
            const name = t(`items.${vehicle.id}.name`);
            const models = t.raw(`items.${vehicle.id}.models`) as string[];
            const badges = t.raw(`items.${vehicle.id}.badges`) as string[];

            return (
              <div
                key={vehicle.id}
                className={`${styles.card} ${vehicle.popular ? styles.cardPopular : ''}`}
              >
                {vehicle.popular && (
                  <div className={styles.popularBadge}>POPULAIRE</div>
                )}

                <div className={styles.imageWrapper}>
                  <Image
                    src={vehicle.image}
                    alt={name}
                    fill
                    /**
                     * Vehicle cards are ~50vw on desktop (2-col grid), 100vw on mobile.
                     * sizes prevents the browser from downloading a full-width image
                     * for a half-width card, improving LCP and bandwidth.
                     */
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={styles.image}
                  />
                </div>

                <div className={styles.content}>
                  <h3 className={styles.vehicleName}>{name}</h3>

                  <ul className={styles.models}>
                    {models.map((model, i) => (
                      <li key={i} className={styles.model}>{model}</li>
                    ))}
                  </ul>

                  <div className={styles.badges}>
                    {badges.map((badge, i) => (
                      <span key={i} className={styles.badge}>{badge}</span>
                    ))}
                  </div>

                  <p className={styles.price}>
                    {t('priceFrom')} <strong>{vehicle.price}€</strong>
                  </p>

                  <Link href={localePath('/reservation', locale)} className={styles.cta}>
                    {t('cta')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
