/**
 * MS Prestige Driver — Firebase Cloud Functions
 *
 * Functions exposed:
 *  - createCheckoutSession  (callable) : Creates a Stripe Checkout session with
 *                                        the correct deposit amount based on CGV rules.
 *  - stripeWebhook          (HTTP)     : Receives Stripe webhook events, saves the
 *                                        reservation to Firestore, and sends
 *                                        confirmation emails via Resend.
 *
 * Deposit rules (CGV Article 2):
 *  - departure > 7 days away  → 50 % of total price
 *  - departure < 7 days away  → 30 % of total price
 *  - departure < 24 h away    → 100 % of total price
 *
 * Cancellation policy (CGV Article 4):
 *  - > 72 h before            → 30 % of total is refunded
 *  - < 72 h before            → no refund
 *  - No-show                  → no refund
 */

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { loadTariffs, transferPrice, madPrice } from './pricing';

// ── Firebase Admin init ───────────────────────────────────────────────────────
initializeApp();
const db = getFirestore();

// ── Global region ────────────────────────────────────────────────────────────
// CORS is configured per-function on onCall (see createCheckoutSession below)

// ── Runtime secrets (set via: firebase functions:secrets:set SECRET_NAME) ────
// Access via functions.params.defineSecret in v2
import { defineSecret } from 'firebase-functions/params';

const STRIPE_SECRET_KEY   = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const RESEND_API_KEY      = defineSecret('RESEND_API_KEY');
const RESEND_FROM_EMAIL   = defineSecret('RESEND_FROM_EMAIL');
const ADMIN_EMAIL         = defineSecret('ADMIN_EMAIL');

// Flat surcharge (EUR) added when the client books with a pet. Must stay in
// sync with PET_SURCHARGE in components/pages/VehicleSelectionPage.tsx.
const PET_SURCHARGE = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingData {
  /** Estimated total price in euros (number) */
  totalPrice: number;
  /** ISO date-time string of the departure */
  departureDateTime: string;
  /** Human-readable departure address */
  departureAddress: string;
  /** Human-readable arrival address (empty for MAD) */
  arrivalAddress?: string;
  /** 'BUSINESS' | 'VAN' */
  vehicleType: 'BUSINESS' | 'VAN';
  /** 'TRANSFER' | 'MAD' | 'AIRPORT' | 'LEISURE' */
  serviceType: 'TRANSFER' | 'MAD' | 'AIRPORT' | 'LEISURE';
  /** 'one_way' | 'round_trip' */
  tripType?: string;
  /** Number of passengers */
  passengers: number;
  /** Duration in hours — MAD only */
  durationHours?: number;
  /** Distance in km — TRANSFER only */
  distanceKm?: number;
  /** Whether the client booked with a pet (adds a flat surcharge) */
  pet?: boolean;
  /** Transport au Féminin: apply the women surcharge (percent from Firestore) */
  womenService?: boolean;
  /** UI locale: 'fr' | 'en' | 'nl' */
  locale: string;
  /** Client full name */
  clientName: string;
  /** Client email */
  clientEmail: string;
  /** Client phone number */
  clientPhone: string;
  /** Optional notes */
  notes?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculate the deposit percentage based on CGV Article 2.
 * Returns a value between 0 and 1 (e.g. 0.5 = 50 %).
 */
function getDepositRatio(departureDateTime: string): number {
  const now        = Date.now();
  const departure  = new Date(departureDateTime).getTime();
  const diffMs     = departure - now;
  const diffHours  = diffMs / (1000 * 60 * 60);

  if (diffHours < 24)  return 1.0;   // < 24 h → 100 %
  if (diffHours < 168) return 0.30;  // < 7 days → 30 %
  return 0.50;                        // > 7 days → 50 %
}

/**
 * Round a monetary amount to 2 decimal places and convert to Stripe cents.
 */
function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Build a human-readable service label for the Stripe line item.
 */
function buildServiceLabel(data: BookingData, depositRatio: number): string {
  const vehicle = data.vehicleType === 'BUSINESS' ? 'Business' : 'Van';
  const pct     = Math.round(depositRatio * 100);

  const serviceLabels: Record<string, string> = {
    TRANSFER : 'Transfert',
    MAD      : 'Mise à Disposition',
    AIRPORT  : 'Transfert Aéroport',
    LEISURE  : 'Escapade & Loisirs',
  };

  return `Acompte ${pct}% — ${serviceLabels[data.serviceType] ?? data.serviceType} (${vehicle})`;
}

// ── Human-readable labels for confirmation emails ─────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  TRANSFER : 'Transfert',
  MAD      : 'Mise à Disposition',
  AIRPORT  : 'Transfert Aéroport',
  LEISURE  : 'Escapade & Loisirs',
};

