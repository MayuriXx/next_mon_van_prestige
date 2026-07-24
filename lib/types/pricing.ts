/**
 * Pricing types for MS Prestige Driver
 *
 * Business rules:
 * - ServiceType drives which tariff table is used
 * - VehicleType (BUSINESS | VAN) determines the rate tier
 * - MAD (Mise à Disposition) is priced per hour
 * - AIRPORT and LEISURE services use fixed package pricing. Package prices are
 *   DIRECTIONAL one-way fares: `min` is the outbound fare (Valenciennes →
 *   destination) and `max` is the reverse fare (destination → Valenciennes).
 *   E.g. V-CDG Business "300///390" = 300 € leaving from Valenciennes,
 *   390 € when the trip runs from CDG back to Valenciennes.
 * - TRANSFER (simple point-to-point) uses per-km bracket pricing
 * - An out-of-base surcharge ("hors-base") applies to EVERY service when the
 *   local pickup point sits away from the base (Gare de Valenciennes). The
 *   surcharge brackets are keyed on the road distance base → pickup.
 */

export type VehicleType = 'BUSINESS' | 'VAN';

export type ServiceType =
  | 'TRANSFER'      // Simple point-to-point transfer — per-km pricing
  | 'AIRPORT'       // Fixed-price airport package
  | 'LEISURE'       // Fixed-price leisure/theme-park package
  | 'MAD';          // Mise à Disposition — hourly pricing

/** Known fixed-price airport destinations */
export type AirportDestination =
  | 'CDG'
  | 'ORLY'
  | 'ZAVENTEM'
  | 'CHARLEROI'
  | 'LESQUIN'
  | 'GARES';

/** Known fixed-price leisure destinations */
export type LeisureDestination =
  | 'ASTERIX'
  | 'WALIBI'
  | 'DISNEY'
  | 'LENS'
  | 'LOSC';

/**
 * Directional package fare used for fixed-price services (AIRPORT / LEISURE).
 *
 * `min` = outbound fare, departing FROM the Valenciennes base toward the
 *         destination (grid notation "300///390" → 300).
 * `max` = reverse fare, departing from the destination back TO Valenciennes
 *         (grid notation "300///390" → 390).
 *
 * The field names are kept as min/max for Firestore backward compatibility
 * (`tarifs/airports`, `tarifs/leisure`). Public pages may still display
 * "from {min} €" which remains accurate.
 */
export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Trip direction for fixed-price packages.
 * FROM_BASE → departure from the Valenciennes area (uses PriceRange.min)
 * TO_BASE   → return from the destination to Valenciennes (uses PriceRange.max)
 */
export type PackageDirection = 'FROM_BASE' | 'TO_BASE';

/** Input payload for the price calculator */
export interface PriceRequest {
  serviceType: ServiceType;
  vehicleType: VehicleType;

  /** Distance in kilometres — required for TRANSFER service */
  distanceKm?: number;

  /** Duration in hours — required for MAD service */
  durationHours?: number;

  /** Target airport — required for AIRPORT service */
  airportDestination?: AirportDestination;

  /** Target leisure venue — required for LEISURE service */
  leisureDestination?: LeisureDestination;

  /**
   * Trip direction for AIRPORT / LEISURE packages.
   * When provided, the calculator returns a single directional fare
   * (min for FROM_BASE, max for TO_BASE) instead of a PriceRange.
   */
  direction?: PackageDirection;

  /**
   * Road distance in km between the base (Gare de Valenciennes) and the local
   * pickup point. Drives the hors-base surcharge, which applies to EVERY
   * service (TRANSFER, MAD, AIRPORT, LEISURE).
   * Leave undefined or 0 when pickup is within the base area (< 3 km).
   */
  outOfBaseKm?: number;
}

/** Result returned by the price calculator */
export interface PriceResult {
  /** Service type echoed back for display purposes */
  serviceType: ServiceType;
  vehicleType: VehicleType;

  /**
   * For TRANSFER: exact price in euros (number).
   * For AIRPORT / LEISURE: price range (PriceRange).
   * For MAD: exact price in euros (number).
   */
  price: number | PriceRange;

  /**
   * Optional surcharge added on top of the base price.
   * Applies when the local pickup point is outside the base area
   * (road distance from Gare de Valenciennes ≥ 3 km).
   */
  outOfBaseSurcharge?: number;

  /** Human-readable breakdown lines (for display in the booking form) */
  breakdown: string[];

  /** Whether the result is a fixed price (true) or an estimate (false) */
  isFixed: boolean;
}
