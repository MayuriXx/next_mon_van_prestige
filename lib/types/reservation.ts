/**
 * Reservation types for MS Prestige Driver
 *
 * These types are shared between the client-side booking form
 * and the Firebase Cloud Function (createCheckoutSession).
 *
 * Business rules:
 *  - A reservation is created in Firestore with status 'pending_payment'
 *    when the client lands on Stripe Checkout.
 *  - Status moves to 'confirmed' once the Stripe webhook fires
 *    (checkout.session.completed).
 *  - Deposit amounts follow CGV Article 2 rules.
 */

import type { ServiceType, VehicleType } from '@/lib/types/pricing';

// ── Reservation status lifecycle ─────────────────────────────────────────────

export type ReservationStatus =
  | 'pending_payment'  // Checkout session created, awaiting payment
  | 'confirmed'        // Payment received via Stripe webhook
  | 'cancelled'        // Cancelled by client or admin
  | 'completed';       // Service delivered

// ── Client info submitted in the booking form ────────────────────────────────

export interface ClientInfo {
  name  : string;
  email : string;
  phone : string;
  notes?: string;
}

// ── Payload sent to the createCheckoutSession Cloud Function ─────────────────

export interface CheckoutPayload {
  /** Estimated total price in euros */
  totalPrice        : number;
  /** ISO date-time string of the departure (e.g. '2026-07-15T09:00:00') */
  departureDateTime : string;
  /** Human-readable departure address (from Nominatim) */
  departureAddress  : string;
  /** Human-readable arrival address — empty for MAD service */
  arrivalAddress?   : string;
  vehicleType       : VehicleType;
  serviceType       : ServiceType;
  /** 'one_way' | 'round_trip' — TRANSFER only */
  tripType?         : string;
  passengers        : number;
  /** Duration in hours — MAD only */
  durationHours?    : number;
  /** Distance in km — TRANSFER only */
  distanceKm?       : number;
  /** UI locale: 'fr' | 'en' | 'nl' */
  locale            : string;
  /** Client info */
  clientName  : string;
  clientEmail : string;
  clientPhone : string;
  notes?      : string;
}

// ── Firestore document shape (collection: 'reservations') ────────────────────

export interface ReservationDoc {
  status            : ReservationStatus;
  createdAt         : unknown; // Firestore Timestamp
  paidAt?           : unknown; // Firestore Timestamp — set by webhook
  departureDateTime : string;
  departureAddress  : string;
  arrivalAddress    : string;
  vehicleType       : VehicleType;
  serviceType       : ServiceType;
  tripType          : string;
  passengers        : number;
  durationHours     : number | null;
  distanceKm        : number | null;
  totalPrice        : number;
  depositRatio      : number; // 0.30 | 0.50 | 1.0
  depositAmount     : number;
  amountPaid?       : number; // set by webhook
  locale            : string;
  client            : ClientInfo;
  stripeSessionId   : string | null;
  stripePaymentId?  : string;
}
