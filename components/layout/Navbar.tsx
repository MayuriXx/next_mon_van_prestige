'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import { localePath, getLocaleFromPath } from '@/lib/utils/locale';

const SERVICE_SLUGS = [
  { labelFr: 'Transfert Aéroport',          slug: '/services/transfert-aeroport' },
  { labelFr: 'Transfert Simple',             slug: '/services/transfert-simple' },
  { labelFr: 'Mise à Disposition',           slug: '/services/mise-a-disposition' },
  { labelFr: 'Événements Spéciaux',          slug: '/services/evenements-speciaux' },
  { labelFr: 'Escapades & Loisirs',          slug: '/services/escapades-loisirs' },
  { labelFr: 'Déplacements Professionnels',  slug: '/services/deplacements-professionnels' },
];

const LANGUAGES = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
];

export default function Navbar() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHome = pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`;

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
      window.location.href = `/${locale}#${id}`;
    }
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
        {/* Logo */}
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

        {/* Desktop Nav */}
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
                {SERVICE_SLUGS.map((s) => {
                  const href = localePath(s.slug, locale);
                  return (
                    <Link
                      key={s.slug}
                      href={href}
                      className={`${styles.dropdownItem} ${pathname === href ? styles.dropdownItemActive : ''}`}
                      role="menuitem"
                    >
                      {s.labelFr}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button className={styles.navLink} onClick={() => scrollToSection('vehicules')}>Véhicules</button>
          <button className={styles.navLink} onClick={() => scrollToSection('a-propos')}>À Propos</button>
          <Link href={localePath('/faq', locale)} className={`${styles.navLink} ${pathname.includes('/faq') ? styles.active : ''}`}>FAQ</Link>
          <button className={styles.navLink} onClick={() => scrollToSection('contact')}>Contact</button>

          <div className={styles.langSelector}>
            {LANGUAGES.map((l) => {
              // Switch locale: remplace le préfixe dans le pathname actuel
              const currentPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/') || '/';
              const targetHref = localePath(currentPath === '/' ? '/' : currentPath, l.code);
              return (
                <Link
                  key={l.code}
                  href={targetHref}
                  className={`${styles.langBtn} ${locale === l.code ? styles.langActive : ''}`}
                  aria-label={`Langue : ${l.label}`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </div>

          <Link href={localePath('/reservation', locale)} className={styles.ctaBtn}>Réserver</Link>
        </nav>

        {/* Burger mobile */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.mobileLink} onClick={() => scrollToSection('services')}>Services</button>
          <div className={styles.mobileSubmenu}>
            {SERVICE_SLUGS.map((s) => (
              <Link key={s.slug} href={localePath(s.slug, locale)} className={styles.mobileSubLink}>
                {s.labelFr}
              </Link>
            ))}
          </div>
          <button className={styles.mobileLink} onClick={() => scrollToSection('vehicules')}>Véhicules</button>
          <button className={styles.mobileLink} onClick={() => scrollToSection('a-propos')}>À Propos</button>
          <Link href={localePath('/faq', locale)} className={styles.mobileLink}>FAQ</Link>
          <button className={styles.mobileLink} onClick={() => scrollToSection('contact')}>Contact</button>
          <div className={styles.mobileLang}>
            {LANGUAGES.map((l) => {
              const currentPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/') || '/';
              const targetHref = localePath(currentPath === '/' ? '/' : currentPath, l.code);
              return (
                <Link
                  key={l.code}
                  href={targetHref}
                  className={`${styles.langBtn} ${locale === l.code ? styles.langActive : ''}`}
                >
                  {l.flag} {l.label}
                </Link>
              );
            })}
          </div>
          <Link href={localePath('/reservation', locale)} className={styles.mobileCta}>Réserver</Link>
        </div>
      )}
    </header>
  );
}
