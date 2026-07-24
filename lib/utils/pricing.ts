/**
 * MS Prestige Driver — Price calculation engine
 *
 * Pure TypeScript utility — no external dependencies, no side effects.
 * Can be used safely in both server components and client components.
 *
 * Business rules implemented:
 * 1. AIRPORT service → fixed directional package fare. min = Valenciennes →
 *    airport, max = airport → Valenciennes. Pass `direction` to get a single
 *    fare; omit it to get the raw PriceRange (display use).
 * 2. LEISURE service → same directional package logic as AIRPORT
 * 3. MAD service → hourly rate × durationHours
 * 4. TRANSFER service → per-km bracket pricing
 *    a. Find the matching KmBracket in the transfer_brackets table
 *    b. Apply flat fee or ratePerKm × distance
 *    c. Enforce minimum fare
 * 5. Out-of-base surcharge — applies to EVERY service. Keyed on the road
 *    distance between the base (Gare de Valenciennes) and the local pickup
 *    point (`outOfBaseKm`). Added flat on top of the service price and never
 *    reduced by discounts (round-trip / promotions).
 *
 * Dynamic tariffs:
 *   calculatePrice() accepts an optional second argument `tariffs` of type TariffData
 *   (from useTariffs hook). When provided, live Firestore values are used.
 *   When omitted, the static fallback from lib/data/tariffs.ts is used.
 *   This keeps the engine decoupled from the data source.
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
import type { PriceRequest, PriceResult, VehicleType } from '@/lib/types/pricing';

// TariffData shape — mirrors the useTariffs hook output
// Defined inline here to avoid a circular dependency with lib/hooks/useTariffs
export interface TariffData {
  airports: typeof AIRPORT_PRICES;
  leisure: typeof LEISURE_PRICES;
  mad: typeof MAD_RATES;
  minimumFares: typeof MINIMUM_FARES;
  transferBrackets: typeof TRANSFER_BRACKETS;
  outOfBaseBrackets: typeof OUT_OF_BASE_BRACKETS;
}

/** Static tariff data — used as default when no dynamic data is provided */
const STATIC_TARIFFS: TariffData = {
  airports: AIRPORT_PRICES,
  leisure: LEISURE_PRICES,
  mad: MAD_RATES,
  minimumFares: MINIMUM_FARES,
  transferBrackets: TRANSFER_BRACKETS,
  outOfBaseBrackets: OUT_OF_BASE_BRACKETS,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find the matching bracket for a given distance in km.
 * -1 stored in Firestore means Infinity (open-ended upper bound).
 */
function findBracket(
  km: number,
  brackets: KmBracket[]
): KmBracket | undefined {
  return brackets.find((b) => {
    const upper = b.to === -1 ? Infinity : b.to;
    return km >= b.from && km <= upper;
  });
}

/**
 * Calculate the price for a given distance using bracket pricing.
 */
function applyBracket(km: number, bracket: KmBracket): number {
  if (bracket.flat !== undefined) return bracket.flat;
  if (bracket.ratePerKm !== undefined) return km * bracket.ratePerKm;
  return 0;
}

/** Round a price to 2 decimal places (used for intermediate calculations). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Round up to the next whole euro (e.g. 47.01 → 48, 47.00 → 47). */
function ceilEuro(value: number): number {
  return Math.ceil(value);
}

/**
 * Out-of-base surcharge for a pickup located `km` (road distance) from the
 * base (Gare de Valenciennes). Returns a whole-euro amount, 0 when the pickup
 * is within the base area (< 3 km) or when no bracket matches.
 *
 * Exported so booking funnels can add the surcharge AFTER percentage
 * adjustments (round-trip discount, Transport au Féminin) — the surcharge is a
 * flat approach fee and must not be discounted.
 */
export function calculateOutOfBaseSurcharge(
  km: number,
  vehicleType: VehicleType,
  tariffs: TariffData = STATIC_TARIFFS
): number {
  if (!km || km <= 0) return 0;
  const bracket = findBracket(km, tariffs.outOfBaseBrackets[vehicleType]);
  if (!bracket) return 0;
  return ceilEuro(applyBracket(km, bracket));
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/**
 * Calculate the estimated price for an MS Prestige Driver service.
 *
 * @param request - The price request parameters
 * @param tariffs - Optional live tariff data from useTariffs(). Falls back to static data.
 * @returns A PriceResult with the price, optional surcharge, and breakdown lines
 *
 * @example
 * // With static tariffs (no hook needed)
 * calculatePrice({ serviceType: 'AIRPORT', vehicleType: 'BUSINESS', airportDestination: 'CDG' });
 *
 * @example
 * // With live Firestore tariffs
 * const { tariffs } = useTariffs();
 * calculatePrice({ serviceType: 'TRANSFER', vehicleType: 'VAN', distanceKm: 35 }, tariffs);
 */
export function calculatePrice(
  request: PriceRequest,
  tariffs: TariffData = STATIC_TARIFFS
): PriceResult {
  const { serviceType, vehicleType } = request;
  const breakdown: string[] = [];

  // ── AIRPORT ──────────────────────────────────────────────────────────────
  if (serviceType === 'AIRPORT') {
    if (!request.airportDestination) {
      throw new Error('[pricing] AIRPORT service requires airportDestination');
    }
    const range = tariffs.airports[request.airportDestination][vehicleType];

    // Directional fare: min = Valenciennes → airport, max = airport → Valenciennes.
    if (request.direction) {
      const fare = request.direction === 'FROM_BASE' ? range.min : range.max;
      breakdown.push(
        `Forfait ${request.airportDestination} ${request.direction === 'FROM_BASE' ? 'aller (départ Valenciennes)' : 'retour (vers Valenciennes)'} (${vehicleType}) : ${fare} €`
      );
      const surcharge = calculateOutOfBaseSurcharge(request.outOfBaseKm ?? 0, vehicleType, tariffs);
      if (surcharge > 0) {
        breakdown.push(`Majoration hors-base (${request.outOfBaseKm} km de la Gare de Valenciennes) : +${surcharge} €`);
      }
      return {
        serviceType, vehicleType,
        price: fare + surcharge,
        outOfBaseSurcharge: surcharge > 0 ? surcharge : undefined,
        breakdown, isFixed: true,
      };
    }

    // No direction → raw range, display use only ("from X €").
    breakdown.push(
      `Forfait aéroport ${request.airportDestination} (${vehicleType}) : ${range.min} € (aller) / ${range.max} € (retour)`
    );
    return { serviceType, vehicleType, price: range, breakdown, isFixed: true };
  }

  // ── LEISURE ──────────────────────────────────────────────────────────────
  if (serviceType === 'LEISURE') {
    if (!request.leisureDestination) {
      throw new Error('[pricing] LEISURE service requires leisureDestination');
    }
    const range = tariffs.leisure[request.leisureDestination][vehicleType];

    // Directional fare: min = Valenciennes → venue, max = venue → Valenciennes.
    if (request.direction) {
      const fare = request.direction === 'FROM_BASE' ? range.min : range.max;
      breakdown.push(
        `Forfait ${request.leisureDestination} ${request.direction === 'FROM_BASE' ? 'aller (départ Valenciennes)' : 'retour (vers Valenciennes)'} (${vehicleType}) : ${fare} €`
      );
      const surcharge = calculateOutOfBaseSurcharge(request.outOfBaseKm ?? 0, vehicleType, tariffs);
      if (surcharge > 0) {
        breakdown.push(`Majoration hors-base (${request.outOfBaseKm} km de la Gare de Valenciennes) : +${surcharge} €`);
      }
      return {
        serviceType, vehicleType,
        price: fare + surcharge,
        outOfBaseSurcharge: surcharge > 0 ? surcharge : undefined,
        breakdown, isFixed: true,
      };
    }

    breakdown.push(
      `Forfait loisirs ${request.leisureDestination} (${vehicleType}) : ${range.min} € (aller) / ${range.max} € (retour)`
    );
    return { serviceType, vehicleType, price: range, breakdown, isFixed: true };
  }

  // ── MAD (Mise à Disposition) ──────────────────────────────────────────────
  if (serviceType === 'MAD') {
    if (!request.durationHours || request.durationHours <= 0) {
      throw new Error('[pricing] MAD service requires durationHours > 0');
    }
    const rate = tariffs.mad[vehicleType];
    let price = ceilEuro(rate * request.durationHours);
    breakdown.push(
      `Mise à disposition (${vehicleType}) : ${rate} €/h × ${request.durationHours} h = ${price} €`
    );
    const madSurcharge = calculateOutOfBaseSurcharge(request.outOfBaseKm ?? 0, vehicleType, tariffs);
    if (madSurcharge > 0) {
      price += madSurcharge;
      breakdown.push(`Majoration hors-base (${request.outOfBaseKm} km de la Gare de Valenciennes) : +${madSurcharge} €`);
    }
    return {
      serviceType, vehicleType, price,
      outOfBaseSurcharge: madSurcharge > 0 ? madSurcharge : undefined,
      breakdown, isFixed: true,
    };
  }

  // ── TRANSFER (per-km) ─────────────────────────────────────────────────────
  if (serviceType === 'TRANSFER') {
    if (request.distanceKm === undefined || request.distanceKm < 0) {
      throw new Error('[pricing] TRANSFER service requires distanceKm >= 0');
    }

    const km = request.distanceKm;
    const brackets = tariffs.transferBrackets[vehicleType];
    const bracket = findBracket(km, brackets);

    if (!bracket) {
      throw new Error(`[pricing] No bracket found for ${km} km (${vehicleType})`);
    }

    let basePrice = applyBracket(km, bracket);
    const minimum = tariffs.minimumFares[vehicleType];

    if (basePrice < minimum) {
      basePrice = minimum;
      breakdown.push(`Minimum garanti (${vehicleType}) : ${minimum} €`);
    } else if (bracket.flat !== undefined) {
      breakdown.push(
        `Forfait ${bracket.from}–${bracket.to === Infinity || bracket.to === -1 ? `>${bracket.from - 1}` : bracket.to} km (${vehicleType}) : ${bracket.flat} €`
      );
    } else if (bracket.ratePerKm !== undefined) {
      breakdown.push(
        `${km} km × ${bracket.ratePerKm} €/km (${vehicleType}) = ${round2(basePrice)} €`
      );
    }

    basePrice = ceilEuro(basePrice);

    // ── Hors-base surcharge ────────────────────────────────────────────────
    let surcharge: number | undefined;

    if (request.outOfBaseKm && request.outOfBaseKm > 0) {
      const obKm = request.outOfBaseKm;
      const obBrackets = tariffs.outOfBaseBrackets[vehicleType];
      const obBracket = findBracket(obKm, obBrackets);

      if (obBracket) {
        const obAmount = round2(applyBracket(obKm, obBracket));
        if (obAmount > 0) {
          surcharge = obAmount;
          if (obBracket.flat !== undefined) {
            breakdown.push(`Supplément hors-base ${obKm} km (${vehicleType}) : ${obAmount} €`);
          } else if (obBracket.ratePerKm !== undefined) {
            breakdown.push(
              `Supplément hors-base : ${obKm} km × ${obBracket.ratePerKm} €/km = ${obAmount} €`
            );
          }
        }
      }
    }

    const totalPrice = ceilEuro(surcharge ? basePrice + surcharge : basePrice);
    if (surcharge) breakdown.push(`Total estimé : ${totalPrice} €`);

    return {
      serviceType,
      vehicleType,
      price: totalPrice,
      outOfBaseSurcharge: surcharge,
      breakdown,
      isFixed: false, // TRANSFER price depends on actual ORS distance — treated as estimate
    };
  }

  throw new Error(`[pricing] Unknown serviceType: ${String(serviceType)}`);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Format a price or price range as a human-readable string.
 * @example formatPrice(150)               → "150 €"
 * @example formatPrice({ min: 90, max: 130 }) → "90 € – 130 €"
 */
export function formatPrice(price: number | { min: number; max: number }): string {
  if (typeof price === 'number') return `${price} €`;
  return `${price.min} € – ${price.max} €`;
}

/**
 * Type guard — returns true when the price is a range (min/max), false when it's a fixed number.
 */
export function isPriceRange(
  price: number | { min: number; max: number }
): price is { min: number; max: number } {
  return typeof price === 'object' && 'min' in price && 'max' in price;
}
