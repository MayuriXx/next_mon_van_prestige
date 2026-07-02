'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './Navbar.module.css';

// Labels are resolved via next-intl (nav.servicesDropdown.*) — hrefs stay static.
const SERVICES = [
  { key: 'airport',      href: '/services/transfert-aeroport' },
  { key: 'simple',       href: '/services/transfert-simple' },
  { key: 'disposal',     href: '/services/mise-a-disposition' },
  { key: 'events',       href: '/services/evenements-speciaux' },
  { key: 'leisure',      href: '/services/escapades-loisirs' },
  { key: 'professional', href: '/services/deplacements-professionnels' },
] as const;

const LANGUAGES = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
];

export default function Navbar() {
  const pathname = usePathname(); // ex: /fr/services/transfert-aeroport
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('nav');

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chemin sans préfixe locale pour comparaisons actives
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
  const isHome = pathWithoutLocale === '/';

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
    window.location.href = localePath(pathWithoutLocale, code);
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
            sizes="52px"
            className={styles.logoImg}
          />
          <div className={styles.brandText}>
            {/* Brand name displayed next to the logo (design update, requested by Evan 2026-07-02). */}
            <span className={styles.brandName}>MS Prestige Driver</span>
            {/* Brand slogan — kept in French across all locales (client decision, US-01 / #80). Not translated on purpose. */}
            <span className={styles.tagline}>
              {"L'excellence au service de votre mobilité"}
            </span>
          </div>
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
              onClick={() => scrollToSection('transfert-aeroport')}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {t('services')}
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
                      {t(`servicesDropdown.${s.key}`)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button className={styles.navLink} onClick={() => scrollToSection('vehicules')}>{t('vehicles')}</button>
          <button className={styles.navLink} onClick={() => scrollToSection('a-propos')}>{t('about')}</button>
          <Link href={localePath('/faq', locale)} className={`${styles.navLink} ${pathWithoutLocale === '/faq' ? styles.active : ''}`}>{t('faq')}</Link>
          <button className={styles.navLink} onClick={() => scrollToSection('contact')}>{t('contact')}</button>

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

          <Link href={localePath('/reservation', locale)} className={styles.ctaBtn}>{t('book')}</Link>
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
          <button className={styles.mobileLink} onClick={() => scrollToSection('transfert-aeroport')}>{t('services')}</button>
          <div className={styles.mobileSubmenu}>
            {SERVICES.map((s) => (
              <Link key={s.href} href={localePath(s.href, locale)} className={styles.mobileSubLink}>{t(`servicesDropdown.${s.key}`)}</Link>
            ))}
          </div>
          <button className={styles.mobileLink} onClick={() => scrollToSection('vehicules')}>{t('vehicles')}</button>
          <button className={styles.mobileLink} onClick={() => scrollToSection('a-propos')}>{t('about')}</button>
          <Link href={localePath('/faq', locale)} className={styles.mobileLink}>{t('faq')}</Link>
          <button className={styles.mobileLink} onClick={() => scrollToSection('contact')}>{t('contact')}</button>
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
          <Link href={localePath('/reservation', locale)} className={styles.mobileCta}>{t('book')}</Link>
        </div>
      )}
    </header>
  );
}
