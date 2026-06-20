/**
 * scripts/init-firestore.ts
 * Lance avec : npx ts-node --project tsconfig.json scripts/init-firestore.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Charger explicitement .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Debug : vérifier que les vars sont chargées
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Variables Firebase Admin manquantes dans .env.local')
  console.error({ projectId, clientEmail, privateKey: privateKey ? '***OK***' : 'MISSING' })
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

async function initCollections() {
  console.log('🔥 Initialisation Firestore...\n')

  await db.collection('tarifs').doc('_structure').set({
    type: 'aeroport_business',
    destination: 'Paris CDG',
    prix: 180,
    vehicule: 'business',
    actif: true,
    createdAt: new Date(),
  })
  console.log('✅ Collection tarifs créée')

  await db.collection('reservations').doc('_structure').set({
    nom: '', prenom: '', email: '', telephone: '',
    service: '', dateDepart: '', heureDepart: '',
    adresseDepart: '', adresseArrivee: '',
    nbPassagers: 1, nbBagages: 0, vehicule: 'business',
    prix: 0, statut: 'en_attente', notes: '',
    createdAt: new Date(),
  })
  console.log('✅ Collection reservations créée')

  await db.collection('faq').doc('_structure').set({
    question_fr: '', question_en: '', question_nl: '',
    reponse_fr: '', reponse_en: '', reponse_nl: '',
    categorie: 'general', ordre: 0, actif: true,
    createdAt: new Date(),
  })
  console.log('✅ Collection faq créée')

  await db.collection('vehicules').doc('_structure').set({
    nom: 'Business', type: 'business',
    capacitePassagers: 4, capaciteBagages: 3,
    description_fr: '', description_en: '', description_nl: '',
    imageUrl: '', features: ['WiFi', 'Climatisation', 'Chargeur USB'],
    actif: true, ordre: 0, createdAt: new Date(),
  })
  console.log('✅ Collection vehicules créée')

  await db.collection('contenus').doc('_structure').set({
    cle: 'hero_titre',
    valeur_fr: '', valeur_en: '', valeur_nl: '',
    type: 'texte', updatedAt: new Date(),
  })
  console.log('✅ Collection contenus créée')

  console.log('\n🎉 Firestore initialisé avec succès !')
}

initCollections().catch(console.error)