const VEHICLE_LABELS: Record<string, string> = {
  BUSINESS : 'Berline Business',
  VAN      : 'Van de Luxe',
};

// ── CORS ──────────────────────────────────────────────────────────────────────
// Firebase Hosting serves the site on BOTH *.web.app and *.firebaseapp.com, and
// neither can be disabled. Both must be allowed or every browser call from the
// omitted domain is blocked by CORS. Keep in sync with cors.json (Storage).
const ALLOWED_ORIGINS = [
  'https://mon-van-prestige.web.app',
  'https://mon-van-prestige.firebaseapp.com',
  'http://localhost:3000',
];

// ── Cloud Function: createCheckoutSession ─────────────────────────────────────

export const createCheckoutSession = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [STRIPE_SECRET_KEY],
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    // CORS is handled automatically by the "cors" option in onRequest above.
    // Do NOT set Access-Control-Allow-Origin manually — it conflicts with the
    // built-in handler and breaks localhost during development.

    const body = req.body as { data?: BookingData } | BookingData;
    const data: BookingData = ('data' in body && body.data) ? body.data : body as BookingData;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!data.totalPrice || data.totalPrice <= 0) {
      res.status(400).json({ error: 'totalPrice must be > 0' }); return;
    }
    if (!data.departureDateTime) {
      res.status(400).json({ error: 'departureDateTime is required' }); return;
    }
    if (!data.clientEmail || !data.clientName || !data.clientPhone) {
      res.status(400).json({ error: 'clientName, clientEmail, clientPhone are required' }); return;
    }

    // ── Server-side price recomputation (anti-tampering) ─────────────────────
    // Never trust the browser-supplied totalPrice. Recompute the expected price
    // from the live Firestore grid and reject requests that diverge. The
    // Stripe amount is always billed from the server-computed value.
    const tariffs = await loadTariffs(db);
    let serverTotal: number | null = null;

    if (data.serviceType === 'TRANSFER') {
      if (typeof data.distanceKm !== 'number' || data.distanceKm <= 0) {
        res.status(400).json({ error: 'distanceKm is required for a TRANSFER' }); return;
      }
      const km = data.distanceKm * (data.tripType === 'round_trip' ? 2 : 1);
      serverTotal = transferPrice(km, data.vehicleType, tariffs);
      // Round-trip discount: -20% on the return leg. For a symmetric round trip
      // (outbound = return) this equals 10% off the doubled-distance total.
      if (data.tripType === 'round_trip') serverTotal = Math.ceil(serverTotal * 0.9);
    } else if (data.serviceType === 'MAD') {
      if (typeof data.durationHours !== 'number' || data.durationHours <= 0) {
        res.status(400).json({ error: 'durationHours is required for a MAD' }); return;
      }
      serverTotal = madPrice(data.durationHours, data.vehicleType, tariffs);
    }

    // For TRANSFER / MAD we can fully recompute → enforce it. AIRPORT / LEISURE
    // are fixed packages not booked through this flow, so they keep the client
    // value (they never reach here in practice).
    if (serverTotal !== null) {
      // Transport au Féminin surcharge — server-authoritative, read from Firestore
      // (tarifs/women_surcharge.percentage, default 20). Applied on the fare
      // after the round-trip discount and before the flat pet surcharge.
      if (data.womenService) {
        const wDoc = await db.doc('tarifs/women_surcharge').get();
        const pct = wDoc.exists && typeof wDoc.data()?.percentage === 'number'
          ? (wDoc.data()!.percentage as number) : 20;
        serverTotal = Math.ceil(serverTotal * (1 + pct / 100));
      }
      // Server-authoritative extras: bill the pet surcharge online as well.
      if (data.pet) serverTotal += PET_SURCHARGE;
      // Allow a 1 € rounding buffer; anything larger is treated as tampering.
      const drift = Math.abs(serverTotal - data.totalPrice);
      const tolerance = Math.max(1, serverTotal * 0.02);
      if (drift > tolerance) {
        console.warn(
          `[createCheckoutSession] price mismatch — client=${data.totalPrice} ` +
          `server=${serverTotal} (${data.serviceType}/${data.vehicleType}). Rejecting.`
        );
        res.status(400).json({ error: 'Price validation failed' }); return;
      }
      // Bill the server-computed price, not the client one.
      data.totalPrice = serverTotal;
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY.value());

    // ── Compute deposit ──────────────────────────────────────────────────────
    const depositRatio  = getDepositRatio(data.departureDateTime);
    const depositAmount = data.totalPrice * depositRatio;
    const label         = buildServiceLabel(data, depositRatio);

    // ── Build success / cancel URLs ──────────────────────────────────────────
    const locale      = data.locale ?? 'fr';
    const baseUrl     = 'https://mon-van-prestige.web.app';
    const successUrl  = `${baseUrl}/${locale}/reservation/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl   = `${baseUrl}/${locale}/reservation/cancel`;

    // ── Save a pending reservation to Firestore ──────────────────────────────
    const reservationRef = db.collection('reservations').doc();
    await reservationRef.set({
      status          : 'pending_payment',
      createdAt       : Timestamp.now(),
      departureDateTime: data.departureDateTime,
      departureAddress: data.departureAddress,
      arrivalAddress  : data.arrivalAddress ?? '',
      vehicleType     : data.vehicleType,
      serviceType     : data.serviceType,
      tripType        : data.tripType ?? 'one_way',
      passengers      : data.passengers,
      durationHours   : data.durationHours ?? null,
      distanceKm      : data.distanceKm ?? null,
      totalPrice      : data.totalPrice,
      depositRatio    : depositRatio,
      depositAmount   : depositAmount,
      locale          : locale,
      client: {
        name  : data.clientName,
        email : data.clientEmail,
        phone : data.clientPhone,
        notes : data.notes ?? '',
      },
      stripeSessionId : null, // filled after session creation
    });

    // ── Create Stripe Checkout session ───────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode                : 'payment',
      locale              : locale === 'nl' ? 'nl' : locale === 'en' ? 'en' : 'fr',
      customer_email      : data.clientEmail,
      line_items: [
        {
          quantity    : 1,
          price_data  : {
            currency    : 'eur',
            unit_amount : toCents(depositAmount),
            product_data: {
              name       : label,
              description: `Départ : ${data.departureAddress} — ${new Date(data.departureDateTime).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`,
            },
          },
        },
      ],
      metadata: {
        reservationId   : reservationRef.id,
        clientName      : data.clientName,
        clientPhone     : data.clientPhone,
        serviceType     : data.serviceType,
        vehicleType     : data.vehicleType,
        departureDateTime: data.departureDateTime,
        departureAddress: data.departureAddress,
        arrivalAddress  : data.arrivalAddress ?? '',
        totalPrice      : String(data.totalPrice),
        depositRatio    : String(depositRatio),
        depositAmount   : String(depositAmount),
        locale          : locale,
      },
      success_url: successUrl,
      cancel_url : cancelUrl,
    });

    // ── Update reservation with Stripe session ID ────────────────────────────
    await reservationRef.update({ stripeSessionId: session.id });

    res.json({ result: { sessionUrl: session.url } });
  }
);

// ── Cloud Function: stripeWebhook ─────────────────────────────────────────────

export const stripeWebhook = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_EMAIL],
  },
  async (req, res) => {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const sig    = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send('Webhook Error: Invalid signature');
      return;
    }

    // ── Handle checkout.session.completed ────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session  = event.data.object as Stripe.Checkout.Session;
      const meta     = session.metadata ?? {};
      const resId    = meta.reservationId;

      if (!resId) {
        console.warn('No reservationId in session metadata');
        res.sendStatus(200);
        return;
      }

      // Update Firestore reservation status
      await db.collection('reservations').doc(resId).update({
        status         : 'confirmed',
        paidAt         : Timestamp.now(),
        stripePaymentId: session.payment_intent,
        amountPaid     : session.amount_total ? session.amount_total / 100 : 0,
      });

      // Send confirmation emails
      const resend      = new Resend(RESEND_API_KEY.value());
      const fromEmail   = RESEND_FROM_EMAIL.value();
      const adminEmail  = ADMIN_EMAIL.value();

      const departureDate = new Date(meta.departureDateTime).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const departureTime = new Date(meta.departureDateTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
      });
      const depositPct  = Math.round(parseFloat(meta.depositRatio ?? '0') * 100);
      const totalPrice  = parseFloat(meta.totalPrice ?? '0');
      const depositAmt  = parseFloat(meta.depositAmount ?? '0');
      const remaining   = totalPrice - depositAmt;

      const serviceLabel  = SERVICE_LABELS[meta.serviceType] ?? meta.serviceType;
      const vehicleLabel  = VEHICLE_LABELS[meta.vehicleType] ?? meta.vehicleType;

      // ── Email to client ────────────────────────────────────────────────────
      await resend.emails.send({
        from   : `MS Prestige Driver <${fromEmail}>`,
        to     : [session.customer_email ?? meta.clientName],
        subject: '✅ Confirmation de votre réservation — MS Prestige Driver',
        html   : `
          <div style="font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">

            <!-- Header -->
            <div style="background:#1a1a1a;padding:28px 32px">
              <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#D4AF37;font-weight:700">MS Prestige Driver</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7)">Votre réservation est confirmée</p>
            </div>

            <!-- Body -->
            <div style="padding:32px">
              <p style="font-size:16px;color:#333;margin:0 0 8px">Bonjour <strong>${meta.clientName}</strong>,</p>
              <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.5">Votre réservation a bien été enregistrée et votre acompte de <strong style="color:#333">${depositPct}%</strong> reçu. Voici le récapitulatif :</p>

              <!-- Summary table -->
              <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">
                <tr>
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee;width:40%">Service</td>
                  <td style="padding:12px 16px;color:#333;border-bottom:1px solid #eee">${serviceLabel}</td>
                </tr>
                <tr style="background:#f9f9f9">
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Véhicule</td>
                  <td style="padding:12px 16px;color:#333;border-bottom:1px solid #eee">${vehicleLabel}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Date</td>
                  <td style="padding:12px 16px;color:#333;border-bottom:1px solid #eee">${departureDate} à ${departureTime}</td>
                </tr>
                <tr style="background:#f9f9f9">
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Départ</td>
                  <td style="padding:12px 16px;color:#333;border-bottom:1px solid #eee">${meta.departureAddress}</td>
                </tr>
                ${meta.arrivalAddress ? `<tr>
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Arrivée</td>
                  <td style="padding:12px 16px;color:#333;border-bottom:1px solid #eee">${meta.arrivalAddress}</td>
                </tr>` : ''}
                <tr style="background:#f9f9f9">
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Prix total estimé</td>
                  <td style="padding:12px 16px;color:#333;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${totalPrice} €</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid #eee">Acompte réglé (${depositPct}%)</td>
                  <td style="padding:12px 16px;color:#2e7d32;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${depositAmt.toFixed(2)} €</td>
                </tr>
                <tr style="background:#f9f9f9">
                  <td style="padding:12px 16px;color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Solde restant dû</td>
                  <td style="padding:12px 16px;color:#333;font-weight:700;font-size:16px">${remaining.toFixed(2)} €</td>
                </tr>
              </table>

              <!-- Remaining balance notice -->
              <div style="background:#faf6eb;padding:16px 20px;border-left:4px solid #D4AF37;border-radius:4px;margin:0 0 24px">
                <p style="margin:0;font-size:13px;color:#555;line-height:1.5">
                  Le solde restant (<strong style="color:#333">${remaining.toFixed(2)} €</strong>) sera à régler avant le départ, à bord du véhicule par carte bancaire ou espèces.
                </p>
              </div>

              <!-- Contact -->
              <p style="font-size:14px;color:#555;margin:0 0 32px">
                Pour toute question ou modification : <a href="tel:+33783698460" style="color:#D4AF37;text-decoration:none;font-weight:600">07 83 69 84 60</a> ou WhatsApp <a href="https://wa.me/33783698460" style="color:#D4AF37;text-decoration:none;font-weight:600">+33 7 83 69 84 60</a>
              </p>

              <!-- Footer -->
              <div style="border-top:1px solid #eee;padding-top:20px">
                <p style="font-size:12px;color:#999;margin:0;line-height:1.6">
                  MS Prestige Driver — 92 rue Destreux, 59171 Onnaing<br>
                  En cas d'annulation plus de 72h avant la prestation, l'acompte est restitué à hauteur de 30% du montant total.
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // ── Email to admin (Mohammed) ──────────────────────────────────────────
      await resend.emails.send({
        from   : `Site MS Prestige Driver <${fromEmail}>`,
        to     : [adminEmail],
        subject: `🚗 Nouvelle réservation — ${meta.clientName} — ${departureDate}`,
        html   : `
          <div style="font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="font-family:'Playfair Display',Georgia,serif;color:#D4AF37">Nouvelle réservation confirmée</h2>
            <p>Un acompte de <strong>${depositAmt.toFixed(2)} € (${depositPct}%)</strong> a été reçu via Stripe.</p>

            <h3>Client</h3>
            <ul>
              <li><strong>Nom :</strong> ${meta.clientName}</li>
              <li><strong>Email :</strong> ${session.customer_email}</li>
              <li><strong>Téléphone :</strong> ${meta.clientPhone}</li>
            </ul>

            <h3>Course</h3>
            <ul>
              <li><strong>Service :</strong> ${serviceLabel}</li>
              <li><strong>Véhicule :</strong> ${vehicleLabel}</li>
              <li><strong>Date :</strong> ${departureDate} à ${departureTime}</li>
              <li><strong>Départ :</strong> ${meta.departureAddress}</li>
              ${meta.arrivalAddress ? `<li><strong>Arrivée :</strong> ${meta.arrivalAddress}</li>` : ''}
              <li><strong>Prix total estimé :</strong> ${totalPrice} €</li>
              <li><strong>Acompte encaissé :</strong> ${depositAmt.toFixed(2)} €</li>
              <li><strong>Solde à percevoir :</strong> ${remaining.toFixed(2)} €</li>
            </ul>

            <p style="font-size:12px;color:#999">ID Réservation Firestore : ${resId}<br>Stripe Session : ${session.id}</p>
          </div>
        `,
      });
    }

    res.sendStatus(200);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// Google Places — address search proxy (server-side, key hidden)
