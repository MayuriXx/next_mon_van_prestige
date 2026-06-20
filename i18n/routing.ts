import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en', 'nl'],
  defaultLocale: 'fr',
  // Pas de préfixe pour la locale par défaut (fr)
  localePrefix: 'as-needed',
});
