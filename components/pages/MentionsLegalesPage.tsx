'use client';

/**
 * components/pages/MentionsLegalesPage.tsx
 *
 * Static legal notice page ("Mentions légales") — a French legal requirement.
 *
 * Business purpose:
 *   Displays the legally required publisher and hosting information for the
 *   MS Prestige Driver website. This content is a regulatory obligation under
 *   French law (Loi n°2004-575 du 21 juin 2004, "LCEN") and is always shown
 *   in French regardless of the selected locale.
 *
 * Content source: `Mention_legales_MS_Prestige_Driver.docx` provided by Mohammed.
 *
 * NOTE: The hosting provider listed is Hostinger (Mohammed's original choice).
 *       The actual site is currently hosted on Firebase Hosting — Mohammed may
 *       want to update this section if Hostinger is no longer used.
 */

import styles from './LegalPage.module.css';

export default function MentionsLegalesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Mentions Légales</h1>
        <p className={styles.subtitle}>MS Prestige Driver</p>
        <hr className={styles.separator} />

        {/* Hébergeur */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Hébergeur</h2>
          <address className={styles.address}>
            HOSTINGER INTERNATIONAL LTD<br />
            61 Lordou Vironos Street<br />
            6023 Larnaca, Chypre
          </address>
          <p className={styles.text}>
            Joignable via :{' '}
            <a
              href="https://www.hostinger.fr/contact"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--gold, #C9A84C)' }}
            >
              https://www.hostinger.fr/contact
            </a>
          </p>
        </section>

        {/* Éditeur */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Éditeur</h2>
          <p className={styles.text}>
            <span className={styles.bold}>Nom – Prénom :</span> SAHLI MOHAMED
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>Forme juridique :</span> EI – Entreprise individuelle
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>Enseigne :</span> MSPRESTIGEDRIVER
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>Adresse :</span> 92 RUE D&apos;ESTREUX, 59264 ONNAING
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>Téléphone :</span>{' '}
            <a href="tel:+33783698460" style={{ color: 'var(--gold, #C9A84C)' }}>
              +33 7 83 69 84 60
            </a>
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>E-mail :</span>{' '}
            <a href="mailto:contact@msprestigedriver.fr" style={{ color: 'var(--gold, #C9A84C)' }}>
              contact@msprestigedriver.fr
            </a>
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>Directeur de publication :</span> SAHLI MOHAMED
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>SIREN :</span> 102209848
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>SIRET :</span> 10220984800013
          </p>
          <p className={styles.text}>
            <span className={styles.bold}>N° TVA :</span> FR43102209848
          </p>
        </section>
      </div>
    </main>
  );
}