// ═════════════════════════════════════════════════════════════════════════════
//
// Why proxy through Cloud Functions instead of calling Google from the browser?
//  - The site is a static export (next.config.ts → output: 'export'), so Next.js
//    API routes are NOT available at runtime.
//  - Keeping the Google Maps API key in a Firebase secret prevents key theft and
//    protects the billing account. The browser never sees the key.
//
// Endpoints used (Places API — New):
//  - Autocomplete : POST https://places.googleapis.com/v1/places:autocomplete
//  - Place Details: GET  https://places.googleapis.com/v1/places/{placeId}
//  - Geocoding    : GET  https://maps.googleapis.com/maps/api/geocode/json
//
// Billing note: Autocomplete + Place Details calls should share a session token
// (a UUID generated per user typing session). Google then bills them as a single
// "Autocomplete (per session)" unit instead of per keystroke. The frontend
// generates the token and passes it through on both calls.
//
// Setup (one-time):
//   1. Google Cloud console → enable "Places API (New)" and "Geocoding API".
//   2. Create an API key; restrict it to those two APIs (no HTTP-referrer
//      restriction needed — it is only ever used server-side).
//   3. firebase functions:secrets:set GOOGLE_MAPS_API_KEY

const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');

/** Regions the address search is restricted to (France + Belgium). */
const PLACES_REGION_CODES = ['fr', 'be'];

