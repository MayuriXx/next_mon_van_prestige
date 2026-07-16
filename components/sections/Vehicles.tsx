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
 *   They are the guaranteed minimum fare of each vehicle tier, read live from
 *   Firestore via useTariffs() (falls back to the static grid in
 *   lib/data/tariffs.ts → MINIMUM_FARES when Firestore is unavailable).
 *   This is the lowest amount the calculator can ever return for that vehicle,
 *   so the "from" figure is truthful. Editing a minimum fare in the admin panel
 *   updates this card automatically — no hardcoded price remains to keep in sync.
 */

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useTariffs } from '@/lib/hooks/useTariffs';
import type { VehicleType } from '@/lib/types/pricing';
import styles from './Vehicles.module.css';

const VEHICLES: { id: string; vehicleType: VehicleType; image: string; popular: boolean }[] = [
  {
    id: 'business',
    vehicleType: 'BUSINESS',
    image: '/images/vehicles/business.webp',
    popular: false,
  },
  {
    id: 'van',
    vehicleType: 'VAN',
    image: '/images/vehicles/van.webp',
    popular: false,
  },
];

export default function Vehicles() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('vehicles');
  const { tariffs } = useTariffs();

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
                    {t('priceFrom')} <strong>{tariffs.minimumFares[vehicle.vehicleType]}€</strong>
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
