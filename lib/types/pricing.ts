/**
 * Pricing types for MS Prestige Driver
 *
 * Business rules:
 * - ServiceType drives which tariff table is used
 * - VehicleType (BUSINESS | VAN) determines the rate tier
 * - MAD (Mise à Disposition) is priced per hour
 * - AIRPORT and LEISURE services use fixed package pricing (round-trip included)
 * - TRANSFER (simple point-to-point) uses per-km bracket pricing
 * - A surcharge ("hors-base") applies when the pickup address is outside Valenciennes
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
 * Structured price range (min/max) used for fixed-price services.
 * Displayed as "from X€" or "X€ – Y€" depending on context.
 */
export interface PriceRange {
  min: number;
  max: number;
}

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
   * Extra distance in km from the Valenciennes base to the pickup point.
   * Used to compute the hors-base surcharge when pickup is outside Valenciennes.
   * Leave undefined or 0 when pickup is within the base area.
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
   * Applies when pickup is outside the Valenciennes base.
   */
  outOfBaseSurcharge?: number;

  /** Human-readable breakdown lines (for display in the booking form) */
  breakdown: string[];

  /** Whether the result is a fixed price (true) or an estimate (false) */
  isFixed: boolean;
}
