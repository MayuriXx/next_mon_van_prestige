/**
 * MS Prestige Driver — Routing utility
 *
 * Calculates driving distance in kilometres between two geographic points
 * using the Google Directions API, proxied through the `directions` Cloud
 * Function (functions/src/index.ts) so the Google Maps API key stays
 * server-side and is never exposed to the browser.
 *
 * This replaces the previous OpenRouteService / OSRM implementation as part of
 * the OSM → Google migration (brique 2).
 *
 * Fallback: if the directions function is unavailable, the Haversine formula
 * provides a straight-line distance approximation (multiplied by a road-distance
 * correction factor) so pricing never hard-fails.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoutingResult {
  /** Driving distance in kilometres */
  distanceKm: number;
  /** Driving duration in seconds */
  durationSeconds: number;
  /** True if the result came from the directions API, false if it's a Haversine estimate */
  isEstimate: boolean;
}

// ---------------------------------------------------------------------------
// Haversine fallback (straight-line distance × road factor)
// ---------------------------------------------------------------------------

/**
 * Calculate the straight-line distance between two points using the
 * Haversine formula, then multiply by a road-distance correction factor.
 *
 * The correction factor (1.3) is a common approximation for European road networks.
 */
function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  const straightLine = R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
  return Math.round(straightLine * 1.3 * 10) / 10; // road factor × 1.3, 1 decimal
}

// ---------------------------------------------------------------------------
// Google Directions API call (via the `directions` Cloud Function)
// ---------------------------------------------------------------------------

/**
 * Fetch driving distance and duration from the Google Directions API,
 * proxied through the `directions` Cloud Function.
 *
 * @param origin - Starting coordinates
 * @param destination - Ending coordinates
 * @returns RoutingResult with distanceKm and durationSeconds
 * @throws Error if the directions function returns an unexpected response
 */
export async function getRouteDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<RoutingResult> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE}/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
      }),
    });

    if (!response.ok) {
      throw new Error(`directions function error: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.distanceKm !== 'number') {
      throw new Error('[routing] Unexpected directions response structure');
    }

    return {
      distanceKm: Math.round(data.distanceKm * 10) / 10,
      durationSeconds:
        typeof data.durationMin === 'number' ? data.durationMin * 60 : 0,
      isEstimate: false,
    };
  } catch (error) {
    console.warn('[routing] directions request failed — falling back to Haversine:', error);
    return {
      distanceKm: haversineKm(origin, destination),
      durationSeconds: 0,
      isEstimate: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Google geocoding (address → coordinates)
// ---------------------------------------------------------------------------

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Base URL of the Firebase Cloud Functions that proxy the Google Maps APIs.
 * The Google Maps API key is held server-side as a Firebase secret and is never
 * exposed to the browser. See functions/src/index.ts (geocode).
 */
const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_FUNCTIONS_BASE ??
  'https://europe-west1-mon-van-prestige.cloudfunctions.net';

/**
 * Geocode a free-text address using the Google Geocoding API, proxied through
 * the `geocode` Cloud Function so the API key stays server-side.
 *
 * For interactive address entry, prefer the placesAutocomplete → placeDetails
 * flow (see the reservation form), which is more precise and cheaper per
 * session. This helper is for non-interactive server-side geocoding.
 *
 * @param address - Free-text address to geocode
 * @returns The first matching result with coordinates and display name
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, language: 'fr' }),
    });

    if (!response.ok) {
      throw new Error(`geocode function error: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      return null;
    }

    return {
      lat: data.lat,
      lng: data.lng,
      displayName: data.formattedAddress ?? '',
    };
  } catch (error) {
    console.warn('[routing] Google geocoding failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Valenciennes base coordinates (used for hors-base calculation)
// ---------------------------------------------------------------------------

/** Coordinates of the Valenciennes city center (used as the base reference point) */
export const VALENCIENNES_BASE: Coordinates = {
  lat: 50.3576,
  lng: 3.5238,
};

/**
 * Calculate the driving distance from the Valenciennes base to a given pickup address.
 * Used to determine whether a hors-base (out-of-base) surcharge applies.
 *
 * @param pickupAddress - Free-text pickup address
 * @returns Distance in km from the base, or null if geocoding fails
 */
export async function getOutOfBaseDistance(
  pickupAddress: string
): Promise<number | null> {
  const geocoded = await geocodeAddress(pickupAddress);
  if (!geocoded) return null;

  const result = await getRouteDistance(VALENCIENNES_BASE, {
    lat: geocoded.lat,
    lng: geocoded.lng,
  });

  return result.distanceKm;
}
