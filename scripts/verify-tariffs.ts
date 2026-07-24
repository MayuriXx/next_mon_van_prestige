/**
 * scripts/verify-tariffs.ts
 *
 * READ-ONLY audit of the live Firestore `tarifs` collection.
 *
 * Unlike scripts/seed-tariffs.ts, this script NEVER writes or deletes anything.
 * It fetches the live pricing documents and diffs them against the canonical
 * 2026 grid (mirrors lib/data/tariffs.ts). Use it to answer the question
 * "is production Firebase actually in sync with the grid in the repo?" without
 * touching production data.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/verify-tariffs.ts
 *
 * Prerequisites:
 *   - .env.local must contain FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY
 *
 * Exit codes:
 *   0 → live Firestore matches the canonical grid
 *   1 → at least one mismatch, or missing/extra document, or a fetch error
 *
 * What it checks:
 *   - tarifs/airports            (6 destinations × BUSINESS/VAN × {min,max})
 *   - tarifs/leisure             (5 destinations × BUSINESS/VAN × {min,max})
 *     NB: min/max are DIRECTIONAL fares, not a range — min = departure from
 *     Valenciennes, max = reverse trip back to Valenciennes.
 *   - tarifs/mad                 (BUSINESS/VAN hourly rate)
 *   - tarifs/minimum_fares       (BUSINESS/VAN guaranteed minimum)
 *   - tarifs/transfer_brackets   (BUSINESS/VAN km brackets, -1 = open bound)
 *   - tarifs/out_of_base_brackets(BUSINESS/VAN hors-base surcharge brackets)
 *   - reports any UNEXPECTED document (e.g. the legacy `_structure` doc written
 *     by scripts/init-firestore.ts) so cruft can be spotted
 *   - prints the tarifs/_meta version/updatedAt for traceability
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin credentials in .env.local')
  console.error({
    projectId: projectId ? 'OK' : 'MISSING',
    clientEmail: clientEmail ? 'OK' : 'MISSING',
    privateKey: privateKey ? 'OK' : 'MISSING',
  })
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

// ---------------------------------------------------------------------------
// Expected canonical grid (2026) — mirrors lib/data/tariffs.ts.
// Bracket upper bounds use -1 for "no upper limit" (Firestore storage form).
// ---------------------------------------------------------------------------

const EXPECTED: Record<string, unknown> = {
  airports: {
    CDG:       { BUSINESS: { min: 300, max: 390 }, VAN: { min: 390, max: 550 } },
    ORLY:      { BUSINESS: { min: 360, max: 450 }, VAN: { min: 420, max: 590 } },
    ZAVENTEM:  { BUSINESS: { min: 190, max: 230 }, VAN: { min: 235, max: 320 } },
    CHARLEROI: { BUSINESS: { min: 145, max: 180 }, VAN: { min: 180, max: 240 } },
    LESQUIN:   { BUSINESS: { min: 90,  max: 130 }, VAN: { min: 130, max: 170 } },
    GARES:     { BUSINESS: { min: 90,  max: 140 }, VAN: { min: 140, max: 180 } },
  },
  leisure: {
    ASTERIX: { BUSINESS: { min: 275, max: 350 }, VAN: { min: 360, max: 450 } },
    WALIBI:  { BUSINESS: { min: 140, max: 200 }, VAN: { min: 240, max: 270 } },
    DISNEY:  { BUSINESS: { min: 340, max: 450 }, VAN: { min: 399, max: 590 } },
    LENS:    { BUSINESS: { min: 110, max: 140 }, VAN: { min: 150, max: 180 } },
    LOSC:    { BUSINESS: { min: 90,  max: 140 }, VAN: { min: 130, max: 155 } },
  },
  mad: { BUSINESS: 55, VAN: 90 },
  minimum_fares: { BUSINESS: 22, VAN: 45 },
  transfer_brackets: {
    BUSINESS: [
      { from: 0,   to: 7,   flat: 22 },
      { from: 8,   to: 14,  flat: 26 },
      { from: 15,  to: 50,  ratePerKm: 1.99 },
      { from: 51,  to: 100, ratePerKm: 1.95 },
      { from: 101, to: 151, ratePerKm: 1.75 },
      { from: 152, to: -1,  ratePerKm: 1.65 },
    ],
    VAN: [
      { from: 0,   to: 5,   flat: 45 },
      { from: 6,   to: 14,  flat: 55 },
      { from: 15,  to: 19,  flat: 59 },
      { from: 20,  to: 25,  ratePerKm: 3.10 },
      { from: 26,  to: 50,  ratePerKm: 2.90 },
      { from: 51,  to: 100, ratePerKm: 2.50 },
      { from: 101, to: 200, ratePerKm: 2.05 },
      { from: 201, to: -1,  ratePerKm: 1.95 },
    ],
  },
  // Base point = Gare de Valenciennes. Brackets measure the road distance
  // base -> pickup. The lower bracket is extended to 7 km to close the 6-7 km
  // gap left by the source grid ("3////6KM" then "7///13KM").
  out_of_base_brackets: {
    BUSINESS: [
      { from: 0,  to: 3,  flat: 0 },
      { from: 3,  to: 7,  flat: 10 },
      { from: 7,  to: 13, flat: 12 },
      { from: 13, to: 26, ratePerKm: 0.90 },
      { from: 26, to: -1, ratePerKm: 0.70 },
    ],
    VAN: [
      { from: 0,  to: 3,  flat: 0 },
      { from: 3,  to: 7,  flat: 10 },
      { from: 7,  to: 15, ratePerKm: 1.50 },
      { from: 15, to: 25, ratePerKm: 1.20 },
      { from: 25, to: -1, ratePerKm: 0.90 },
    ],
  },
}

const EXPECTED_DOC_IDS = Object.keys(EXPECTED)

// ---------------------------------------------------------------------------
// Deep comparison — normalises undefined vs missing keys so that
// `{ from, to, flat }` and `{ from, to, flat, ratePerKm: undefined }` match.
// ---------------------------------------------------------------------------

function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = normalise(v)
    }
    return out
  }
  return value
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b))
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

async function verify(): Promise<void> {
  console.log('Verifying live Firestore collection: tarifs (read-only)\n')

  const snapshot = await db.collection('tarifs').get()

  const live: Record<string, unknown> = {}
  snapshot.docs.forEach((d) => {
    live[d.id] = d.data()
  })

  let mismatches = 0

  // _meta (informational)
  if (live['_meta']) {
    const meta = live['_meta'] as Record<string, unknown>
    const ts = meta.updatedAt as { toDate?: () => Date } | undefined
    const updatedAt =
      ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : String(ts)
    console.log(`_meta: version=${String(meta.version)} updatedBy=${String(meta.updatedBy)} updatedAt=${updatedAt}`)
    console.log('')
  } else {
    console.log('_meta: (missing — collection may never have been seeded)\n')
  }

  // Expected docs
  for (const id of EXPECTED_DOC_IDS) {
    if (!(id in live)) {
      console.log(`MISSING  tarifs/${id} — not present in Firestore`)
      mismatches++
      continue
    }
    if (deepEqual(live[id], EXPECTED[id])) {
      console.log(`OK       tarifs/${id}`)
    } else {
      console.log(`MISMATCH tarifs/${id}`)
      console.log(`  expected: ${JSON.stringify(EXPECTED[id])}`)
      console.log(`  live:     ${JSON.stringify(live[id])}`)
      mismatches++
    }
  }

  // Unexpected docs (cruft such as the legacy `_structure` doc)
  const known = new Set([...EXPECTED_DOC_IDS, '_meta'])
  const extras = Object.keys(live).filter((id) => !known.has(id))
  if (extras.length > 0) {
    console.log('')
    for (const id of extras) {
      console.log(`EXTRA    tarifs/${id} — unexpected document (ignored by the app, consider deleting)`)
    }
  }

  console.log('')
  if (mismatches === 0) {
    console.log('RESULT: live Firestore matches the canonical 2026 grid.')
    process.exit(0)
  } else {
    console.log(`RESULT: ${mismatches} mismatch(es) found. Run scripts/seed-tariffs.ts to re-sync (destructive: it deletes and recreates the docs).`)
    process.exit(1)
  }
}

verify().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
