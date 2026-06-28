'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './Vehicles.module.css';

const VEHICLES = [
  {
    id: 'business',
    name: 'BUSINESS',
    models: ['Tesla Model S', 'Mercedes Classe E', 'ou équivalent'],
    badges: ['3 places', '3 bagages', 'WiFi'],
    price: '25',
    image: '/images/vehicles/business.webp',
    popular: false,
  },
  {
    id: 'van',
    name: 'VAN',
    models: ['Mercedes Class V', 'Mercedes Vito', 'ou équivalent'],
    badges: ['7 places', '7 bagages', 'WiFi'],
    price: '45',
    image: '/images/vehicles/van.webp',
    popular: false,
  },
];

export default function Vehicles() {
  return (
    <section className={styles.section} id="vehicules">
      <div className="container">
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>NOS VÉHICULES</h2>
          <div className={styles.separator} />
        </div>

        <div className={styles.grid}>
          {VEHICLES.map((vehicle) => (
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
                  alt={vehicle.name}
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
                <h3 className={styles.vehicleName}>{vehicle.name}</h3>

                <ul className={styles.models}>
                  {vehicle.models.map((model, i) => (
                    <li key={i} className={styles.model}>{model}</li>
                  ))}
                </ul>

                <div className={styles.badges}>
                  {vehicle.badges.map((badge, i) => (
                    <span key={i} className={styles.badge}>{badge}</span>
                  ))}
                </div>

                <p className={styles.price}>
                  À partir de <strong>{vehicle.price}€</strong>
                </p>

                <Link href="/reservation" className={styles.cta}>
                  Réserver
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
