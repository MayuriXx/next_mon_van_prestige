'use client';

import Link from 'next/link';
import styles from './Tarifs.module.css';
import { localePath, getLocaleFromPath } from '@/lib/utils/locale';

const TARIFS = [
  {
    id: 'orly',
    from: 'Valenciennes',
    to: 'Paris Orly',
    icon: '✈',
    price: '320',
    popular: false,
  },
  {
    id: 'cdg',
    from: 'Valenciennes',
    to: 'Paris Charles de Gaulle',
    icon: '✈',
    price: '260',
    popular: true,
  },
  {
    id: 'zaventem',
    from: 'Valenciennes',
    to: 'Bruxelles Zaventem',
    icon: '✈',
    price: '160',
    popular: false,
  },
  {
    id: 'charleroi',
    from: 'Valenciennes',
    to: 'Charleroi',
    icon: '✈',
    price: '125',
    popular: false,
  },
  {
    id: 'lesquin',
    from: 'Valenciennes',
    to: 'Lille Lesquin',
    icon: '✈',
    price: '80',
    popular: false,
  },
  {
    id: 'gares',
    from: 'Valenciennes',
    to: 'Lille Gares',
    icon: '🚉',
    price: '80',
    popular: true,
  },
];

export default function Tarifs() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>TRANSFERTS LES PLUS DEMANDÉS</h2>
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
                <span className={styles.from}>{tarif.from}</span>
                <span className={styles.arrow}>↓</span>
                <span className={styles.to}>{tarif.to}</span>
                <span className={styles.icon}>{tarif.icon}</span>
              </div>

              <div className={styles.divider} />

              <div className={styles.pricing}>
                <span className={styles.label}>À PARTIR DE</span>
                <span className={styles.price}>{tarif.price}€</span>
              </div>

              <Link href={localePath('/reservation', locale)} className={styles.cta}>
                Réserver
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
