/**
 * lib/hooks/useFaq.ts
 *
 * Public-facing hook that fetches FAQ entries from Firestore.
 *
 * Query strategy:
 *   We fetch ALL documents ordered by `order` only (single-field index,
 *   automatically created by Firestore) and filter `active == true`
 *   client-side. This avoids requiring a composite index on (active, order)
 *   which would need manual creation in the Firebase console.
 *
 * Firestore structure:
 *   Collection: faq
 *   Documents: one per FAQ entry, with fields:
 *     - question  : { fr: string; en: string; nl: string }
 *     - answer    : { fr: string; en: string; nl: string }
 *     - order     : number
 *     - active    : boolean
 *     - createdAt : Timestamp
 *     - updatedAt : Timestamp
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface FaqItem {
  id:       string;
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
    // Single-field orderBy only — no composite index required.
    // active filtering is done client-side.
    const q = query(collection(db, 'faq'), orderBy('order', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<FaqItem, 'id'>) }))
          .filter((item) => item.active === true);
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
  }, [locale]);

  return { items, loading, error };
}
