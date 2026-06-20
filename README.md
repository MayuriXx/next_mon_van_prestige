# Mon Van Prestige — Next.js 15

Site web de MS Prestige Driver, service VTC de luxe à Valenciennes (France).

## Stack technique

- **Framework** : Next.js 15 (App Router, TypeScript)
- **Backend** : Firebase (Firestore, Storage, Auth, Hosting)
- **Paiement** : Stripe Checkout
- **Cartographie** : OpenStreetMap + Leaflet + OpenRouteService
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
  firebase/            # Config & helpers Firebase
  hooks/               # Custom hooks
  types/               # TypeScript types/interfaces
  utils/               # Fonctions utilitaires
styles/                # CSS global, variables, tokens
public/
  images/              # Assets images
  fonts/               # Polices locales
```

## Variables d'environnement

Copier `.env.example` en `.env.local` :

```bash
cp .env.example .env.local
```

Variables requises :

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# OpenRouteService
NEXT_PUBLIC_ORS_API_KEY=

# Resend
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

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run type-check` | Vérification TypeScript |

## Déploiement

CI/CD automatique via GitHub Actions sur push `main` → Firebase Hosting.

Live : https://mon-van-prestige.web.app
