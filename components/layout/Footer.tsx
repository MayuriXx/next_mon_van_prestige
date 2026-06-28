'use client';

/**
 * components/layout/Footer.tsx
 *
 * Public footer rendered on every page.
 *
 * Business purpose:
 *   Displays brand info, contact details (phone / WhatsApp / email / address),
 *   service links, site-map links, legal links, and accepted payment methods.
 *
 * Dynamic data (issue #63):
 *   Contact fields (phone, email, address) are fetched from Firestore
 *   `contenus/contact` via the `useContenus` hook.
 *   Firestore values act as **overrides** on top of the static fallbacks
 *   defined below.  When Mohammed updates these fields in the admin panel
 *   (/admin/contenus → Contact section) they are reflected on the next
 *   page load without a code deployment.
 *
 * WhatsApp link:
 *   Derived automatically from the phone field by stripping every non-digit
 *   character and prepending the international dialling prefix when missing
 *   (French numbers starting with 0 → replace leading 0 with 33).
 */

import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';
import { useContenus } from '@/lib/hooks/useContenus';

// ─── Static fallback values ─────────────────────────────────────────────────
// These are used when the Firestore document has no override for the field.
// Update them here if the real contact details change before Firestore is seeded.
const DEFAULT_PHONE   = '+33 6 00 00 00 00';
const DEFAULT_EMAIL   = 'contact@monvanprestige.fr';
const DEFAULT_ADDRESS = 'Valenciennes, Hauts-de-France';

// ─── Helpers ────────────────────────────────────────────────────────────────
/**
 * Converts a display phone number to a WhatsApp URL-compatible string.
 * Strips spaces, dots, dashes and parentheses.
 * Replaces a leading 0 with the French country code (33).
 *
 * Examples:
 *   '+33 6 12 34 56 78'  →  '33612345678'
 *   '06 12 34 56 78'     →  '33612345678'
 *   '+32 478 12 34 56'   →  '3247812345 6'  (Belgian number — left as-is)
 */
function phoneToWa(phone: string): string {
  // Remove all non-digit characters except the leading +
  const digits = phone.replace(/[^\d+]/g, '');
  // If starts with +33 or +3X → strip the +
  if (digits.startsWith('+')) return digits.slice(1);
  // If starts with 0 → French mobile: replace with 33
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  return digits;
}

// ─── Navigation data ────────────────────────────────────────────────────────
const SERVICES_LINKS = [
  { label: 'Transfert Aéroport',   href: '/services/transfert-aeroport' },
  { label: 'Transfert Simple',     href: '/services/transfert-simple' },
  { label: 'Mise à Disposition',   href: '/services/mise-a-disposition' },
  { label: 'Événements Spéciaux',  href: '/services/evenements-speciaux' },
  { label: 'Escapades & Loisirs',  href: '/services/escapades-loisirs' },
  { label: 'Déplacements Pro',     href: '/services/deplacements-professionnels' },
];

const SITE_LINKS = [
  { label: 'Accueil',     href: '/' },
  { label: 'Véhicules',   href: '/#vehicules' },
  { label: 'À Propos',    href: '/#a-propos' },
  { label: 'FAQ',         href: '/faq' },
  { label: 'Contact',     href: '/#contact' },
  { label: 'Réservation', href: '/reservation' },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function Footer() {
  const year = new Date().getFullYear();

  // Fetch contact overrides from Firestore.
  // Locale is irrelevant for contact fields (plain strings, not i18n objects).
  const { get } = useContenus('contact');

  // Resolve each field: prefer Firestore override, fall back to static default.
  const phone   = get('phone')   || DEFAULT_PHONE;
  const email   = get('email')   || DEFAULT_EMAIL;
  const address = get('address') || DEFAULT_ADDRESS;
  const waNumber = phoneToWa(phone);

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* Colonne 1 — Marque */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logoWrap}>
            <Image
              src="/images/ms_prestige_driver_logo.jpg"
              alt="MS Prestige Driver"
              width={72}
              height={72}
              sizes="72px"
              className={styles.logoImg}
            />
          </Link>
          <p className={styles.tagline}>
            <em>L&apos;excellence au service de votre mobilité</em>
          </p>
          <p className={styles.description}>
            Service VTC premium à Valenciennes et dans toute la région Hauts-de-France.
            Disponible 7j/7, 24h/24.
          </p>
        </div>

        {/* Colonne 2 — Contact */}
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Contact</h3>
          <ul className={styles.contactList}>
            <li>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className={styles.contactLink}>
                <span className={styles.contactIcon}>📞</span>
                {phone}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${waNumber}`}
                className={styles.contactLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.contactIcon}>💬</span>
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className={styles.contactLink}>
                <span className={styles.contactIcon}>✉️</span>
                {email}
              </a>
            </li>
            <li>
              <span className={styles.contactLink}>
                <span className={styles.contactIcon}>📍</span>
                {address}
              </span>
            </li>
          </ul>
        </div>

        {/* Colonne 3 — Services */}
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Nos Services</h3>
          <ul className={styles.linkList}>
            {SERVICES_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.footerLink}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 4 — Plan du site */}
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Plan du site</h3>
          <ul className={styles.linkList}>
            {SITE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.footerLink}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Séparateur doré */}
      <div className={styles.divider} />

      {/* Bottom bar */}
      <div className={`container ${styles.bottom}`}>
        <p className={styles.copyright}>
          © {year} MS Prestige Driver — Mon Van Prestige. Tous droits réservés.
        </p>
        <div className={styles.legal}>
          <Link href="/mentions-legales" className={styles.legalLink}>Mentions légales</Link>
          <span className={styles.legalSep}>·</span>
          <Link href="/cgv" className={styles.legalLink}>CGV</Link>
        </div>
        <div className={styles.payments}>
          <span className={styles.payLabel}>Paiements acceptés</span>
          <span className={styles.payBadge}>CB</span>
          <span className={styles.payBadge}>Visa</span>
          <span className={styles.payBadge}>MC</span>
          <span className={styles.payBadge}>Virement</span>
        </div>
      </div>
    </footer>
  );
}
