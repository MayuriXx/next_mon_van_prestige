'use client';

import { useEffect, useState } from 'react';
import { getAllTarifs, type TransfertTarif } from '@/lib/firebase/tarifs';
import styles from './Tarifs.module.css';

export default function Tarifs() {
  const [tarifs, setTarifs] = useState<TransfertTarif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTarifs() {
      const data = await getAllTarifs();
      setTarifs(data);
      setLoading(false);
    }
    loadTarifs();
  }, []);

  if (loading) {
    return <section className={styles.section} />;
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>TRANSFERTS LES PLUS DEMANDÉS</h2>
        
        <div className={styles.grid}>
          {tarifs.map((tarif) => (
            <div key={tarif.id} className={styles.card}>
              <h3 className={styles.name}>{tarif.name}</h3>
              
              {tarif.business && (
                <div className={styles.pricing}>
                  <span className={styles.label}>Business</span>
                  <span className={styles.price}>{tarif.business}€</span>
                </div>
              )}
              
              {tarif.van && (
                <div className={styles.pricing}>
                  <span className={styles.label}>Van</span>
                  <span className={styles.price}>{tarif.van}€</span>
                </div>
              )}
              
              {tarif.hourly && (
                <div className={styles.pricing}>
                  <span className={styles.label}>À l'heure</span>
                  <span className={styles.price}>{tarif.hourly}€/h</span>
                </div>
              )}
              
              <button className={styles.cta}>Réserver</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
