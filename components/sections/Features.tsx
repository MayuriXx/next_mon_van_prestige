'use client';

import styles from './Features.module.css';

const FEATURES = [
  {
    id: 'disponibilite',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    ),
    title: '7/7',
    description: 'Disponibilité\ndu lundi au dimanche',
  },
  {
    id: 'chauffeurs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    title: 'Chauffeurs expérimentés',
    description: 'Professionnels qualifiés\nà votre service',
  },
  {
    id: 'tarif',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
      </svg>
    ),
    title: 'Tarif personnalisé',
    description: 'Devis gratuit en fonction\nde votre trajet',
  },
  {
    id: 'accueil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title: 'Accueil personnalisé',
    description: 'Prise en charge\nsur mesure',
  },
  {
    id: 'chargeur',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="7" y="2" width="10" height="18" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
        <path d="M12 6v4M10 8h4" strokeLinecap="round" />
      </svg>
    ),
    title: 'Chargeur',
    description: 'Rechargez votre\ntéléphone à bord',
  },
  {
    id: 'rafraichissement',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2h8l1 8H7L8 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10c0 6 2 10 5 10s5-4 5-10" strokeLinecap="round" />
        <path d="M10 2v3M14 2v3" strokeLinecap="round" />
      </svg>
    ),
    title: 'Rafraîchissement',
    description: 'Boissons fraîches\noffertes',
  },
];

export default function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {FEATURES.map((feature) => (
            <div key={feature.id} className={styles.item}>
              <div className={styles.icon}>{feature.icon}</div>
              <h3 className={styles.title}>{feature.title}</h3>
              <p className={styles.description}>
                {feature.description.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < feature.description.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
