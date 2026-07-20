# MS Prestige Driver — Next.js 15

Site web de MS Prestige Driver, service VTC de luxe à Valenciennes (France).

## Stack technique

- **Framework** : Next.js 15 (App Router, TypeScript)
- **Backend** : Firebase (Firestore, Storage, Auth, Hosting)
- **Paiement** : Stripe Checkout
- **Cartographie** : OpenStreetMap + Leaflet (affichage) ; Google Places & Directions (adresses + itinéraires, via Cloud Functions)
- **Emails** : Resend
- **i18n** : next-intl (FR / EN / NL)
- **CI/CD** : GitHub Actions → Firebase Hosting

## Structure

```
app/
  (marketing)/         # Pages publiques
    page.tsx           # Accueil
    faq/
    reservation/
    services/[slug]/
  admin/               # Back-office
components/
  layout/              # Navbar, Footer, SplashScreen, FloatingButtons
  sections/            # Sections homepage (Hero, Services, Véhicules, À Propos, Contact)
  ui/                  # Composants atomiques réutilisables
lib/
  data/                # Données statiques (tarifs, véhicules, services…)
  firebase/            # Config & helpers Firebase (client + admin)
  hooks/               # Custom hooks (useTariffs, …)
  types/               # TypeScript types/interfaces
  utils/               # Fonctions utilitaires (pricing, routing, locale…)
scripts/               # Scripts d'initialisation et de maintenance (Node/ts-node)
```

## Variables d'environnement

Copier `.env.example` en `.env.local` :

```bash
cp .env.example .env.local
```

Variables requises :

```env
# Firebase (client — exposées publiquement, préfixe NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (serveur uniquement — NE JAMAIS COMMITER)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Maps — autocomplete d'adresse, geocoding et calcul d'itinéraire.
# Clé SERVEUR : elle n'est JAMAIS exposée au navigateur. Le front appelle les
# Cloud Functions (placesAutocomplete / placeDetails / geocode / directions),
# qui seules portent la clé. À définir comme secret Firebase, pas dans .env.local :
#   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
# Sans ce secret, /directions échoue et le calcul de distance tombe en mode
# dégradé (estimation Haversine, à vol d'oiseau → sous-facturation silencieuse).
GOOGLE_MAPS_API_KEY=

# Base URL des Cloud Functions (optionnel — défaut : europe-west1 du projet)
NEXT_PUBLIC_FUNCTIONS_BASE=

# Resend — emails transactionnels
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Admin
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
```

## Lancement

```bash
npm install
npm run dev
```

## Scripts npm

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run type-check` | Vérification TypeScript |

## Scripts d'initialisation (à run manuellement, une seule fois)

Ces scripts requièrent les variables `FIREBASE_ADMIN_*` dans `.env.local`.

### Initialiser les collections Firestore (structure vide)

```bash
npx ts-node --project tsconfig.json scripts/init-firestore.ts
```

Crée les documents `_structure` dans chaque collection (`tarifs`, `reservations`, `faq`, `vehicules`, `contenus`).
À exécuter une seule fois après la création du projet Firebase.

### Peupler la grille tarifaire 2026

```bash
npx ts-node --project tsconfig.json scripts/seed-tariffs.ts
```

Pousse la grille tarifaire complète dans la collection Firestore `tarifs` :
- Forfaits aéroports (CDG, ORLY, ZAVENTEM, CHARLEROI, LESQUIN, GARES)
- Forfaits loisirs (ASTERIX, WALIBI, DISNEY, LENS, LOSC)
- Tarifs mise à disposition (55 €/h Business, 90 €/h Van)
- Tranches kilométriques transfert simple (Business & Van)
- Suppléments hors-base (Business & Van)

**À ré-exécuter si la grille tarifaire change.** Le script supprime et recrée tous les documents existants.
Une fois seedé, Mohammed peut modifier les tarifs directement depuis le panel Admin (Milestone 4) sans retoucher au code.

## Architecture tarifaire

```
Firestore (collection: tarifs)
        ↓  onSnapshot — temps réel
  useTariffs()  [lib/hooks/useTariffs.ts]
        ↓  TariffData
  calculatePrice(request, tariffs)  [lib/utils/pricing.ts]
        ↓  PriceResult
  Formulaire de réservation / UI
```

- Si Firestore est indisponible → fallback automatique sur `lib/data/tariffs.ts` (données statiques)
- Si Mohammed modifie un prix dans l'Admin → tous les onglets ouverts se mettent à jour instantanément

## Déploiement

CI/CD automatique via GitHub Actions sur push `main` → Firebase Hosting.

Live : https://mon-van-prestige.web.app
