/**
 * MS Prestige Driver — Routing utility
 *
 * Calculates driving distance in kilometres between two geographic points
 * using the OpenRouteService (ORS) API — free tier, based on OpenStreetMap.
 *
 * Why ORS instead of Google Maps?
 * - No billing required for the free tier (up to 2 000 requests/day)
 * - Already used on the /services/transfert-simple page (OSRM for map display)
 * - Consistent with the project's OSM-first approach
 *
 * ORS Directions API endpoint (GET):
 *   https://api.openrouteservice.org/v2/directions/driving-car
 *   ?api_key=<key>&start=<lng,lat>&end=<lng,lat>
 *
 * The API key is read from the environment variable NEXT_PUBLIC_ORS_API_KEY.
 * It is safe to expose this key client-side (ORS has rate limiting per key,
 * and the free tier is publicly usable).
 *
 * Fallback: if ORS is unavailable, the Haversine formula provides a straight-
 * line distance approximation (multiply by 1.25 for a road-distance estimate).
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
  /** True if the result came from the ORS API, false if it's a Haversine estimate */
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
// OpenRouteService API call
// ---------------------------------------------------------------------------

/**
 * Fetch driving distance and duration from the ORS Directions API.
 *
 * @param origin - Starting coordinates
 * @param destination - Ending coordinates
 * @returns RoutingResult with distanceKm and durationSeconds
 * @throws Error if the ORS API returns an unexpected response
 */
export async function getRouteDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<RoutingResult> {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

  if (!apiKey) {
    console.warn(
      '[routing] NEXT_PUBLIC_ORS_API_KEY is not set — falling back to Haversine estimate'
    );
    return {
      distanceKm: haversineKm(origin, destination),
      durationSeconds: 0,
      isEstimate: true,
    };
  }

  const url =
    `https://api.openrouteservice.org/v2/directions/driving-car` +
    `?api_key=${apiKey}` +
    `&start=${origin.lng},${origin.lat}` +
    `&end=${destination.lng},${destination.lat}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json, application/geo+json' },
      // next: { revalidate: 3600 } — uncomment if used in a Server Component with caching
    });

    if (!response.ok) {
      throw new Error(`ORS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // ORS GeoJSON response structure:
    // features[0].properties.segments[0].distance (metres)
    // features[0].properties.segments[0].duration (seconds)
    const segment = data?.features?.[0]?.properties?.segments?.[0];

    if (!segment) {
      throw new Error('[routing] Unexpected ORS response structure');
    }

    return {
      distanceKm: Math.round((segment.distance / 1000) * 10) / 10, // metres → km, 1 decimal
      durationSeconds: Math.round(segment.duration),
      isEstimate: false,
    };
  } catch (error) {
    console.warn('[routing] ORS request failed — falling back to Haversine:', error);
    return {
      distanceKm: haversineKm(origin, destination),
      durationSeconds: 0,
      isEstimate: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Nominatim geocoding (address → coordinates)
// ---------------------------------------------------------------------------

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocode a free-text address using the Nominatim API (OpenStreetMap).
 *
 * No API key required. Rate-limited to 1 request/second by Nominatim ToS.
 * For production use, consider self-hosting Nominatim or using a paid tier.
 *
 * @param address - Free-text address to geocode
 * @returns The first matching result with coordinates and display name
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const encoded = encodeURIComponent(address);
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encoded}&format=json&limit=1&countrycodes=fr,be`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MSPrestigeDriver/1.0 (mon-van-prestige.web.app)',
        'Accept-Language': 'fr',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    const first = results[0];
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    };
  } catch (error) {
    console.warn('[routing] Nominatim geocoding failed:', error);
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
