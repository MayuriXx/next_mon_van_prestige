'use client';

/**
 * useWomenSurcharge — Reads the women's transport surcharge percentage from Firestore.
 *
 * Firestore document: tarifs/women_surcharge
 * Field: percentage (number, e.g. 20 for 20%)
 *
 * Default: 20% if the Firestore document doesn't exist.
 * Mohammed can change this value from the admin tarifs page.
 *
 * Usage:
 *   const surchargePercent = useWomenSurcharge(); // e.g. 20
 *   const finalPrice = Math.ceil(basePrice * (1 + surchargePercent / 100));
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

const DEFAULT_SURCHARGE = 20;

export function useWomenSurcharge(): number {
  const [surcharge, setSurcharge] = useState(DEFAULT_SURCHARGE);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'tarifs', 'women_surcharge'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const pct = typeof data.percentage === 'number' ? data.percentage : DEFAULT_SURCHARGE;
          setSurcharge(pct);
        } else {
          setSurcharge(DEFAULT_SURCHARGE);
        }
      },
      (err) => {
        console.warn('[useWomenSurcharge] Firestore error — using default:', err);
        setSurcharge(DEFAULT_SURCHARGE);
      }
    );
    return () => unsubscribe();
  }, []);

  return surcharge;
}
