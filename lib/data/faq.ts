/**
 * lib/data/faq.ts
 *
 * Single source of truth for the FAQ i18n fallback key list.
 *
 * Each key maps to a `q_{key}` / `a_{key}` pair in messages/{fr,en,nl}.json.
 * This fallback content is used whenever Firestore's `faq` collection has
 * zero active entries — first deploy, before Mohammed seeds content via
 * /admin (#25), or while the Firestore snapshot is still loading.
 *
 * Both the visible FAQ page (components/pages/FaqPage.tsx) and the FAQ
 * Schema.org structured data (components/seo/FaqJsonLd.tsx) import this
 * list, instead of each keeping their own copy, so the two can never drift
 * apart — see issue #91.
 */
export const STATIC_FAQ_KEYS = [
  'how_to_book',
  'payment_methods',
  'where_to_meet',
  'animals_allowed',
  'no_driver_rental',
  'chauffeur_disposal',
  'child_seats',
  'private_and_pro',
  'delay_policy',
  'invoice_payment',
  'how_to_book_2',
] as const;

export type FaqStaticKey = (typeof STATIC_FAQ_KEYS)[number];
