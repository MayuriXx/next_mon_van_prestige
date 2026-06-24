/**
 * MS Prestige Driver — Price calculation engine
 *
 * Pure TypeScript utility — no external dependencies, no side effects.
 * Can be used safely in both server components and client components.
 *
 * Business rules implemented:
 * 1. AIRPORT service → fixed package price (PriceRange) from AIRPORT_PRICES
 * 2. LEISURE service → fixed package price (PriceRange) from LEISURE_PRICES
 * 3. MAD service → hourly rate × durationHours
 * 4. TRANSFER service → per-km bracket pricing
 *    a. Find the matching KmBracket in TRANSFER_BRACKETS
 *    b. Apply flat fee or ratePerKm × distance
 *    c. Enforce minimum fare
 *    d. Add hors-base surcharge if outOfBaseKm is provided
 */

import {
  AIRPORT_PRICES,
  LEISURE_PRICES,
  MAD_RATES,
  MINIMUM_FARES,
  OUT_OF_BASE_BRACKETS,
  TRANSFER_BRACKETS,
  type KmBracket,
} from '@/lib/data/tariffs';
import type { PriceRequest, PriceResult } from '@/lib/types/pricing';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find the matching bracket for a given distance in km.
 * Returns undefined if no bracket matches (should not happen with well-formed data).
 */
function findBracket(
  km: number,
  brackets: KmBracket[]
): KmBracket | undefined {
  return brackets.find((b) => km >= b.from && km <= b.to);
}

/**
 * Calculate the price for a given distance using bracket pricing.
 * Returns the price in euros (not rounded — rounding happens at the end).
 */
function applyBracket(km: number, bracket: KmBracket): number {
  if (bracket.flat !== undefined) {
    return bracket.flat;
  }
  if (bracket.ratePerKm !== undefined) {
    return km * bracket.ratePerKm;
  }
  return 0;
}

/**
 * Round a price to 2 decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/**
 * Calculate the estimated price for an MS Prestige Driver service.
 *
 * @param request - The price request parameters
 * @returns A PriceResult with the price, optional surcharge, and breakdown lines
 *
 * @example
 * // Airport transfer in a Business vehicle
 * calculatePrice({
 *   serviceType: 'AIRPORT',
 *   vehicleType: 'BUSINESS',
 *   airportDestination: 'CDG',
 * });
 * // → { price: { min: 300, max: 390 }, isFixed: true, breakdown: [...] }
 *
 * @example
 * // 35 km transfer in a VAN with a 10 km out-of-base pickup
 * calculatePrice({
 *   serviceType: 'TRANSFER',
 *   vehicleType: 'VAN',
 *   distanceKm: 35,
 *   outOfBaseKm: 10,
 * });
 */
