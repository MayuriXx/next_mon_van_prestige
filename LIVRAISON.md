# LIVRAISON — Handover Checklist

**Project:** MS Prestige Driver / Mon Van Prestige — luxury VTC website
**Stack:** Next.js 15 (App Router, TypeScript, `output: 'export'`) · Firebase (Firestore, Storage, Auth, Hosting, Functions) · Stripe Checkout · Google Places & Directions · Resend · next-intl (FR/EN/NL)
**Repository:** `github.com/MayuriXx/next_mon_van_prestige`
**Live:** `https://mon-van-prestige.web.app/`
**Firebase project:** `mon-van-prestige` (Blaze plan, functions region `europe-west1`)

This document is the operational handover checklist for transferring the site to
Mohammed (client / operator). Each section states **what to do**, **why it matters
for the business**, and **how to verify it**.

---

## 0. Status summary

| Area | State |
|---|---|
| Milestones M1 → M5 (Foundation, Pages, Réservation, Admin, SEO) | Delivered |
| Milestone M6 (Client corrections) | In progress |
| Booking funnels (Transfert simple, Transfert aéroport, Mise à disposition) | Live, reaching Stripe Checkout |
| Admin panel (tariffs, FAQ, content, images, reservations) | Live |
| Handover items below | **Open — required before final delivery** |

---

## 1. Access & authentication

### 1.1 Create Mohammed's Firebase Auth account — **BLOCKING**

**Business impact:** without this account Mohammed cannot log into the admin panel,
so he cannot update tariffs, FAQ, vehicles, images, or view incoming reservations.

**Blocker:** his definitive email address is not yet confirmed. Nothing in this
section can proceed until he provides it.

1. Go to <https://console.firebase.google.com/project/mon-van-prestige/authentication/users>
2. **Add user** → email + a temporary password.
3. Ask Mohammed to change the password on first login.

### 1.2 Update `isAdmin()` in both rules files — **BLOCKING**

Admin authorisation is currently hardcoded to the developer account only:

```
// firestore.rules  (and the equivalent block in storage.rules)
function isAdmin() {
  return request.auth.token.email == 'martho.evan@gmail.com';
}
```

Replace with a list containing Mohammed's confirmed email (and, if kept, the
support account — see 1.3):

```
function isAdmin() {
  return request.auth.token.email in [
    'martho.evan@gmail.com',
    '<mohammed-email>'
  ];
}
```

Apply the change to **`firestore.rules` AND `storage.rules`**, then deploy:

```bash
firebase deploy --only firestore:rules,storage
```

> ⚠️ Security rules are **not** deployed by GitHub Actions. This command is manual.

### 1.3 Decide on continued support access

Keeping `martho.evan@gmail.com` in `isAdmin()` allows post-delivery support and
debugging. Removing it makes Mohammed the sole administrator. This is a business
decision to agree with him explicitly and record here.

### 1.4 End-to-end authentication test

Using Mohammed's own credentials, verify:

- [ ] Login succeeds and redirects to the admin dashboard
- [ ] Tariffs / FAQ / content / images can be edited and saved (Firestore write OK)
- [ ] Image upload succeeds (Storage write OK)
- [ ] Reservations list is readable
- [ ] Logout works
- [ ] Direct access to an `/admin/*` URL while logged out redirects to login

---

## 2. Secrets, payments & integrations

### 2.1 Firebase Functions secrets

Confirm all secrets are set (`firebase functions:secrets:access <NAME>` to check):

| Secret | Purpose | Consequence if missing |
|---|---|---|
| `STRIPE_SECRET_KEY` | Create Stripe Checkout sessions | Bookings cannot be paid |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook signatures | Paid bookings never confirmed |
| `RESEND_API_KEY` | Transactional email delivery | No confirmation emails |
| `RESEND_FROM_EMAIL` | Sender identity | Emails rejected / spam |
| `ADMIN_EMAIL` | Recipient of new-booking notifications | Mohammed unaware of new bookings |

### 2.2 Stripe webhook

Configure in the Stripe dashboard (Developers → Webhooks):

```
https://europe-west1-mon-van-prestige.cloudfunctions.net/stripeWebhook
```

**Business impact:** the webhook is what marks a reservation as *paid* and triggers
the confirmation emails. Without it, customers pay but neither they nor Mohammed
receive confirmation.

- [ ] Endpoint added and pointing to the production function
- [ ] Signing secret copied into `STRIPE_WEBHOOK_SECRET`
- [ ] Test payment performed end-to-end (Stripe test mode, then one live test)
- [ ] Switch from Stripe **test** keys to **live** keys before launch

### 2.3 CORS for the custom domain

When Mohammed's own domain goes live, Storage must allow it or images will fail
to load from the custom domain.

```bash
# add the domain to cors.json first
gsutil cors set cors.json gs://mon-van-prestige.firebasestorage.app
```

- [ ] Custom domain added to `cors.json`
- [ ] `gsutil cors set` executed
- [ ] Domain added in Firebase Hosting → Custom domains (DNS records propagated)

---

## 3. Content to confirm with Mohammed

### 3.1 Legal address — Onnaing vs Valenciennes

