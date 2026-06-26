/**
 * lib/hooks/useFaq.ts
 *
 * Public-facing hook that fetches FAQ entries from Firestore.
 *
 * Business purpose:
 *   Mohammed can add, edit, reorder, and delete FAQ entries from the admin
 *   panel (/admin/faq). This hook reads those entries for the public FAQ page.
 *   If Firestore returns no data (first deploy, offline, etc.) the component
 *   falls back to the static i18n keys already in messages/*.json.
 *
 * Firestore structure:
 *   Collection: faq
 *   Documents: one per FAQ entry, with fields:
 *     - id        : string   (auto-generated or set)
 *     - question  : { fr: string; en: string; nl: string }
 *     - answer    : { fr: string; en: string; nl: string }
 *     - order     : number   (for display ordering, 0-based)
 *     - active    : boolean  (false = hidden on public page)
 *     - createdAt : Timestamp
 *     - updatedAt : Timestamp
 *
 * Usage:
 *   const { items, loading } = useFaq('fr');
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface FaqItem {
  id: string;
  question: { fr: string; en: string; nl: string };
  answer:   { fr: string; en: string; nl: string };
  order:    number;
  active:   boolean;
}

interface UseFaqResult {
  items:   FaqItem[];
  loading: boolean;
  error:   string | null;
}

export function useFaq(locale: 'fr' | 'en' | 'nl' = 'fr'): UseFaqResult {
  const [items,   setItems]   = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'faq'),
      where('active', '==', true),
      orderBy('order', 'asc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FaqItem, 'id'>) }));
        setItems(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[useFaq] Firestore error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [locale]); // locale is kept in dep array for future index-based filtering

  return { items, loading, error };
}
