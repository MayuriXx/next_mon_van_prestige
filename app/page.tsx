'use client';

import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    // Détecte la langue du navigateur, redirige vers le bon locale
    const lang = navigator.language.startsWith('nl')
      ? 'nl'
      : navigator.language.startsWith('en')
      ? 'en'
      : 'fr';
    window.location.replace('/' + lang);
  }, []);

  return null;
}