There is an unresolved discrepancy: **Onnaing** appears as the legal/registered
address while **Valenciennes** is used in marketing copy. This must be settled and
then made consistent across:

- `Mentions légales` page
- `CGV` page
- `components/seo/OrganizationJsonLd.tsx` (`streetAddress`, `addressLocality`, geo coordinates)

**Business impact:** inconsistent legal information is a compliance risk (French
mandatory disclosures) and inconsistent NAP data harms local SEO.

### 3.2 Placeholder phone number

`OrganizationJsonLd.tsx` still contains the placeholder `+33600000000`. Replace it
with the real business number and complete `streetAddress` plus exact latitude /
longitude. Google uses this structured data for the local business panel.

### 3.3 Brand name in Firestore overrides

Some admin-managed content documents in Firestore still carry the former brand
name **"Mon Van Prestige"**. Code-level changes do **not** overwrite Firestore
overrides — Mohammed must correct these manually through the admin panel after
delivery.

### 3.4 FAQ has three sources of truth

The FAQ exists in three representations:

1. Firestore `faq/` collection (admin-managed, wins when populated)
2. `next-intl` message files (fallback when Firestore is empty)
3. JSON-LD structured data for SEO

**Operational rule for Mohammed:** once the FAQ has been seeded in Firestore,
every future FAQ change must be made in the admin panel. Editing translation files
will have no visible effect on the live site.

---

## 4. Operating rules to transfer to Mohammed

### 4.1 Cloud Functions are NOT deployed by CI/CD

GitHub Actions deploys **Next.js hosting only**. The GitHub service account lacks
the IAM permission required to deploy Functions.

Any change to `functions/src/index.ts` (including the email templates) requires:

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

> Do not add `functions` to `deploy.yml` without first granting the
> **Service Account User** role in Google Cloud IAM.

### 4.2 Security rules are NOT deployed by CI/CD

```bash
firebase deploy --only firestore:rules,storage
```

### 4.3 Changing a function trigger type

Converting a function between `onCall` and `onRequest` cannot be done in place.
Delete it first:

```bash
firebase functions:delete <functionName> --region europe-west1
```

### 4.4 Image uploads

Images uploaded through the admin panel are served as-is. Advise Mohammed to
compress before uploading (Squoosh, target **< 200 KB**, WebP preferred).
Uncompressed uploads directly degrade page speed and mobile conversion.

### 4.5 Billing

The Firebase **Blaze** plan is pay-as-you-go. Monitor the trial credit expiry and
set a budget alert in Google Cloud Billing. Main cost drivers: Google Places
Autocomplete calls, Directions API calls, Cloud Functions invocations, Storage
egress.

---

## 5. Open decisions (not blocking delivery)

| Item | Description | Trade-off |
|---|---|---|
| `minInstances: 1` on `placesAutocomplete` | Eliminates cold starts on the address autocomplete used in every booking form | Better UX / faster booking vs. permanent monthly cost |
| Local instant shortlist | Show Valenciennes, Lille, CDG, Orly, Brussels instantly before Google results return | Faster perceived response, fewer paid API calls vs. extra code to maintain |
| Google Search Console | Site verification + sitemap submission (issue #66) | Required for organic indexing; scheduled for end of project |

---

## 6. Pre-launch final checklist

- [ ] Mohammed's admin account created and tested (§1)
- [ ] `isAdmin()` updated in both rules files and deployed (§1.2)
- [ ] All Functions secrets set (§2.1)
- [ ] Stripe webhook configured, live keys in place, test booking completed (§2.2)
- [ ] Custom domain live, CORS updated (§2.3)
- [ ] Legal address decided and consistent everywhere (§3.1)
- [ ] Real phone number and geo coordinates in JSON-LD (§3.2)
- [ ] Brand name corrected in Firestore overrides (§3.3)
- [ ] Full booking funnel tested on mobile and desktop, in FR / EN / NL
- [ ] Confirmation emails received by both customer and `ADMIN_EMAIL`
- [ ] Google Search Console verified, sitemap submitted (§5)
- [ ] Credentials handover document delivered to Mohammed separately (never in the repo)

---

## 7. Development conventions (for any future contributor)

- **`localePath` is mandatory.** Every `href` must use `localePath(path, locale)`
  from `@/lib/utils/locale`. Raw absolute hrefs break i18n routing.
- **Branching:** `main` + `feature/*` only. Squash merge, delete branch after merge.
- **Never merge without explicit approval.**
- **`output: 'export'` constraints:** no API routes, no middleware, no Image
  Optimization API, no dynamic routes. Favicons live in `public/` only, declared
  via `metadata.icons`. Routes using `getTranslations` need
  `export const dynamic = 'force-static'`.
- **Dependencies:** always regenerate `package-lock.json` in the same PR, otherwise
  `npm ci` fails in CI.
- **Before pushing a large refactor:** `npx tsc --noEmit`, `npm run build`, ESLint.

---

## 8. Security note

Personal access tokens and API keys must never be committed to this repository or
shared in plain text. Any token that has been exposed should be revoked and
regenerated immediately, and the corresponding GitHub Actions secret updated,
followed by a redeploy.
