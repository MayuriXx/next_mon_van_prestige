import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

const SERVICES_LINKS = [
  { label: 'Transfert Aéroport', href: '/services/transfert-aeroport' },
  { label: 'Transfert Simple',   href: '/services/transfert-simple' },
  { label: 'Mise à Disposition', href: '/services/mise-a-disposition' },
  { label: 'Événements Spéciaux', href: '/services/evenements-speciaux' },
  { label: 'Escapades & Loisirs', href: '/services/escapades-loisirs' },
  { label: 'Déplacements Pro',   href: '/services/deplacements-professionnels' },
];

const SITE_LINKS = [
  { label: 'Accueil',      href: '/' },
  { label: 'Véhicules',    href: '/#vehicules' },
  { label: 'À Propos',     href: '/#a-propos' },
  { label: 'FAQ',          href: '/faq' },
  { label: 'Contact',      href: '/#contact' },
  { label: 'Réservation',  href: '/reservation' },
];

export default function Footer() {
  const year = new Date().getFullYear();

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
              <a href="tel:+33600000000" className={styles.contactLink}>
                <span className={styles.contactIcon}>📞</span>
                +33 6 00 00 00 00
              </a>
            </li>
            <li>
              <a href="https://wa.me/33600000000" className={styles.contactLink} target="_blank" rel="noopener noreferrer">
                <span className={styles.contactIcon}>💬</span>
                WhatsApp
              </a>
            </li>
            <li>
              <a href="mailto:contact@monvanprestige.fr" className={styles.contactLink}>
                <span className={styles.contactIcon}>✉️</span>
                contact@monvanprestige.fr
              </a>
            </li>
            <li>
              <span className={styles.contactLink}>
                <span className={styles.contactIcon}>📍</span>
                Valenciennes, Hauts-de-France
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
