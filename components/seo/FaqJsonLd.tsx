/**
 * components/seo/FaqJsonLd.tsx
 *
 * Injects a Schema.org FAQPage structured data block for the /faq route.
 * Google uses this to display FAQ rich results directly in the SERP
 * (expandable question/answer pairs beneath the organic listing).
 *
 * Single source of truth (issue #91):
 *   This component mirrors components/pages/FaqPage.tsx exactly, so the
 *   structured data sent to Google always matches what a visitor actually
 *   sees on the page:
 *     1. Primary source: Firestore `faq` collection via useFaq(locale) —
 *        same hook, same data as FaqPage.tsx, managed by Mohammed through
 *        /admin (#25).
 *     2. Fallback: the static messages/{locale}.json `faq.*` keys, listed
 *        in the shared STATIC_FAQ_KEYS (lib/data/faq.ts). Used while the
 *        Firestore snapshot is loading, or once loaded with 0 active
 *        entries — identical fallback logic to FaqPage.tsx
 *        (`useFirestore = !loading && items.length > 0`).
 *   The locale is read from the URL path via getLocaleFromPath (same
 *   helper FaqPage.tsx uses), so /en and /nl now emit English/Dutch
 *   structured data instead of always French.
 *
 * Trade-off (documented in #91, accepted): this is now a client component,
 * so the JSON-LD is injected after hydration rather than fully
 * server-rendered. This is acceptable because the FAQ page itself is
 * already 100% client-rendered from Firestore under `output: 'export'` —
 * Google must execute JS to see the real FAQ content either way, and
 * Google does render client-injected structured data. During the static
 * build / before hydration, useFaq()'s Firestore listener hasn't attached
 * yet (loading = true), so this still emits valid FAQPage markup using the
 * static i18n fallback — the page is never without structured data.
 *
 * Schema.org reference: https://schema.org/FAQPage
 */
'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath } from '@/lib/utils/locale';
import { useFaq } from '@/lib/hooks/useFaq';
import { STATIC_FAQ_KEYS } from '@/lib/data/faq';
import JsonLd from './JsonLd';

export default function FaqJsonLd() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { items, loading } = useFaq(locale);
  const t = useTranslations('faq');

  // Identical fallback logic to FaqPage.tsx: while Firestore is loading, or
  // once loaded with 0 active entries, use the static i18n fallback.
  const useFirestore = !loading && items.length > 0;

  const faqItems = useFirestore
    ? // Firestore items already come active-only and ordered by `order`
      // asc from useFaq(), so mapping preserves that order.
      items.map((item) => ({
        question: item.question[locale] || item.question.fr,
        answer: item.answer[locale] || item.answer.fr,
      }))
    : STATIC_FAQ_KEYS.map((key) => ({
        question: t(`q_${key}`),
        answer: t(`a_${key}`),
      }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return <JsonLd data={schema} />;
}
