'use client';

/**
 * components/sections/About.tsx
 *
 * "À Propos" section on the homepage: section title, a "Who am I?" block,
 * and three value cards (Values / Mission / Vision).
 *
 * i18n (issue #87 / US-08, sub-task 08d):
 *   Previously, the fallback strings and the entire "value cards" block were
 *   hardcoded in French, so switching locale (EN/NL) left this section in
 *   French. All visible text now comes from messages/{locale}.json under the
 *   `about` namespace, so the section is fully translated. The French strings
 *   were carried over verbatim, so the FR homepage is unchanged.
 *
 * Firestore overrides (issue #63, extended by issue #104):
 *   Mohammed can override the following fields from the admin panel
 *   (/admin/contenus -> "À Propos"), stored as multilingual { fr, en, nl }
 *   fields on the single `contenus/about` document:
 *     - `title`         : the section title (falls back to about.title)
 *     - `text`          : the "Who am I?" body as a single rich block
 *                         (falls back to the two i18n paragraphs
 *                         about.whoText1 / about.whoText2)
 *     - `values_title`   : Values card title  (falls back to about.values.title)
 *     - `values_text`    : Values card text   (falls back to about.values.text)
 *     - `mission_title`  : Mission card title (falls back to about.mission.title)
 *     - `mission_text`   : Mission card text  (falls back to about.mission.text)
 *     - `vision_title`   : Vision card title  (falls back to about.vision.title)
 *     - `vision_text`    : Vision card text   (falls back to about.vision.text)
 *   Empty/missing fields fall through to the i18n defaults (same
 *   override+fallback pattern already used for `title` and `text`).
 *
 *   Note: the 3 value cards use compound field keys (`${key}_title` /
 *   `${key}_text`) on the same flat `contenus/about` doc, consistent with the
 *   compound-key pattern already used for `contenus/homeSections` (issue #102).
 *   No change to useContenus.ts was needed — get() treats these as ordinary
 *   field keys.
 */

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath } from '@/lib/utils/locale';
import { useContenus } from '@/lib/hooks/useContenus';
import styles from './About.module.css';

export default function About() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as 'fr' | 'en' | 'nl';
  const contenus = useContenus('about', locale);
  const t = useTranslations('about');

  const cards = [
    {
      key: 'values',
      title: contenus.get('values_title') || t('values.title'),
      text: contenus.get('values_text') || t('values.text'),
    },
    {
      key: 'mission',
      title: contenus.get('mission_title') || t('mission.title'),
      text: contenus.get('mission_text') || t('mission.text'),
    },
    {
      key: 'vision',
      title: contenus.get('vision_title') || t('vision.title'),
      text: contenus.get('vision_text') || t('vision.text'),
    },
  ];

  return (
    <section className={styles.section} id="a-propos">
      <div className={styles.overlay} />

      <div className={styles.inner}>
        {/* Title (Firestore override -> i18n fallback) */}
        <div className={styles.header}>
          <div className={styles.separator} />
          <h2 className={styles.title}>
            {contenus.get('title') || t('title')}
          </h2>
          <div className={styles.separator} />
        </div>

        {/* "Who am I?" card */}
        <div className={styles.whoCard}>
          {contenus.get('text') ? (
            /* Firestore override: single rich text block */
            <p className={styles.whoText}>{contenus.get('text')}</p>
          ) : (
            /* i18n fallback: two paragraphs */
            <>
              <p className={styles.whoText}>{t('whoText1')}</p>
              <p className={styles.whoText}>{t('whoText2')}</p>
            </>
          )}
        </div>

        {/* Three value cards (Firestore override -> i18n fallback) */}
        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={card.key} className={styles.card}>
              <h4 className={styles.cardTitle}>{card.title}</h4>
              <div className={styles.cardSeparator} />
              <p className={styles.cardText}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
