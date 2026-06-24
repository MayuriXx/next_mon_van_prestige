'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './FaqPage.module.css';

// ── FAQ items (keys reference messages/[locale].json faq.* namespace) ──
const FAQ_ITEMS = [
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

export default function FaqPage() {
  const t = useTranslations('faq');
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i));
  }

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
          {FAQ_ITEMS.map((key, i) => {
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
