'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const SERVICES = [
  { label: 'Transfert Aéroport',          href: '/services/transfert-aeroport' },
  { label: 'Transfert Simple',             href: '/services/transfert-simple' },
  { label: 'Mise à Disposition',           href: '/services/mise-a-disposition' },
  { label: 'Événements Spéciaux',          href: '/services/evenements-speciaux' },
  { label: 'Escapades & Loisirs',          href: '/services/escapades-loisirs' },
  { label: 'Déplacements Professionnels',  href: '/services/deplacements-professionnels' },
];

const LANGUAGES = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
];

const LOCALES = ['fr', 'en', 'nl'];

function getLocaleFromPath(pathname: string): string {
  const seg = pathname.split('/')[1];
  return LOCALES.includes(seg) ? seg : 'fr';
}

function localePath(href: string, locale: string): string {
  // fr n'a pas de préfixe (localePrefix: 'as-needed')
  if (locale === 'fr') return href;
  return `/${locale}${href}`;
}

export default function Navbar() {
  const pathname = usePathname(); // ex: /fr/services/transfert-aeroport
  const locale = getLocaleFromPath(pathname);

  // Chemin sans préfixe locale pour comparaisons
  const pathWithoutLocale = locale !== 'fr'
    ? pathname.replace(`/${locale}`, '') || '/'
    : pathname;

  const isHome = pathWithoutLocale === '/';

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  function scrollToSection(id: string) {
    if (isHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = localePath(`/#${id}`, locale);
    }
  }

  function handleLangChange(code: string) {
    const newPath = localePath(pathWithoutLocale, code);
    window.location.href = newPath;
  }

  function handleDropdownEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setDropdownOpen(true);
  }

  function handleDropdownLeave() {
    hoverTimer.current = setTimeout(() => setDropdownOpen(false), 150);
  }

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <Link href={localePath('/', locale)} className={styles.logo}>
          <Image
            src="/images/ms_prestige_driver_logo.jpg"
            alt="MS Prestige Driver"
            width={52}
            height={52}
            priority
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.nav} aria-label="Navigation principale">
          <div
            className={styles.navItemDropdown}
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
            ref={dropdownRef}
          >
            <button
              className={`${styles.navLink} ${dropdownOpen ? styles.active : ''}`}
              onClick={() => scrollToSection('services')}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              Services
              <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown} role="menu">
                {SERVICES.map((s) => {
                  const href = localePath(s.href, locale);
                  return (
                    <Link
                      key={s.href}
                      href={href}
                      className={`${styles.dropdownItem} ${pathWithoutLocale === s.href ? styles.dropdownItemActive : ''}`}
                      role="menuitem"
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button className={styles.navLink} onClick={() => scrollToSection('vehicules')}>Véhicules</button>
          <button className={styles.navLink} onClick={() => scrollToSection('a-propos')}>À Propos</button>
          <Link href={localePath('/faq', locale)} className={`${styles.navLink} ${pathWithoutLocale === '/faq' ? styles.active : ''}`}>FAQ</Link>
          <button className={styles.navLink} onClick={() => scrollToSection('contact')}>Contact</button>

          <div className={styles.langSelector}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`${styles.langBtn} ${locale === l.code ? styles.langActive : ''}`}
                onClick={() => handleLangChange(l.code)}
                aria-label={`Langue : ${l.label}`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          <Link href={localePath('/reservation', locale)} className={styles.ctaBtn}>Réserver</Link>
        </nav>

        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.mobileLink} onClick={() => scrollToSection('services')}>Services</button>
          <div className={styles.mobileSubmenu}>
            {SERVICES.map((s) => (
              <Link key={s.href} href={localePath(s.href, locale)} className={styles.mobileSubLink}>{s.label}</Link>
            ))}
          </div>
          <button className={styles.mobileLink} onClick={() => scrollToSection('vehicules')}>Véhicules</button>
          <button className={styles.mobileLink} onClick={() => scrollToSection('a-propos')}>À Propos</button>
          <Link href={localePath('/faq', locale)} className={styles.mobileLink}>FAQ</Link>
          <button className={styles.mobileLink} onClick={() => scrollToSection('contact')}>Contact</button>
          <div className={styles.mobileLang}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`${styles.langBtn} ${locale === l.code ? styles.langActive : ''}`}
                onClick={() => handleLangChange(l.code)}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          <Link href={localePath('/reservation', locale)} className={styles.mobileCta}>Réserver</Link>
        </div>
      )}
    </header>
  );
}
