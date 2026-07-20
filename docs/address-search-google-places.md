# Address Search — Google Places migration

## Summary

The address search (autocomplete + geocoding) was migrated from **OpenStreetMap /
Nominatim** to the **Google Places API (New)** and **Google Geocoding API**.

Motivation: Nominatim lacks fuzzy matching, has uneven French/Belgian house-number
coverage, is rate-limited to 1 req/s and is not licensed for commercial usage —
all problematic for a taxi/VTC booking form where users type addresses live.

## Business impact

- Users now get real-time, typo-tolerant suggestions restricted to France + Belgium.
- Selecting a suggestion returns precise GPS coordinates for the pickup/drop-off
  point, which feeds the distance and price estimation more reliably.

## Architecture

The site is a **static export** (`next.config.ts` → `output: 'export'`), so Next.js
API routes are not available at runtime. To keep the Google Maps API key private,
all Google calls are proxied through **Firebase Cloud Functions**. The browser
never sees the key.

```
Browser (ReservationPage)                Cloud Functions (europe-west1)         Google
──────────────────────────               ──────────────────────────────        ──────
type address ──► placesAutocomplete ────► POST places:autocomplete            suggestions
select item  ──► placeDetails       ────► GET  places/{id}                    lat/lng
(server util)──► geocode            ────► GET  geocode/json                   lat/lng
```

### Cloud Functions (`functions/src/index.ts`)

| Function             | Method | Input                              | Output                                  |
|----------------------|--------|------------------------------------|-----------------------------------------|
| `placesAutocomplete` | POST   | `{ input, sessionToken?, language? }` | `{ suggestions: [{ placeId, description }] }` |
| `placeDetails`       | POST   | `{ placeId, sessionToken?, language? }` | `{ lat, lng, formattedAddress }`      |
| `geocode`            | POST   | `{ address, language? }`           | `{ lat, lng, formattedAddress }`        |

All three run in `europe-west1`, are `invoker: 'public'`, use CORS restricted to
the production origin + `localhost:3000`, and read the key from the
`GOOGLE_MAPS_API_KEY` secret.

Region is restricted to `['fr', 'be']` and the language defaults to `fr`.

### Session tokens & billing

`placesAutocomplete` and `placeDetails` share a **session token** (a UUID generated
per typing session in the browser). Google then bills the sequence as a single
"Autocomplete per session" unit instead of one call per keystroke. The token is
regenerated after each selection (`AutocompleteField` in `ReservationPage.tsx`).

The `placeDetails` call uses a `X-Goog-FieldMask: location,formattedAddress` so we
only fetch — and pay for — the fields we need.

## Setup (one-time)

1. Google Cloud console → enable **Places API (New)** and **Geocoding API**.
2. Create an API key. Restrict it to those two APIs. No HTTP-referrer restriction
   is needed because the key is only ever used server-side.
3. Register the key as a Firebase secret:
   ```bash
   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
   ```
4. Deploy the functions:
   ```bash
   cd functions && npm run deploy
   ```

For local development with the Firebase emulator, put the key in
`functions/.secret.local` (git-ignored).

## Files changed

- `functions/src/index.ts` — added `placesAutocomplete`, `placeDetails`, `geocode`.
- `components/pages/ReservationPage.tsx` — autocomplete field now calls the
  functions and resolves coordinates via Place Details; session-token handling.
- `lib/utils/routing.ts` — `geocodeAddress` now calls the `geocode` function
  instead of Nominatim.
- `.env.example` — documented `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_FUNCTIONS_BASE`.

## Out of scope

The **itinerary/route drawing** still uses OSRM/OpenRouteService (the map polyline
and distance). Only the *address search* was migrated. Route calculation can be
migrated to the Google Directions API later if higher precision or live traffic is
required.

> **Superseded.** The follow-up migration described above has since happened:
> route calculation now goes through the `directions` Cloud Function
> (`lib/utils/routing.ts`), and OpenRouteService is no longer called anywhere.
> Leaflet/OpenStreetMap remain in use for map *rendering* only.
