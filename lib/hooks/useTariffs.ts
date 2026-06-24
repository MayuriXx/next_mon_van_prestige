'use client';

/**
 * useTariffs — React hook for fetching live tariff data from Firestore
 *
 * Architecture:
 * - Reads the `tarifs` Firestore collection in real time (onSnapshot)
 * - Falls back to the static tariff data from lib/data/tariffs.ts if
 *   Firestore is unavailable (offline, cold start, etc.)
 * - Returns typed tariff objects ready to feed into calculatePrice()
 *
 * Usage:
 *   const { tariffs, loading, error, isStatic } = useTariffs();
 *
 *   if (loading) return <Spinner />;
 *
 *   const price = calculatePrice({
 *     serviceType: 'AIRPORT',
 *     vehicleType: 'BUSINESS',
 *     airportDestination: 'CDG',
 *   }, tariffs);
 *
 * When Mohammed updates a tariff in the Admin panel, every open browser
 * tab will receive the updated prices automatically (real-time subscription).
 */

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

import {
  AIRPORT_PRICES,
  LEISURE_PRICES,
  MAD_RATES,
  MINIMUM_FARES,
  TRANSFER_BRACKETS,
  OUT_OF_BASE_BRACKETS,
} from '@/lib/data/tariffs';

import type {
  AirportDestination,
  LeisureDestination,
  PriceRange,
  VehicleType,
} from '@/lib/types/pricing';

import type { KmBracket } from '@/lib/data/tariffs';

// ---------------------------------------------------------------------------
// Canonical tariff shape (matches both Firestore and the static fallback)
// ---------------------------------------------------------------------------

export interface TariffData {
  airports: Record<AirportDestination, Record<VehicleType, PriceRange>>;
  leisure: Record<LeisureDestination, Record<VehicleType, PriceRange>>;
  mad: Record<VehicleType, number>;
  minimumFares: Record<VehicleType, number>;
  transferBrackets: Record<VehicleType, KmBracket[]>;
  outOfBaseBrackets: Record<VehicleType, KmBracket[]>;
}

/** Static fallback built from the local tariffs.ts data file */
const STATIC_TARIFFS: TariffData = {
  airports: AIRPORT_PRICES,
  leisure: LEISURE_PRICES,
  mad: MAD_RATES,
  minimumFares: MINIMUM_FARES,
  transferBrackets: TRANSFER_BRACKETS,
  outOfBaseBrackets: OUT_OF_BASE_BRACKETS,
};

// ---------------------------------------------------------------------------
// Firestore → TariffData conversion
// ---------------------------------------------------------------------------

/**
 * Convert raw Firestore documents to a typed TariffData object.
 *
 * Firestore stores -1 as the upper bound for open-ended brackets (Infinity
 * cannot be serialised as JSON/Firestore). We convert -1 back to Infinity here.
 */
function normaliseBrackets(brackets: KmBracket[]): KmBracket[] {
  return brackets.map((b) => ({
    ...b,
    to: b.to === -1 ? Infinity : b.to,
  }));
}

function fromFirestore(docs: Record<string, unknown>): TariffData {
  return {
    airports: (docs['airports'] as TariffData['airports']) ?? STATIC_TARIFFS.airports,
    leisure: (docs['leisure'] as TariffData['leisure']) ?? STATIC_TARIFFS.leisure,
    mad: (docs['mad'] as TariffData['mad']) ?? STATIC_TARIFFS.mad,
    minimumFares:
      (docs['minimum_fares'] as TariffData['minimumFares']) ?? STATIC_TARIFFS.minimumFares,
    transferBrackets: {
      BUSINESS: normaliseBrackets(
        ((docs['transfer_brackets'] as { BUSINESS: KmBracket[] })?.BUSINESS) ??
          STATIC_TARIFFS.transferBrackets.BUSINESS
      ),
      VAN: normaliseBrackets(
        ((docs['transfer_brackets'] as { VAN: KmBracket[] })?.VAN) ??
          STATIC_TARIFFS.transferBrackets.VAN
      ),
    },
    outOfBaseBrackets: {
      BUSINESS: normaliseBrackets(
        ((docs['out_of_base_brackets'] as { BUSINESS: KmBracket[] })?.BUSINESS) ??
          STATIC_TARIFFS.outOfBaseBrackets.BUSINESS
      ),
      VAN: normaliseBrackets(
        ((docs['out_of_base_brackets'] as { VAN: KmBracket[] })?.VAN) ??
          STATIC_TARIFFS.outOfBaseBrackets.VAN
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTariffsResult {
  /** Live tariff data — from Firestore if available, static otherwise */
  tariffs: TariffData;
  /** True while the initial Firestore fetch is in progress */
  loading: boolean;
  /** Non-null if Firestore returned an error (tariffs will be static) */
  error: Error | null;
  /** True when Firestore was unavailable and static data is being used */
  isStatic: boolean;
}

export function useTariffs(): UseTariffsResult {
  const [tariffs, setTariffs] = useState<TariffData>(STATIC_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    const col = collection(db, 'tarifs');
    const docs: Record<string, unknown> = {};
    let receivedCount = 0;

    // Documents we expect from Firestore (excluding _meta)
    const EXPECTED_DOCS = [
      'airports',
      'leisure',
      'mad',
      'minimum_fares',
      'transfer_brackets',
      'out_of_base_brackets',
    ];

    const unsubscribe = onSnapshot(
      col,
      (snapshot) => {
        snapshot.docs.forEach((doc) => {
          if (doc.id !== '_meta') {
            docs[doc.id] = doc.data();
            receivedCount++;
          }
        });

        if (snapshot.docs.length === 0) {
          // Collection is empty — use static data
          console.warn('[useTariffs] Firestore tarifs collection is empty — using static data');
          setIsStatic(true);
          setTariffs(STATIC_TARIFFS);
        } else if (receivedCount > 0) {
          // At least some Firestore data received
          const missingDocs = EXPECTED_DOCS.filter((id) => !(id in docs));
          if (missingDocs.length > 0) {
            console.warn('[useTariffs] Missing Firestore docs:', missingDocs, '— using static fallback for those');
          }
          setTariffs(fromFirestore(docs));
          setIsStatic(false);
        }

        setLoading(false);
      },
      (err) => {
        console.error('[useTariffs] Firestore error — falling back to static data:', err);
        setError(err as Error);
        setIsStatic(true);
        setTariffs(STATIC_TARIFFS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { tariffs, loading, error, isStatic };
}