const PLACES_CORS = ALLOWED_ORIGINS;

interface AutocompleteSuggestion {
  /** Google place_id, used to fetch coordinates via placeDetails */
  placeId: string;
  /** Full human-readable suggestion text */
  description: string;
}

/**
 * placesAutocomplete — returns address suggestions for a free-text input.
 *
 * Request body: { input: string, sessionToken?: string, language?: string }
 * Response:     { suggestions: AutocompleteSuggestion[] }
 */
export const placesAutocomplete = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [GOOGLE_MAPS_API_KEY],
    cors: PLACES_CORS,
  },
  async (req, res) => {
    const body = req.body as {
      input?: string;
      sessionToken?: string;
      language?: string;
    };
    const input = (body.input ?? '').trim();

    if (input.length < 3) {
      res.status(200).json({ suggestions: [] });
      return;
    }

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY.value(),
          },
          body: JSON.stringify({
            input,
            languageCode: body.language ?? 'fr',
            includedRegionCodes: PLACES_REGION_CODES,
            sessionToken: body.sessionToken,
          }),
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        console.error('[placesAutocomplete] Google error:', response.status, detail);
        res.status(502).json({ error: 'Places autocomplete failed', suggestions: [] });
        return;
      }

      const data = (await response.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string;
            text?: { text?: string };
          };
        }>;
      };

      const suggestions: AutocompleteSuggestion[] = (data.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
        .map((p) => ({
          placeId: p.placeId as string,
          description: p.text?.text ?? '',
        }));

      res.status(200).json({ suggestions });
    } catch (error) {
      console.error('[placesAutocomplete] request failed:', error);
      res.status(500).json({ error: 'Internal error', suggestions: [] });
    }
  }
);

