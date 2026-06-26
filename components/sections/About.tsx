'use client';

import { usePathname } from 'next/navigation';
import { getLocaleFromPath } from '@/lib/utils/locale';
import { useContenus } from '@/lib/hooks/useContenus';
import styles from './About.module.css';

export default function About() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as 'fr' | 'en' | 'nl';
  const contenus = useContenus('about', locale);

  // Default texts (static fallback when Firestore has no override)
  const defaultTitle = 'À PROPOS';
  const defaultWhoText1 =
    "Passionné par l'automobile et le service d'excellence, j'ai créé MON VAN PRESTIGE " +
    'pour offrir bien plus qu'un simple trajet. Mon objectif est de vous apporter une ' +
    'sérénité totale lors de vos déplacements.';
  const defaultWhoText2 =
    "Fort d'une expérience significative dans le transport de personnes, je m'engage " +
    'personnellement à garantir votre satisfaction par une conduite souple, une ' +
    'discrétion absolue et une disponibilité sans faille.';

  return (
    <section className={styles.section} id="a-propos">
      <div className={styles.overlay} />

      <div className={styles.inner}>
        {/* Titre */}
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>
            {contenus.get('title') || defaultTitle}
          </h2>
          <div className={styles.separator} />
        </div>

        {/* Carte QUI SUIS-JE */}
        <div className={styles.whoCard}>
          <h3 className={styles.whoTitle}>QUI SUIS-JE ?</h3>
          {contenus.get('text') ? (
            /* Firestore override: single rich text block */
            <p className={styles.whoText}>{contenus.get('text')}</p>
          ) : (
            /* Static fallback: two paragraphs */
            <>
              <p className={styles.whoText}>{defaultWhoText1}</p>
              <p className={styles.whoText}>{defaultWhoText2}</p>
            </>
          )}
        </div>

        {/* 3 cartes valeurs */}
        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>NOS VALEURS</h4>
            <div className={styles.cardSeparator} />
            <p className={styles.cardText}>
              Nous plaçons l'humain au cœur de notre service. Chaque trajet repose sur
              des principes essentiels : intégrité, discrétion, sens du service et respect
              total de nos clients. Nous nous engageons à offrir une expérience fondée sur
              la confiance, l'attention aux détails et une conduite responsable, pour que
              chaque déplacement se fasse en toute tranquillité.
            </p>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>NOTRE MISSION</h4>
            <div className={styles.cardSeparator} />
            <p className={styles.cardText}>
              Notre objectif est simple : vous transporter en toute sécurité, avec
              confort et ponctualité, quelle que soit votre destination. À chaque course,
              nous mettons tout en œuvre pour garantir un service fiable et soigné, afin
              que vos déplacements deviennent un moment agréable, sans stress ni imprévu.
            </p>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>NOTRE VISION</h4>
            <div className={styles.cardSeparator} />
            <p className={styles.cardText}>
              Incarner l'excellence du transport de personnes à Valenciennes et dans les
              Hauts-de-France. Par Mon Van Prestige, nous réinventons le VTC premium en
              tant que véritable alternative supérieure aux taxis : une promesse de
              service distingué, de confort inégalé, et de professionnalisme irréprochable.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
