'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SectionTitle from '@/components/ui/SectionTitle';
import { localePath, getLocaleFromPath } from '@/lib/utils/locale';
import styles from './TransfertAeroportPage.module.css';

interface Airport {
  id: string;
  name: string;
  destination: string;
  businessMin: number;
  vanMin: number;
  icon: string;
}

const AIRPORTS: Airport[] = [
  { id: 'cdg',      name: 'CDG',       destination: 'Paris Charles de Gaulle', businessMin: 300, vanMin: 390, icon: '✈' },
  { id: 'orly',     name: 'ORLY',      destination: 'Paris Orly',              businessMin: 360, vanMin: 420, icon: '✈' },
  { id: 'zaventem', name: 'ZAVENTEM',  destination: 'Bruxelles Zaventem',      businessMin: 190, vanMin: 235, icon: '✈' },
  { id: 'charleroi',name: 'CHARLEROI', destination: 'Charleroi',               businessMin: 145, vanMin: 180, icon: '✈' },
  { id: 'lesquin',  name: 'LESQUIN',   destination: 'Lille Lesquin',           businessMin: 90,  vanMin: 130, icon: '✈' },
  { id: 'gares',    name: 'GARES',     destination: 'Lille Gares',             businessMin: 90,  vanMin: 140, icon: '🚉' },
];

const ADVANTAGES = [
  { id: 'custom',      title: 'Service Sur-Mesure',      description: 'Adaptez votre transfert à vos besoins spécifiques : horaires flexibles, arrêts supplémentaires, assistance VIP.', icon: '🎯' },
  { id: 'punctuality', title: 'Ponctualité Garantie',    description: 'Suivi en temps réel de votre vol. Nous vous attendons dès votre arrivée, peu importe les retards.',               icon: '⏰' },
  { id: 'support',     title: 'Assistance 24/7',          description: 'Équipe dédiée disponible jour et nuit pour répondre à vos questions et résoudre tout problème.',                 icon: '📱' },
];

export default function TransfertAeroportPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [airports, setAirports] = useState<Airport[]>(AIRPORTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTarifs() {
      try {
        setAirports(AIRPORTS);
      } catch (error) {
        console.error('Erreur chargement tarifs:', error);
        setAirports(AIRPORTS);
      } finally {
        setLoading(false);
      }
    }
    loadTarifs();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/transfert-aeroport.jpg"
            alt="Transfert Aéroport"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className="container">
            <h1 className={styles.heroTitle}>Transfert Aéroport</h1>
            <p className={styles.heroSubtitle}>
              Service de transfert premium vers les plus grands aéroports d'Europe
            </p>
            <div className={styles.badges}>
              <div className={styles.badge}><span className={styles.badgeIcon}>🔒</span><span className={styles.badgeText}>Sécurité</span></div>
              <div className={styles.badge}><span className={styles.badgeIcon}>⏱️</span><span className={styles.badgeText}>Ponctualité</span></div>
              <div className={styles.badge}><span className={styles.badgeIcon}>💰</span><span className={styles.badgeText}>Meilleur Tarif</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages Section */}
      <section className={styles.advantages}>
        <div className="container">
          <SectionTitle title="Pourquoi Nous Choisir" />
          <div className={styles.advantagesGrid}>
            {ADVANTAGES.map((adv) => (
              <div key={adv.id} className={styles.advantageCard}>
                <div className={styles.advantageIcon}>{adv.icon}</div>
                <h3 className={styles.advantageTitle}>{adv.title}</h3>
                <p className={styles.advantageDescription}>{adv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Forfaits Section */}
      <section className={styles.tarifs}>
        <div className="container">
          <div className={styles.tarifHeader}>
            <div className={styles.separator} />
            <h2 className={styles.tarifTitle}>NOS FORFAITS</h2>
            <div className={styles.separator} />
          </div>
          {loading ? (
            <div className={styles.loading}>Chargement des tarifs...</div>
          ) : (
            <div className={styles.tarifGrid}>
              {airports.map((airport) => (
                <div key={airport.id} className={styles.tarifCard}>
                  <div className={styles.tarifIcon}>{airport.icon}</div>
                  <div className={styles.tarifRoute}>
                    <span className={styles.routeFrom}>Valenciennes</span>
                    <span className={styles.routeArrow}>→</span>
                    <span className={styles.routeTo}>{airport.destination}</span>
                  </div>
                  <div className={styles.tarifPricing}>
                    <div className={styles.priceType}>
                      <span className={styles.typeLabel}>Business</span>
                      <span className={styles.typePrice}>À partir de {airport.businessMin}€</span>
                    </div>
                    <div className={styles.priceType}>
                      <span className={styles.typeLabel}>Van</span>
                      <span className={styles.typePrice}>À partir de {airport.vanMin}€</span>
                    </div>
                  </div>
                  <Link href={localePath('/reservation', locale)} className={styles.tarifCta}>
                    Réserver →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