export function calculatePrice(request: PriceRequest): PriceResult {
  const { serviceType, vehicleType } = request;
  const breakdown: string[] = [];

  // ── AIRPORT ──────────────────────────────────────────────────────────────
  if (serviceType === 'AIRPORT') {
    if (!request.airportDestination) {
      throw new Error('[pricing] AIRPORT service requires airportDestination');
    }
    const range = AIRPORT_PRICES[request.airportDestination][vehicleType];
    breakdown.push(
      `Forfait aéroport ${request.airportDestination} (${vehicleType}) : ${range.min} € – ${range.max} €`
    );
    return {
      serviceType,
      vehicleType,
      price: range,
      breakdown,
      isFixed: true,
    };
  }

  // ── LEISURE ──────────────────────────────────────────────────────────────
  if (serviceType === 'LEISURE') {
    if (!request.leisureDestination) {
      throw new Error('[pricing] LEISURE service requires leisureDestination');
    }
    const range = LEISURE_PRICES[request.leisureDestination][vehicleType];
    breakdown.push(
      `Forfait loisirs ${request.leisureDestination} (${vehicleType}) : ${range.min} € – ${range.max} €`
    );
    return {
      serviceType,
      vehicleType,
      price: range,
      breakdown,
      isFixed: true,
    };
  }

  // ── MAD (Mise à Disposition) ──────────────────────────────────────────────
  if (serviceType === 'MAD') {
    if (!request.durationHours || request.durationHours <= 0) {
      throw new Error('[pricing] MAD service requires durationHours > 0');
    }
    const rate = MAD_RATES[vehicleType];
    const price = round2(rate * request.durationHours);
    breakdown.push(
      `Mise à disposition (${vehicleType}) : ${rate} €/h × ${request.durationHours} h = ${price} €`
    );
    return {
      serviceType,
      vehicleType,
      price,
      breakdown,
      isFixed: true,
    };
  }

  // ── TRANSFER (per-km) ─────────────────────────────────────────────────────
  if (serviceType === 'TRANSFER') {
    if (request.distanceKm === undefined || request.distanceKm < 0) {
      throw new Error('[pricing] TRANSFER service requires distanceKm >= 0');
    }

    const km = request.distanceKm;
    const brackets = TRANSFER_BRACKETS[vehicleType];
    const bracket = findBracket(km, brackets);

    if (!bracket) {
      throw new Error(
        `[pricing] No bracket found for ${km} km (${vehicleType})`
      );
    }

    let basePrice = applyBracket(km, bracket);
    const minimum = MINIMUM_FARES[vehicleType];

    // Enforce minimum fare
    if (basePrice < minimum) {
      basePrice = minimum;
      breakdown.push(
        `Minimum garanti (${vehicleType}) : ${minimum} €`
      );
    } else if (bracket.flat !== undefined) {
      breakdown.push(
        `Forfait ${bracket.from}–${bracket.to === Infinity ? `>${bracket.from - 1}` : bracket.to} km (${vehicleType}) : ${bracket.flat} €`
      );
    } else if (bracket.ratePerKm !== undefined) {
      breakdown.push(
        `${km} km × ${bracket.ratePerKm} €/km (${vehicleType}) = ${round2(basePrice)} €`
      );
    }

    basePrice = round2(basePrice);

    // ── Hors-base surcharge ────────────────────────────────────────────────
    let surcharge: number | undefined;

    if (request.outOfBaseKm && request.outOfBaseKm > 0) {
      const obKm = request.outOfBaseKm;
      const obBrackets = OUT_OF_BASE_BRACKETS[vehicleType];
      const obBracket = findBracket(obKm, obBrackets);

      if (obBracket) {
        const obAmount = round2(applyBracket(obKm, obBracket));
        if (obAmount > 0) {
          surcharge = obAmount;
          if (obBracket.flat !== undefined) {
            breakdown.push(
              `Supplément hors-base ${obKm} km (${vehicleType}) : ${obAmount} €`
            );
          } else if (obBracket.ratePerKm !== undefined) {
            breakdown.push(
              `Supplément hors-base : ${obKm} km × ${obBracket.ratePerKm} €/km = ${obAmount} €`
            );
          }
        }
      }
    }

    const totalPrice = surcharge
      ? round2(basePrice + surcharge)
      : basePrice;

    if (surcharge) {
      breakdown.push(`Total estimé : ${totalPrice} €`);
    }

    return {
      serviceType,
      vehicleType,
      price: totalPrice,
      outOfBaseSurcharge: surcharge,
      breakdown,
      isFixed: false, // Transfer pricing depends on actual distance — treated as estimate
    };
  }

  throw new Error(`[pricing] Unknown serviceType: ${String(serviceType)}`);
}

// ---------------------------------------------------------------------------
// Helpers for UI display
// ---------------------------------------------------------------------------

/**
 * Format a price or price range as a human-readable string.
 *
 * @example
 * formatPrice(150)          // → "150 €"
 * formatPrice({ min: 90, max: 130 })  // → "90 € – 130 €"
 */
export function formatPrice(price: number | { min: number; max: number }): string {
  if (typeof price === 'number') {
    return `${price} €`;
  }
  return `${price.min} € – ${price.max} €`;
}

/**
 * Returns true if the price result represents a fixed (non-estimated) price.
 */
export function isPriceRange(
  price: number | { min: number; max: number }
): price is { min: number; max: number } {
  return typeof price === 'object' && 'min' in price && 'max' in price;
}
