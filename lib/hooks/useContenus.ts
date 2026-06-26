/**
 * lib/hooks/useContenus.ts
 *
 * Hook that fetches a single content-override document from Firestore
 * for a given section (e.g. 'transfertAeroport', 'about', 'contact').
 *
 * Business purpose:
 *   Mohammed edits textual content in the admin panel (/admin/contenus).
 *   Those edits are saved as Firestore documents in the `contenus` collection.
 *   Each public-facing component calls this hook to get Firestore overrides and
 *   applies them on top of the static i18n strings from messages/*.json.
 *   An empty or missing field means "use the default translation".
 *
 * Firestore document shape (contenus/{sectionId}):
 *   {
 *     title?    : { fr: string; en: string; nl: string }
 *     subtitle? : { fr: string; en: string; nl: string }
 *     text?     : { fr: string; en: string; nl: string }
 *     tagline?  : { fr: string; en: string; nl: string }
 *     phone?    : string
 *     email?    : string
 *     address?  : string
 *     updatedAt?: Timestamp
 *   }
 *
 * Usage:
 *   const { get } = useContenus('transfertAeroport', 'fr');
 *   const title = get('title') || t('title');   // Firestore override OR i18n fallback
 *
 * The hook fetches once on mount (getDoc, not onSnapshot) — content changes
 * in the admin panel take effect on the next page load, which is acceptable
 * for a content-management use case.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

type Locale = 'fr' | 'en' | 'nl';

type I18nField = { fr: string; en: string; nl: string };
type ContenusDoc = Record<string, I18nField | string | unknown>;

interface UseContenusResult {
  /**
   * Returns the Firestore override value for a given field key and the current
   * locale. Falls back to '' (empty string) if not set, so callers can use:
   *   get('title') || t('title')
   */
  get: (field: string) => string;
  /** True while the Firestore document is being fetched */
  loading: boolean;
}

export function useContenus(sectionId: string, locale: Locale = 'fr'): UseContenusResult {
  const [data,    setData]    = useState<ContenusDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'contenus', sectionId))
      .then((snap) => {
        if (!cancelled) {
          setData(snap.exists() ? (snap.data() as ContenusDoc) : {});
        }
      })
      .catch(() => {
        if (!cancelled) setData({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sectionId, locale]);

  function get(field: string): string {
    if (!data) return '';
    const value = data[field];
    if (!value) return '';
    // i18n field: { fr, en, nl }
    if (typeof value === 'object' && value !== null && locale in (value as object)) {
      return (value as I18nField)[locale] || '';
    }
    // plain string (e.g. phone, email, address)
    if (typeof value === 'string') return value;
    return '';
  }

  return { get, loading };
}
