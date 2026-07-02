import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Évite la réinitialisation en hot-reload Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)

// Firebase Auth is initialized lazily (unlike Firestore/Storage above).
// getAuth() validates the API key format immediately and throws
// `auth/invalid-api-key` at call time if it's missing/invalid. Calling it
// eagerly at module scope meant *any* file importing this module — even
// public pages that only need Firestore and never touch Auth — paid that
// cost, which crashed `next build`'s static export whenever Firebase env
// vars weren't configured (see issue #109). Only admin-side code
// (login page, dashboard layout, auth-context) actually needs Auth, so we
// defer initialization until one of them calls getFirebaseAuth().
let _auth: Auth | undefined
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(app)
  }
  return _auth
}

export default app
