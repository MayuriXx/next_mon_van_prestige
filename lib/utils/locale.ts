// Sans middleware (incompatible output:export), les routes Next.js sont
// générées sous /[locale]/... donc même le FR a besoin du préfixe /fr/
export const LOCALES = ['fr', 'en', 'nl'] as const;
export type Locale = typeof LOCALES[number];

export function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split('/')[1] as Locale;
  return LOCALES.includes(seg) ? seg : 'fr';
}

// Préfixe TOUJOURS le locale (fr inclus) car pas de middleware
export function localePath(href: string, locale: Locale | string): string {
  return `/${locale}${href === '/' ? '' : href}`;
}
