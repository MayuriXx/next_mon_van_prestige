/**
 * scripts/seed-tariffs.ts
 *
 * Seed the Firestore `tarifs` collection with the full 2026 pricing grid.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-tariffs.ts
 *
 * Prerequisites:
 *   - .env.local must contain FIREBASE_ADMIN_* credentials
 *   - Run once after initial setup, or whenever the pricing grid changes
 *
 * What this script does:
 *   - Deletes all existing documents in the `tarifs` collection
 *   - Re-creates them from the canonical data in lib/data/tariffs.ts
 *
 * Firestore document structure (collection: tarifs):
 *
 *   Document ID: "airports"
 *   {
 *     CDG: { BUSINESS: { min: 300, max: 390 }, VAN: { min: 390, max: 550 } },
 *     ORLY: { ... },
 *     ...
 *   }
 *
 *   Document ID: "leisure"
 *   {
 *     ASTERIX: { BUSINESS: { min: 275, max: 350 }, VAN: { min: 360, max: 450 } },
 *     ...
 *   }
 *
 *   Document ID: "mad"
 *   {
 *     BUSINESS: 55,
 *     VAN: 90
 *   }
 *
 *   Document ID: "transfer_brackets"
 *   {
 *     BUSINESS: [ { from: 0, to: 7, flat: 22 }, ... ],
 *     VAN: [ { from: 0, to: 5, flat: 45 }, ... ]
 *   }
 *
 *   Document ID: "out_of_base_brackets"
 *   {
 *     BUSINESS: [ { from: 0, to: 2, flat: 0 }, ... ],
 *     VAN: [ { from: 0, to: 2, flat: 0 }, ... ]
 *   }
 *
 *   Document ID: "minimum_fares"
 *   {
 *     BUSINESS: 22,
 *     VAN: 45
 *   }
 *
 *   Document ID: "_meta"
 *   {
 *     version: "2026",
 *     updatedAt: Timestamp,
 *     updatedBy: "seed-script"
 *   }
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase Admin credentials in .env.local')
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
// Tariff data (2026) — mirrors lib/data/tariffs.ts
// Duplicated here to avoid ts-node path alias resolution issues (@/ imports)
// ---------------------------------------------------------------------------

const AIRPORT_PRICES = {
  CDG:        { BUSINESS: { min: 300, max: 390 }, VAN: { min: 390, max: 550 } },
  ORLY:       { BUSINESS: { min: 360, max: 450 }, VAN: { min: 420, max: 590 } },
  ZAVENTEM:   { BUSINESS: { min: 190, max: 230 }, VAN: { min: 235, max: 320 } },
  CHARLEROI:  { BUSINESS: { min: 145, max: 180 }, VAN: { min: 180, max: 240 } },
  LESQUIN:    { BUSINESS: { min: 90,  max: 130 }, VAN: { min: 130, max: 170 } },
  GARES:      { BUSINESS: { min: 90,  max: 140 }, VAN: { min: 140, max: 180 } },
}

const LEISURE_PRICES = {
  ASTERIX: { BUSINESS: { min: 275, max: 350 }, VAN: { min: 360, max: 450 } },
  WALIBI:  { BUSINESS: { min: 140, max: 200 }, VAN: { min: 240, max: 270 } },
  DISNEY:  { BUSINESS: { min: 340, max: 450 }, VAN: { min: 399, max: 590 } },
  LENS:    { BUSINESS: { min: 110, max: 140 }, VAN: { min: 150, max: 180 } },
  LOSC:    { BUSINESS: { min: 90,  max: 140 }, VAN: { min: 130, max: 155 } },
}

const MAD_RATES = {
  BUSINESS: 55,
  VAN: 90,
}

const MINIMUM_FARES = {
  BUSINESS: 22,
  VAN: 45,
}

// Infinity cannot be stored in Firestore — use -1 to represent "no upper limit"
const TRANSFER_BRACKETS = {
  BUSINESS: [
    { from: 0,   to: 7,   flat: 22 },
    { from: 8,   to: 14,  flat: 26 },
    { from: 15,  to: 50,  ratePerKm: 1.99 },
    { from: 51,  to: 100, ratePerKm: 1.95 },
    { from: 101, to: 151, ratePerKm: 1.75 },
    { from: 152, to: -1,  ratePerKm: 1.65 }, // -1 = no upper limit
  ],
  VAN: [
    { from: 0,   to: 5,   flat: 45 },
    { from: 6,   to: 14,  flat: 55 },
    { from: 15,  to: 19,  flat: 59 },
    { from: 20,  to: 25,  ratePerKm: 3.10 },
    { from: 26,  to: 50,  ratePerKm: 2.90 },
    { from: 51,  to: 100, ratePerKm: 2.50 },
    { from: 101, to: 200, ratePerKm: 2.05 },
    { from: 201, to: -1,  ratePerKm: 1.95 }, // -1 = no upper limit
  ],
}

const OUT_OF_BASE_BRACKETS = {
  BUSINESS: [
    { from: 0,  to: 2,  flat: 0 },
    { from: 3,  to: 6,  flat: 10 },
    { from: 7,  to: 13, flat: 12 },
    { from: 13, to: 25, ratePerKm: 0.90 },
    { from: 26, to: -1, ratePerKm: 0.70 }, // -1 = no upper limit
  ],
  VAN: [
    { from: 0,  to: 2,  flat: 0 },
    { from: 3,  to: 6,  flat: 10 },
    { from: 7,  to: 14, ratePerKm: 1.50 },
    { from: 15, to: 25, ratePerKm: 1.20 },
    { from: 26, to: -1, ratePerKm: 0.90 }, // -1 = no upper limit
  ],
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seedTariffs() {
  console.log('🔥 Seeding Firestore collection: tarifs\n')

  const col = db.collection('tarifs')

  // Delete all existing documents first
  const existing = await col.listDocuments()
  if (existing.length > 0) {
    console.log(`🗑️  Deleting ${existing.length} existing document(s)...`)
    await Promise.all(existing.map((ref) => ref.delete()))
  }

  // airports
  await col.doc('airports').set(AIRPORT_PRICES)
  console.log('✅ airports')

  // leisure
  await col.doc('leisure').set(LEISURE_PRICES)
  console.log('✅ leisure')

  // mad
  await col.doc('mad').set(MAD_RATES)
  console.log('✅ mad')

  // minimum_fares
  await col.doc('minimum_fares').set(MINIMUM_FARES)
  console.log('✅ minimum_fares')

  // transfer_brackets
  await col.doc('transfer_brackets').set(TRANSFER_BRACKETS)
  console.log('✅ transfer_brackets')

  // out_of_base_brackets
  await col.doc('out_of_base_brackets').set(OUT_OF_BASE_BRACKETS)
  console.log('✅ out_of_base_brackets')

  // metadata
  await col.doc('_meta').set({
    version: '2026',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed-tariffs.ts',
  })
  console.log('✅ _meta')

  console.log('\n🎉 Tariffs seeded successfully!')
  console.log('   Mohammed can now update prices from the Admin panel (Milestone 4).')
}

seedTariffs().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
