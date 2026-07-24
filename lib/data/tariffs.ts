/**
 * MS Prestige Driver — Tariff data (2026 edition)
 *
 * Source: "GRILLE TARIFAIRE MS PRESTIGE DRIVER 2026.xlsx"
 *
 * This file mirrors the Firestore `tarifs` collection.
 * It is used as a static fallback and for client-side price calculation
 * when a Firestore fetch is not required.
 *
 * Format for fixed-price packages: { min, max } in euros — DIRECTIONAL fares:
 *   min = departure from Valenciennes → destination (grid "300///390" → 300)
 *   max = destination → Valenciennes (grid "300///390" → 390)
 * Format for per-km brackets: rate in €/km or flat fee in €.
 * Format for MAD: rate in €/hour.
 */

import type {
  AirportDestination,
  LeisureDestination,
  PriceRange,
  VehicleType,
} from '@/lib/types/pricing';

// ---------------------------------------------------------------------------
// Airport packages — directional one-way fares:
//   min = Valenciennes → airport, max = airport → Valenciennes
// ---------------------------------------------------------------------------
export const AIRPORT_PRICES: Record<
  AirportDestination,
  Record<VehicleType, PriceRange>
> = {
  CDG: {
    BUSINESS: { min: 300, max: 390 },
    VAN: { min: 390, max: 550 },
  },
  ORLY: {
    BUSINESS: { min: 360, max: 450 },
    VAN: { min: 420, max: 590 },
  },
  ZAVENTEM: {
    BUSINESS: { min: 190, max: 230 },
    VAN: { min: 235, max: 320 },
  },
  CHARLEROI: {
    BUSINESS: { min: 145, max: 180 },
    VAN: { min: 180, max: 240 },
  },
  LESQUIN: {
    BUSINESS: { min: 90, max: 130 },
    VAN: { min: 130, max: 170 },
  },
  GARES: {
    BUSINESS: { min: 90, max: 140 },
    VAN: { min: 140, max: 180 },
  },
};

// ---------------------------------------------------------------------------
// Leisure / theme-park packages — directional one-way fares:
//   min = Valenciennes → venue, max = venue → Valenciennes
// ---------------------------------------------------------------------------
export const LEISURE_PRICES: Record<
  LeisureDestination,
  Record<VehicleType, PriceRange>
> = {
  ASTERIX: {
    BUSINESS: { min: 275, max: 350 },
    VAN: { min: 360, max: 450 },
  },
  WALIBI: {
    BUSINESS: { min: 140, max: 200 },
    VAN: { min: 240, max: 270 },
  },
  DISNEY: {
    BUSINESS: { min: 340, max: 450 },
    VAN: { min: 399, max: 590 },
  },
  LENS: {
    BUSINESS: { min: 110, max: 140 },
    VAN: { min: 150, max: 180 },
  },
  LOSC: {
    BUSINESS: { min: 90, max: 140 },
    VAN: { min: 130, max: 155 },
  },
};

// ---------------------------------------------------------------------------
// MAD (Mise à Disposition) hourly rates in €/hour
// ---------------------------------------------------------------------------
export const MAD_RATES: Record<VehicleType, number> = {
  BUSINESS: 55,
  VAN: 90,
};

// ---------------------------------------------------------------------------
// Per-km bracket pricing for TRANSFER service
//
// Business brackets:
//   0–7 km  → flat 22 € (minimum fare)
//   8–14 km → flat 26 €
//   14–50 km → 1.99 €/km
//   51–100 km → 1.95 €/km
//   101–151 km → 1.75 €/km
//   > 151 km → 1.65 €/km
//
// Van brackets:
//   0–5 km  → flat 45 € (minimum fare)
//   6–14 km → flat 55 €
//   15–19 km → flat 59 €
//   20–25 km → 3.10 €/km
//   26–50 km → 2.90 €/km
//   51–100 km → 2.50 €/km
//   101–200 km → 2.05 €/km
//   > 201 km → 1.95 €/km
// ---------------------------------------------------------------------------

export interface KmBracket {
  /** Inclusive lower bound in km */
  from: number;
  /** Inclusive upper bound in km (Infinity for the last bracket) */
  to: number;
  /** Fixed flat price in € — use when the entire bracket is one flat fee */
  flat?: number;
  /** Per-km rate in €/km — use when the price scales with distance */
  ratePerKm?: number;
}

export const TRANSFER_BRACKETS: Record<VehicleType, KmBracket[]> = {
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
};

// ---------------------------------------------------------------------------
// Hors-base (out-of-base) surcharge
//
// Base point = Gare de Valenciennes. The brackets are keyed on the ROAD
// distance between the base and the local pickup point ("3///6KM" in the grid
// = pickup between 3 and 6 km from the base).
// The surcharge applies to EVERY service (TRANSFER, MAD, AIRPORT, LEISURE)
// and is added flat on top of the service price.
//
// NOTE — gap closing: the source grid lists "3////6KM" then "7///13KM", leaving
// 6–7 km undefined (same for the Van between 6 and 7 km). The lower bracket is
// extended to 7 km so every distance resolves to a price. Bounds are
// half-open on the upper side in practice: findBracket() returns the FIRST
// matching bracket, so a shared boundary resolves to the lower tier.
// ⚠️ To be confirmed with Mohammed — if he wants the higher tier from 6 km,
// only the `to` values below need changing (or the Firestore document).
//
// Business:
//   3–6 km → flat 10 €
//   7–13 km → flat 12 €
//   13–25 km → 0.90 €/km
//   > 26 km → 0.70 €/km
//
// Van:
//   3–6 km → flat 10 €
//   7–14 km → 1.50 €/km
//   15–25 km → 1.20 €/km
//   > 25 km → 0.90 €/km
// ---------------------------------------------------------------------------

export const OUT_OF_BASE_BRACKETS: Record<VehicleType, KmBracket[]> = {
  BUSINESS: [
    { from: 0, to: 3, flat: 0 },    // Within base — no surcharge
    { from: 3, to: 7, flat: 10 },   // grid "3////6KM" — extended to 7 to close the gap
    { from: 7, to: 13, flat: 12 },
    { from: 13, to: 26, ratePerKm: 0.9 },
    { from: 26, to: Infinity, ratePerKm: 0.7 },
  ],
  VAN: [
    { from: 0, to: 3, flat: 0 },    // Within base — no surcharge
    { from: 3, to: 7, flat: 10 },   // grid "3///6KM" — extended to 7 to close the gap
    { from: 7, to: 15, ratePerKm: 1.5 },
    { from: 15, to: 25, ratePerKm: 1.2 },
    { from: 25, to: Infinity, ratePerKm: 0.9 },
  ],
};

// ---------------------------------------------------------------------------
// Minimum fares (convenience constants)
// ---------------------------------------------------------------------------
export const MINIMUM_FARES: Record<VehicleType, number> = {
  BUSINESS: 22,
  VAN: 45,
};