/**
 * placeDetails — resolves a place_id to precise coordinates.
 *
 * Request body: { placeId: string, sessionToken?: string, language?: string }
 * Response:     { lat: number, lng: number, formattedAddress: string }
 */
export const placeDetails = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [GOOGLE_MAPS_API_KEY],
    cors: PLACES_CORS,
  },
  async (req, res) => {
    const body = req.body as {
      placeId?: string;
      sessionToken?: string;
      language?: string;
    };
    const placeId = (body.placeId ?? '').trim();

    if (!placeId) {
      res.status(400).json({ error: 'placeId is required' });
      return;
    }

    try {
      const url =
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
        `?languageCode=${encodeURIComponent(body.language ?? 'fr')}` +
        (body.sessionToken ? `&sessionToken=${encodeURIComponent(body.sessionToken)}` : '');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY.value(),
          // Field mask — only bill for and fetch what we need.
          'X-Goog-FieldMask': 'location,formattedAddress',
        },
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error('[placeDetails] Google error:', response.status, detail);
        res.status(502).json({ error: 'Place details failed' });
        return;
      }

      const data = (await response.json()) as {
        location?: { latitude?: number; longitude?: number };
        formattedAddress?: string;
      };

      if (
        typeof data.location?.latitude !== 'number' ||
        typeof data.location?.longitude !== 'number'
      ) {
        res.status(404).json({ error: 'No location for this place' });
        return;
      }

      res.status(200).json({
        lat: data.location.latitude,
        lng: data.location.longitude,
        formattedAddress: data.formattedAddress ?? '',
      });
    } catch (error) {
      console.error('[placeDetails] request failed:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
);

/**
 * geocode — free-text address → coordinates (Geocoding API).
 *
 * Used by server-side utilities (e.g. out-of-base distance) where there is no
 * interactive autocomplete session. For the booking form, prefer the
 * placesAutocomplete → placeDetails flow, which is more precise.
 *
 * Request body: { address: string, language?: string }
 * Response:     { lat, lng, formattedAddress } or 404
 */
export const geocode = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [GOOGLE_MAPS_API_KEY],
    cors: PLACES_CORS,
  },
  async (req, res) => {
    const body = req.body as { address?: string; language?: string };
    const address = (body.address ?? '').trim();

    if (!address) {
      res.status(400).json({ error: 'address is required' });
      return;
    }

    try {
      const url =
        'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(address)}` +
        `&language=${encodeURIComponent(body.language ?? 'fr')}` +
        `&region=fr&components=country:FR|country:BE` +
        `&key=${GOOGLE_MAPS_API_KEY.value()}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('[geocode] Google error:', response.status);
        res.status(502).json({ error: 'Geocoding failed' });
        return;
      }

      const data = (await response.json()) as {
        status?: string;
        results?: Array<{
          geometry?: { location?: { lat?: number; lng?: number } };
          formatted_address?: string;
        }>;
      };

      const first = data.results?.[0];
      if (data.status !== 'OK' || !first?.geometry?.location) {
        res.status(404).json({ error: 'Address not found' });
        return;
      }

      res.status(200).json({
        lat: first.geometry.location.lat,
        lng: first.geometry.location.lng,
        formattedAddress: first.formatted_address ?? '',
      });
    } catch (error) {
      console.error('[geocode] request failed:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
);

// ── directions (HTTP) ──────────────────────────────────────────────────────
// Server-side proxy to the Google Directions API. Keeps GOOGLE_MAPS_API_KEY
// secret (never exposed client-side). Replaces the previous OSRM/ORS calls
// (brique 2 of the OSM → Google migration).
//
// Request  (POST JSON): { origin: {lat,lng}, destination: {lat,lng}, language? }
// Response (200 JSON) : { distanceKm, durationMin, coords: [[lat,lng], ...] }
//
// `coords` is the decoded overview polyline, returned as [lat, lng] pairs so it
// can be fed directly to Leaflet / Google Maps JS (brique 3) without any
// client-side transform — this matches the shape the old OSRM getRoute returned.

/** Decode a Google-encoded polyline into an array of [lat, lng] pairs. */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export const directions = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [GOOGLE_MAPS_API_KEY],
    cors: PLACES_CORS,
  },
  async (req, res) => {
    const body = req.body as {
      origin?: { lat?: number; lng?: number };
      destination?: { lat?: number; lng?: number };
      language?: string;
    };
    const o = body.origin;
    const d = body.destination;

    if (
      !o ||
      !d ||
      typeof o.lat !== 'number' ||
      typeof o.lng !== 'number' ||
      typeof d.lat !== 'number' ||
      typeof d.lng !== 'number'
    ) {
      res.status(400).json({ error: 'origin and destination {lat,lng} are required' });
      return;
    }

    try {
      const url =
        'https://maps.googleapis.com/maps/api/directions/json' +
        `?origin=${o.lat},${o.lng}` +
        `&destination=${d.lat},${d.lng}` +
        `&mode=driving&region=fr&units=metric` +
        `&language=${encodeURIComponent(body.language ?? 'fr')}` +
        `&key=${GOOGLE_MAPS_API_KEY.value()}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('[directions] Google error:', response.status);
        res.status(502).json({ error: 'Directions request failed' });
        return;
      }

      const data = (await response.json()) as {
        status?: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{
            distance?: { value?: number };
            duration?: { value?: number };
          }>;
        }>;
      };

      const route = data.routes?.[0];
      const leg = route?.legs?.[0];

      if (data.status !== 'OK' || !route || leg?.distance?.value == null) {
        res.status(404).json({ error: 'No route found' });
        return;
      }

      const distanceMeters = leg?.distance?.value ?? 0;
      const durationSeconds = leg?.duration?.value ?? 0;
      const encoded = route?.overview_polyline?.points ?? '';

      res.status(200).json({
        distanceKm: distanceMeters / 1000,
        durationMin: Math.round(durationSeconds / 60),
        coords: encoded ? decodePolyline(encoded) : [],
      });
    } catch (error) {
      console.error('[directions] request failed:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
);

