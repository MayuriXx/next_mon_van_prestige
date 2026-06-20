/**
 * scripts/init-firestore.ts
 * Lance avec : npx ts-node --project tsconfig.json scripts/init-firestore.ts
 *
 * Initialise les collections Firestore avec des documents de structure vide.
 * À exécuter UNE SEULE FOIS sur un projet vierge.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

async function initCollections() {
  console.log('🔥 Initialisation Firestore...\n')

  // ── tarifs ──────────────────────────────────────────────────────────────────
  await db.collection('tarifs').doc('_structure').set({
    type: 'aeroport_business',
    destination: 'Paris CDG',
    prix: 180,
    vehicule: 'business',
    actif: true,
    createdAt: new Date(),
  })
  console.log('✅ Collection tarifs créée')

  // ── reservations ─────────────────────────────────────────────────────────────
  await db.collection('reservations').doc('_structure').set({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    service: '',
    dateDepart: '',
    heureDepart: '',
    adresseDepart: '',
    adresseArrivee: '',
    nbPassagers: 1,
    nbBagages: 0,
    vehicule: 'business',
    prix: 0,
    statut: 'en_attente', // en_attente | confirme | annule
    notes: '',
    createdAt: new Date(),
  })
  console.log('✅ Collection reservations créée')

  // ── faq ──────────────────────────────────────────────────────────────────────
  await db.collection('faq').doc('_structure').set({
    question_fr: '',
    question_en: '',
    question_nl: '',
    reponse_fr: '',
    reponse_en: '',
    reponse_nl: '',
    categorie: 'general',
    ordre: 0,
    actif: true,
    createdAt: new Date(),
  })
  console.log('✅ Collection faq créée')

  // ── vehicules ────────────────────────────────────────────────────────────────
  await db.collection('vehicules').doc('_structure').set({
    nom: 'Business',
    type: 'business', // business | van
    capacitePassagers: 4,
    capaciteBagages: 3,
    description_fr: '',
    description_en: '',
    description_nl: '',
    imageUrl: '',
    features: ['WiFi', 'Climatisation', 'Chargeur USB'],
    actif: true,
    ordre: 0,
    createdAt: new Date(),
  })
  console.log('✅ Collection vehicules créée')

  // ── contenus ─────────────────────────────────────────────────────────────────
  await db.collection('contenus').doc('_structure').set({
    cle: 'hero_titre',
    valeur_fr: '',
    valeur_en: '',
    valeur_nl: '',
    type: 'texte', // texte | image | boolean
    updatedAt: new Date(),
  })
  console.log('✅ Collection contenus créée')

  console.log('\n🎉 Firestore initialisé avec succès !')
  console.log('💡 Les documents "_structure" servent de référence — tu peux les supprimer.')
}

initCollections().catch(console.error)
