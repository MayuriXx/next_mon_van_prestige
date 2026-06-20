'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import styles from './LanguageSwitcher.module.css';

const LOCALES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className={styles.switcher} role="navigation" aria-label="Sélecteur de langue">
      {LOCALES.map(({ code, flag, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={`${styles.flag} ${locale === code ? styles.active : ''}`}
          aria-label={label}
          aria-current={locale === code ? 'true' : undefined}
          title={label}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
