/**
 * MS Prestige Driver — Server-side price recomputation (security)
 *
 * Self-contained port of the client pricing grid (lib/data/tariffs.ts +
 * lib/utils/pricing.ts). The `functions` package cannot import the Next.js app
 * sources, so the grid and the bracket engine are duplicated here.
 *
 * Purpose: never trust the `totalPrice` sent by the browser. The Cloud Function
 * recomputes the expected price from the live Firestore `tarifs` collection
 * (falling back to this static grid) and rejects tampered requests.
 *
 * Keep this grid in sync with lib/data/tariffs.ts — but the live values come
 * from Firestore first, so a drift here only affects the offline fallback.
 */

import type { Firestore } from 'firebase-admin/firestore';

export type VehicleType = 'BUSINESS' | 'VAN';

export interface KmBracket {
  from: number;
  to: number; // Infinity for the last bracket (stored as -1 in Firestore)
  flat?: number;
  ratePerKm?: number;
}

export interface ServerTariffs {
  mad: Record<VehicleType, number>;
  minimumFares: Record<VehicleType, number>;
  transferBrackets: Record<VehicleType, KmBracket[]>;
}

// ── Static grid (offline fallback, mirrors lib/data/tariffs.ts) ───────────────

const STATIC_TARIFFS: ServerTariffs = {
  mad: { BUSINESS: 55, VAN: 90 },
  minimumFares: { BUSINESS: 22, VAN: 45 },
  transferBrackets: {
    BUSINESS: [
      { from: 0, to: 7, flat: 22 },
      { from: 8, to: 14, flat: 26 },
      { from: 15, to: 50, ratePerKm: 1.99 },
      { from: 51, to: 100, ratePerKm: 1.95 },
      { from: 101, to: 151, ratePerKm: 1.75 },
      { from: 152, to: Infinity, ratePerKm: 1.65 },
    ],
    VAN: [
      { from: 0, to: 5, flat: 45 },
      { from: 6, to: 14, flat: 55 },
      { from: 15, to: 19, flat: 59 },
      { from: 20, to: 25, ratePerKm: 3.1 },
      { from: 26, to: 50, ratePerKm: 2.9 },
      { from: 51, to: 100, ratePerKm: 2.5 },
      { from: 101, to: 200, ratePerKm: 2.05 },
      { from: 201, to: Infinity, ratePerKm: 1.95 },
    ],
  },
};

// ── Firestore loader (live values, -1 → Infinity) ─────────────────────────────

function normaliseBrackets(brackets: KmBracket[]): KmBracket[] {
  return brackets.map((b) => ({ ...b, to: b.to === -1 ? Infinity : b.to }));
}

/**
 * Load tariffs from the Firestore `tarifs` collection. Any missing document
 * falls back to the static grid, so admin edits are honoured while remaining
 * robust to partial data.
 */
export async function loadTariffs(db: Firestore): Promise<ServerTariffs> {
  try {
    const snap = await db.collection('tarifs').get();
    const docs: Record<string, unknown> = {};
    snap.forEach((d) => {
      if (d.id !== '_meta') docs[d.id] = d.data();
    });

    const mad = (docs['mad'] as ServerTariffs['mad']) ?? STATIC_TARIFFS.mad;
    const minimumFares =
      (docs['minimum_fares'] as ServerTariffs['minimumFares']) ?? STATIC_TARIFFS.minimumFares;
    const tb = docs['transfer_brackets'] as { BUSINESS?: KmBracket[]; VAN?: KmBracket[] } | undefined;

    return {
      mad,
      minimumFares,
      transferBrackets: {
        BUSINESS: normaliseBrackets(tb?.BUSINESS ?? STATIC_TARIFFS.transferBrackets.BUSINESS),
        VAN: normaliseBrackets(tb?.VAN ?? STATIC_TARIFFS.transferBrackets.VAN),
      },
    };
  } catch (err) {
    console.error('[pricing] loadTariffs failed — using static grid:', err);
    return STATIC_TARIFFS;
  }
}

// ── Engine (mirrors lib/utils/pricing.ts) ─────────────────────────────────────

function findBracket(km: number, brackets: KmBracket[]): KmBracket | undefined {
  return brackets.find((b) => {
    const upper = b.to === -1 ? Infinity : b.to;
    return km >= b.from && km <= upper;
  });
}

function applyBracket(km: number, bracket: KmBracket): number {
  if (bracket.flat !== undefined) return bracket.flat;
  if (bracket.ratePerKm !== undefined) return km * bracket.ratePerKm;
  return 0;
}

/**
 * Recompute the expected TRANSFER price for a given distance (km already
 * includes the round-trip multiplier applied by the caller).
 */
export function transferPrice(km: number, vehicleType: VehicleType, tariffs: ServerTariffs): number {
  const bracket = findBracket(km, tariffs.transferBrackets[vehicleType]);
  if (!bracket) return tariffs.minimumFares[vehicleType];
  let price = applyBracket(km, bracket);
  const min = tariffs.minimumFares[vehicleType];
  if (price < min) price = min;
  return Math.ceil(price);
}

/** Recompute the expected MAD price (hourly rate × duration). */
export function madPrice(hours: number, vehicleType: VehicleType, tariffs: ServerTariffs): number {
  return Math.ceil(tariffs.mad[vehicleType] * hours);
}
