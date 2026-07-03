'use client';

/**
 * components/pages/MentionsLegalesPage.tsx
 *
 * Dynamic legal notice page ("Mentions légales") — a French legal requirement.
 *
 * Business purpose:
 *   Displays the legally required publisher and hosting information for the
 *   MS Prestige Driver website. This content is a regulatory obligation under
 *   French law (Loi n°2004-575 du 21 juin 2004, "LCEN") and is always shown
 *   in French regardless of the selected locale.
 *
 * Data strategy:
 *   All fields are fetched from Firestore `contenus/mentionsLegales` via the
 *   useContenus hook. If a field is empty or missing, the component falls back
 *   to the static default defined below. Mohammed can update any field from
 *   the admin panel (/admin/contenus → Mentions Légales section).
 *
 * Design:
 *   Follows the same visual pattern as FaqPage: background image overlay,
 *   hero title with gold separator, card-based content sections.
 *
 * Content source: `Mention_legales_MS_Prestige_Driver.docx` provided by Mohammed.
 */

import { useContenus } from '@/lib/hooks/useContenus';
import styles from './LegalPage.module.css';

// ─── Static fallback values ─────────────────────────────────────────────────
// Used when Firestore has no override. Update here if defaults change.
const DEFAULTS: Record<string, string> = {
  hebergeur_nom:      'HOSTINGER INTERNATIONAL LTD',
  hebergeur_adresse:  '61 Lordou Vironos Street, 6023 Larnaca, Chypre',
  hebergeur_contact:  'https://www.hostinger.fr/contact',
  editeur_nom:        'SAHLI MOHAMED',
  editeur_forme:      'EI – Entreprise individuelle',
  editeur_enseigne:   'MSPRESTIGEDRIVER',
  editeur_adresse:    '92 Rue d\'Estreux, 59264 Onnaing, France',
  editeur_tel:        '+33 7 83 69 84 60',
  editeur_email:      'contact@msprestigedriver.fr',
  editeur_directeur:  'SAHLI MOHAMED',
  editeur_siren:      '102 209 848',
  editeur_siret:      '102 209 848 00013',
  editeur_tva:        'FR43 102 209 848',
};

export default function MentionsLegalesPage() {
  // Fetch overrides from Firestore (contenus/mentionsLegales).
  // Fields are plain strings (no i18n — legal content is always in French).
  const { get } = useContenus('mentionsLegales');

  /** Return Firestore override if non-empty, else static default. */
  function field(key: string): string {
    return get(key) || DEFAULTS[key] || '';
  }

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
          <p className={styles.text}>
            <span className={styles.bold}>{field('hebergeur_nom')}</span>
          </p>
          <p className={styles.text}>{field('hebergeur_adresse')}</p>
          <p className={styles.text}>
            Joignable via :{' '}
            <a
              href={field('hebergeur_contact')}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {field('hebergeur_contact')}
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
              {field('editeur_nom')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Forme juridique</span><br />
              {field('editeur_forme')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Enseigne</span><br />
              {field('editeur_enseigne')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Directeur de publication</span><br />
              {field('editeur_directeur')}
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
              {field('editeur_adresse')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>Téléphone</span><br />
              <a href={`tel:${field('editeur_tel').replace(/\s/g, '')}`} className={styles.link}>
                {field('editeur_tel')}
              </a>
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>E-mail</span><br />
              <a href={`mailto:${field('editeur_email')}`} className={styles.link}>
                {field('editeur_email')}
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
              {field('editeur_siren')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>SIRET</span><br />
              {field('editeur_siret')}
            </p>
            <p className={styles.infoItem}>
              <span className={styles.bold}>N° TVA intracommunautaire</span><br />
              {field('editeur_tva')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
