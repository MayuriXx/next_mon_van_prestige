/**
 * lib/reservation/places.ts
 *
 * Shared Google Places / Geocoding / Directions helpers used by every
 * reservation form on the site. Historically each page (ReservationPage,
 * TransfertSimplePage, TransportFemininPage, DeplProPage, MiseADispositionPage,
 * EvenementsSpeciauxPage…) re-implemented these identical helpers. They are now
 * centralised here so the shared <ReservationForm> and any page keep a single
 * source of truth.
 *
 * The Google Maps API key is never exposed to the browser: all calls are
 * proxied through the Firebase Cloud Functions (placesAutocomplete,
 * placeDetails, geocode, directions) which hold the key server-side. Places
 * Autocomplete + Place Details share a per-typing-session token so Google bills
 * them as a single session unit.
 */

import { reportError } from '@/lib/errors/errorBus';

export const FUNCTIONS_BASE =
  'https://europe-west1-mon-van-prestige.cloudfunctions.net';

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface Suggestion {
  placeId: string;
  description: string;
}

/** Generate a session token for grouping autocomplete + details billing. */
export function newSessionToken(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Places Autocomplete (proxied via the placesAutocomplete Cloud Function). */
export async function fetchSuggestions(
  query: string,
  sessionToken: string,
): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/placesAutocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query, sessionToken, language: 'fr' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.suggestions ?? []) as Suggestion[];
  } catch (err) {
    reportError(err, "Suggestions d'adresses indisponibles.", 'autocomplete', 'warning');
    return [];
  }
}

/** Resolve a place_id to precise coordinates via Place Details. */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/placeDetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, sessionToken, language: 'fr' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
    return { lat: data.lat, lng: data.lng, label: data.formattedAddress ?? '' };
  } catch (err) {
    reportError(err, 'Impossible de récupérer cette adresse.', 'geocode', 'warning');
    return null;
  }
}

/** Free-text geocoding fallback (used when no suggestion was picked). */
export async function geocode(address: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, language: 'fr' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
    return { lat: data.lat, lng: data.lng, label: data.formattedAddress ?? '' };
  } catch (err) {
    reportError(err, 'Adresse introuvable. Vérifiez votre saisie.', 'geocode');
    return null;
  }
}

/**
 * Pricing base point — Gare de Valenciennes.
 * All out-of-base surcharges are keyed on the road distance between this point
 * and the local pickup address (see OUT_OF_BASE_BRACKETS in lib/data/tariffs.ts).
 */
export const VALENCIENNES_BASE: GeoPoint = {
  lat: 50.3623,
  lng: 3.5166,
  label: 'Gare de Valenciennes',
};

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coords: [number, number][];
}

/** Driving route between two points (via the `directions` Cloud Function). */
export async function getRoute(
  from: GeoPoint,
  to: GeoPoint,
): Promise<RouteResult | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: from.lat, lng: from.lng },
        destination: { lat: to.lat, lng: to.lng },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.distanceKm !== 'number' || !Array.isArray(data.coords)) return null;
    return {
      distanceKm: data.distanceKm,
      durationMin: data.durationMin,
      coords: data.coords as [number, number][],
    };
  } catch (err) {
    reportError(err, "Impossible de calculer l'itinéraire. Réessayez.", 'route');
    return null;
  }
}

/**
 * Road distance (km) from the base (Gare de Valenciennes) to a pickup point.
 * Used to price the out-of-base surcharge. Returns null when the Directions
 * call fails — callers should then treat the surcharge as 0 rather than block
 * the quote/booking.
 */
export async function getBaseApproachKm(pickup: GeoPoint): Promise<number | null> {
  const route = await getRoute(VALENCIENNES_BASE, pickup);
  return route ? route.distanceKm : null;
}
