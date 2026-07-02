/**
 * components/pages/FaqPage.tsx
 *
 * Public FAQ page — reads FAQ entries from Firestore via useFaq().
 *
 * Data strategy:
 *   1. Primary source: Firestore `faq` collection (managed by admin panel #25).
 *      Each document has multilingual question/answer fields.
 *   2. Fallback: if Firestore returns 0 active items (first deploy, offline,
 *      or admin hasn't seeded data yet), the component renders the static
 *      FAQ items hardcoded in messages/*.json via next-intl (original behaviour).
 *
 * This dual-source approach means the site always has FAQ content, even before
 * Mohammed populates Firestore.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useFaq } from '@/lib/hooks/useFaq';
// Static fallback keys — single source of truth shared with FaqJsonLd.tsx
// so the visible page and the Schema.org structured data cannot drift
// apart (see issue #91).
import { STATIC_FAQ_KEYS } from '@/lib/data/faq';
import styles from './FaqPage.module.css';

export default function FaqPage() {
  const t        = useTranslations('faq');
  const pathname = usePathname();
  const locale   = getLocaleFromPath(pathname);
  const { items, loading } = useFaq(locale as 'fr' | 'en' | 'nl');

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i));
  }

  // Determine which source to render
  const useFirestore = !loading && items.length > 0;

  return (
    <div className={styles.wrapper}>
      {/* ── Background image overlay ── */}
      <div className={styles.bgOverlay} aria-hidden />

      {/* ── Hero title ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{t('page_title')}</h1>
        <div className={styles.separator} aria-hidden />
      </section>

      {/* ── Accordion list ── */}
      <section className={styles.accordionSection}>
        <div className={styles.accordionList}>
          {useFirestore
            ? /* ── Firestore-powered FAQ ── */
              items.map((item, i) => {
                const isOpen = openIndex === i;
                const q = item.question[locale as 'fr' | 'en' | 'nl'] || item.question.fr;
                const a = item.answer[locale as 'fr' | 'en' | 'nl']   || item.answer.fr;
                return (
                  <div
                    key={item.id}
                    className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
                  >
                    <button
                      className={styles.question}
                      onClick={() => toggle(i)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.questionText}>{q}</span>
                      <span className={styles.icon} aria-hidden>
                        {isOpen ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                      </span>
                    </button>
                    <div
                      className={styles.answerWrapper}
                      style={{ maxHeight: isOpen ? '400px' : '0' }}
                    >
                      <p className={styles.answer}>{a}</p>
                    </div>
                  </div>
                );
              })
            : /* ── Static i18n fallback ── */
              STATIC_FAQ_KEYS.map((key, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    key={key}
                    className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
                  >
                    <button
                      className={styles.question}
                      onClick={() => toggle(i)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.questionText}>{t(`q_${key}`)}</span>
                      <span className={styles.icon} aria-hidden>
                        {isOpen ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                      </span>
                    </button>
                    <div
                      className={styles.answerWrapper}
                      style={{ maxHeight: isOpen ? '400px' : '0' }}
                    >
                      <p className={styles.answer}>{t(`a_${key}`)}</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaText}>{t('cta_text')}</p>
        <Link href={localePath('/reservation', locale)} className={styles.ctaBtn}>
          {t('cta_btn')}
        </Link>
      </section>
    </div>
  );
}
