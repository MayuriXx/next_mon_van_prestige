'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './TransfertAeroportPage.module.css';

interface Airport {
  id: string;
  destination: string;
  label: string;
  businessMin: number;
  icon: string;
}

const AIRPORTS: Airport[] = [
  { id: 'cdg',       destination: 'Aéroport Charles de Gaulle', label: 'CDG',       businessMin: 260, icon: '✈' },
  { id: 'orly',      destination: 'Aéroport d\'Orly',           label: 'ORLY',      businessMin: 320, icon: '✈' },
  { id: 'zaventem',  destination: 'Aéroport Brussels Zaventem', label: 'ZAVENTEM',  businessMin: 160, icon: '✈' },
  { id: 'charleroi', destination: 'Aéroport de Charleroi',      label: 'CHARLEROI', businessMin: 125, icon: '✈' },
  { id: 'lesquin',   destination: 'Aéroport de Lesquin',        label: 'LESQUIN',   businessMin: 80,  icon: '✈' },
  { id: 'gares',     destination: 'Gare de Lille',              label: 'GARE',      businessMin: 80,  icon: '🚉' },
];

const ADVANTAGES = [
  {
    id: 'custom',
    title: 'Service sur-mesure',
    description: 'Vos envies, votre trajet. Profitez d\'une expérience de transport inégalée conçue selon vos préférences.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'punctuality',
    title: 'Ponctualité garantie',
    description: 'Nos chauffeurs arrivent toujours à l\'avance pour vous assurer une tranquillité d\'esprit totale et un départ serein.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'support',
    title: 'Assistance 24/7',
    description: 'Votre tranquillité d\'esprit est notre engagement. Notre équipe est à votre service 24h/24.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function TransfertAeroportPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/transfert-aeroport.jpg"
            alt="Transfert Aéroport MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroTag}>AÉROPORTS &amp; GARES</p>
          <h1 className={styles.heroTitle}>
            Liaisons privées vers tous les<br />
            aéroports et gares
          </h1>
          <p className={styles.heroSubtitle}>
            Profitez d&apos;un transfert sans stress vers ou depuis les aéroports
            (CDG, Orly, Lille, Bruxelles) et gares. Tarifs fixes et transparents.
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Sécurité
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Ponctualité
            </span>
            <span className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Meilleur tarif garanti
            </span>
          </div>
        </div>
      </section>

      {/* ── Forfaits ── */}
      <section className={styles.forfaits}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Nos Forfaits Aéroports</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.forfaitsLayout}>
            {/* Avantages */}
            <div className={styles.advantages}>
              {ADVANTAGES.map((adv) => (
                <div key={adv.id} className={styles.advantageItem}>
                  <div className={styles.advantageIconWrap}>{adv.icon}</div>
                  <div>
                    <h3 className={styles.advantageTitle}>{adv.title}</h3>
                    <p className={styles.advantageDesc}>{adv.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Grille forfaits */}
            <div className={styles.airportsGrid}>
              {AIRPORTS.map((airport) => (
                <div key={airport.id} className={styles.airportCard}>
                  <p className={styles.cardFrom}>Valenciennes</p>
                  <span className={styles.cardArrow}>↓</span>
                  <p className={styles.cardDest}>{airport.destination}</p>
                  <span className={styles.cardIcon}>{airport.icon}</span>
                  <p className={styles.cardFromLabel}>À PARTIR DE</p>
                  <p className={styles.cardPrice}>{airport.businessMin}<span className={styles.cardCurrency}>€</span></p>
                  <Link href="/reservation" className={styles.cardBtn}>Réserver</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
