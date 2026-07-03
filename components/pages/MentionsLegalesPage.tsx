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
 * Design:
 *   Follows the same visual pattern as FaqPage: background image overlay,
 *   hero title with gold separator, card-based content sections, and a
 *   bottom CTA linking to the contact section.
 *
 * Content source: `Mention_legales_MS_Prestige_Driver.docx` provided by Mohammed.
 *
 * NOTE: The hosting provider listed is Hostinger (Mohammed's original choice).
 *       The site will be migrated to Hostinger hosting in the future.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './LegalPage.module.css';

export default function MentionsLegalesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  return (
    <div className={styles.wrapper}>
      {/* ── Background image overlay ── */}
      <div className={styles.bgOverlay} aria-hidden />

      {/* ── Hero title ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Mentions Légales</h1>
        <p className={styles.heroSubtitle}>MS Prestige Driver – Service de transport privé avec chauffeur</p>
        <div className={styles.separator} aria-hidden />
      </section>

      {/* ── Content cards ── */}
      <section className={styles.contentSection}>
        {/* Hébergeur */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🌐</span>
            Hébergeur
          </h2>
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
              className={styles.link}
            >
              https://www.hostinger.fr/contact
            </a>
          </p>
        </div>

        {/* Éditeur */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🏢</span>
            Éditeur
          </h2>
          <div className={styles.infoGrid}>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Nom – Prénom</span><br />
              SAHLI MOHAMED
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Forme juridique</span><br />
              EI – Entreprise individuelle
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Enseigne</span><br />
              MSPRESTIGEDRIVER
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Directeur de publication</span><br />
              SAHLI MOHAMED
            </p>
          </div>
        </div>

        {/* Coordonnées */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📍</span>
            Coordonnées
          </h2>
          <div className={styles.infoGrid}>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Adresse</span><br />
              92 Rue d&apos;Estreux<br />
              59264 Onnaing, France
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Téléphone</span><br />
              <a href="tel:+33783698460" className={styles.link}>
                +33 7 83 69 84 60
              </a>
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>E-mail</span><br />
              <a href="mailto:contact@msprestigedriver.fr" className={styles.link}>
                contact@msprestigedriver.fr
              </a>
            </p>
          </div>
        </div>

        {/* Immatriculation */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📋</span>
            Immatriculation
          </h2>
          <div className={styles.infoGrid}>
            <p className={styles.infoItem}>
              <span className={styles.bold}>SIREN</span><br />
              102 209 848
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>SIRET</span><br />
              102 209 848 00013
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>N° TVA intracommunautaire</span><br />
              FR43 102 209 848
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaText}>
          Une question ? N&apos;hésitez pas à nous contacter.
        </p>
        <Link href={localePath('/#contact', locale)} className={styles.ctaBtn}>
          Nous contacter
        </Link>
      </section>
    </div>
  );
}
