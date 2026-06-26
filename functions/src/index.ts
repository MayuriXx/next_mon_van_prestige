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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { Resend } from 'resend';

// ── Firebase Admin init ───────────────────────────────────────────────────────
initializeApp();
const db = getFirestore();

// ── Runtime secrets (set via: firebase functions:secrets:set SECRET_NAME) ────
// Access via functions.params.defineSecret in v2
import { defineSecret } from 'firebase-functions/params';

const STRIPE_SECRET_KEY   = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const RESEND_API_KEY      = defineSecret('RESEND_API_KEY');
const RESEND_FROM_EMAIL   = defineSecret('RESEND_FROM_EMAIL');
const ADMIN_EMAIL         = defineSecret('ADMIN_EMAIL');

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

// ── Cloud Function: createCheckoutSession ─────────────────────────────────────

export const createCheckoutSession = onCall(
  {
    region: 'europe-west1',
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    // Reject unauthenticated calls (optional — remove if no Firebase Auth)
    // if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

    const data = request.data as BookingData;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!data.totalPrice || data.totalPrice <= 0) {
      throw new HttpsError('invalid-argument', 'totalPrice must be > 0');
    }
    if (!data.departureDateTime) {
      throw new HttpsError('invalid-argument', 'departureDateTime is required');
    }
    if (!data.clientEmail || !data.clientName || !data.clientPhone) {
      throw new HttpsError('invalid-argument', 'clientName, clientEmail, clientPhone are required');
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

    return { sessionUrl: session.url };
  }
);

// ── Cloud Function: stripeWebhook ─────────────────────────────────────────────

export const stripeWebhook = onRequest(
  {
    region : 'europe-west1',
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

      // ── Email to client ────────────────────────────────────────────────────
      await resend.emails.send({
        from   : `MS Prestige Driver <${fromEmail}>`,
        to     : [session.customer_email ?? meta.clientName],
        subject: '✅ Confirmation de votre réservation — MS Prestige Driver',
        html   : `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden">
            <div style="background:#C9A84C;padding:24px 32px">
              <h1 style="margin:0;font-size:22px;color:#0a0a0a">MS Prestige Driver</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(0,0,0,0.7)">Votre réservation est confirmée</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:16px">Bonjour <strong>${meta.clientName}</strong>,</p>
              <p>Votre réservation a bien été enregistrée et votre acompte de <strong>${depositPct}%</strong> reçu. Voici le récapitulatif :</p>

              <table style="width:100%;border-collapse:collapse;margin:24px 0">
                <tr style="background:#1a1a1a"><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Service</td><td style="padding:10px 16px">${meta.serviceType}</td></tr>
                <tr><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Véhicule</td><td style="padding:10px 16px">${meta.vehicleType}</td></tr>
                <tr style="background:#1a1a1a"><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Date</td><td style="padding:10px 16px">${departureDate} à ${departureTime}</td></tr>
                <tr><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Départ</td><td style="padding:10px 16px">${meta.departureAddress}</td></tr>
                ${meta.arrivalAddress ? `<tr style="background:#1a1a1a"><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Arrivée</td><td style="padding:10px 16px">${meta.arrivalAddress}</td></tr>` : ''}
                <tr style="background:#1a1a1a"><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Prix total estimé</td><td style="padding:10px 16px"><strong>${totalPrice} €</strong></td></tr>
                <tr><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Acompte réglé (${depositPct}%)</td><td style="padding:10px 16px;color:#4caf50"><strong>${depositAmt.toFixed(2)} €</strong></td></tr>
                <tr style="background:#1a1a1a"><td style="padding:10px 16px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Solde restant dû</td><td style="padding:10px 16px">${remaining.toFixed(2)} €</td></tr>
              </table>

              <p style="font-size:13px;color:rgba(255,255,255,0.6);background:#1a1a1a;padding:16px;border-left:3px solid #C9A84C;border-radius:4px">
                Le solde restant (<strong>${remaining.toFixed(2)} €</strong>) sera à régler avant le départ, à bord du véhicule par carte bancaire ou espèces.
              </p>

              <p>Pour toute question ou modification : <a href="tel:+33783698460" style="color:#C9A84C">07 83 69 84 60</a> ou WhatsApp <a href="https://wa.me/33783698460" style="color:#C9A84C">+33 7 83 69 84 60</a></p>

              <p style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:32px;border-top:1px solid #333;padding-top:16px">
                MS Prestige Driver — 92 rue Destreux, 59171 Onnaing<br>
                En cas d'annulation plus de 72h avant la prestation, l'acompte est restitué à hauteur de 30% du montant total.
              </p>
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
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#C9A84C">Nouvelle réservation confirmée</h2>
            <p>Un acompte de <strong>${depositAmt.toFixed(2)} € (${depositPct}%)</strong> a été reçu via Stripe.</p>

            <h3>Client</h3>
            <ul>
              <li><strong>Nom :</strong> ${meta.clientName}</li>
              <li><strong>Email :</strong> ${session.customer_email}</li>
              <li><strong>Téléphone :</strong> ${meta.clientPhone}</li>
            </ul>

            <h3>Course</h3>
            <ul>
              <li><strong>Service :</strong> ${meta.serviceType}</li>
              <li><strong>Véhicule :</strong> ${meta.vehicleType}</li>
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
