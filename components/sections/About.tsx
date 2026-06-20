'use client';

import styles from './About.module.css';

const VALUES = [
  { icon: '⭐', title: 'Excellence', desc: 'Service impeccable et professionnel' },
  { icon: '🤝', title: 'Discrétion', desc: 'Confidentialité et respect garantis' },
  { icon: '✓', title: 'Fiabilité', desc: 'Ponctualité et sérieux assurés' },
];

export default function About() {
  return (
    <section className={styles.section} id="a-propos">
      <div className="container">
        <h2 className={styles.title}>POURQUOI NOUS ?</h2>
        
        <div className={styles.content}>
          <p className={styles.description}>
            MS Prestige Driver est le leader incontournable du transport VTC de luxe 
            à Valenciennes. Depuis plus de 15 ans, nous offrons un service d'excellence 
            avec des véhicules haut de gamme, des chauffeurs professionnels et une 
            discrétion irréprochable.
          </p>
        </div>

        <div className={styles.valuesGrid}>
          {VALUES.map((value, idx) => (
            <div key={idx} className={styles.valueCard}>
              <span className={styles.icon}>{value.icon}</span>
              <h3 className={styles.valueName}>{value.title}</h3>
              <p className={styles.valueDesc}>{value.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
