'use client';

/**
 * components/sections/Hero.tsx
 *
 * Fullscreen image slider displayed on the homepage.
 *
 * Business purpose:
 *   The hero section is the first thing visitors see. It cycles through four
 *   slides that each highlight a key service (private chauffeur, airport
 *   transfer, business travel, special events). Each slide shows a title,
 *   a tagline, a subtitle, and a CTA button that links to the relevant page.
 *
 * i18n (issue #87 / US-08, sub-task 08a):
 *   Slide title/tagline/subtitle used to be hardcoded in French directly in
 *   this file. They are now read from messages/{locale}.json under
 *   `hero.slides.{slideId}.*`, so switching locale (FR/EN/NL) actually
 *   translates the hero content instead of always showing French.
 *
 * Firestore integration (issue #62):
 *   Mohammed can override the tagline of the FIRST slide (the "chauffeur-prive"
 *   slide) via the admin panel (/admin/contenus -> "Page d'accueil - Hero").
 *   The override is stored as a multilingual field:
 *     { tagline: { fr: string; en: string; nl: string } }
 *   If the field is empty or the document does not exist, the i18n string
 *   (hero.slides.chauffeur-prive.tagline) is used as fallback. Slide images
 *   and titles are NOT editable via the admin panel at this stage.
 *
 *   Only the FIRST slide's tagline is wired to Firestore because:
 *   - The admin form only exposes one tagline field (designed in #25)
 *   - Other slides have operational content (e.g. "DISPONIBLE 24/7") that is
 *     unlikely to need branding overrides
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { useContenus } from '@/lib/hooks/useContenus';
import styles from './Hero.module.css';

// ---------------------------------------------------------------------------
// Static slide data
// Only the id, image and href are static here. The visible title/tagline/
// subtitle come from i18n (messages/{locale}.json -> hero.slides.{id}.*),
// with slide[0].tagline additionally overridable via Firestore (see notes
// above).
// ---------------------------------------------------------------------------
const SLIDES = [
  {
    id: 'chauffeur-prive',
    image: '/images/hero/chauffeur-prive.webp',
    href: '/reservation',
  },
  {
    id: 'transfert-aeroport',
    image: '/images/hero/transfert-aeroport.webp',
    href: '/services/transfert-aeroport',
  },
  {
    id: 'deplacements-pro',
    image: '/images/hero/deplacements-pro.webp',
    href: '/services/deplacements-professionnels',
  },
  {
    id: 'evenements-speciaux',
    image: '/images/hero/evenements-speciaux.webp',
    href: '/services/evenements-speciaux',
  },
];

// Index of the slide whose tagline is controllable via Firestore.
const FIRESTORE_TAGLINE_SLIDE_INDEX = 0;

// Auto-advance interval for the hero carousel, in milliseconds.
// Reduced from 5000 ms to 3500 ms (US-07 / issue #86): Mohammed reported the
// previous 5 s pacing felt too slow. 3500 ms advances ~30% faster while still
// leaving enough time to read each slide's title, tagline and subtitle.
// The 300 ms text-fade transition (the goTo() setTimeout and the .fadeOut
// animation in Hero.module.css) is intentionally left unchanged, per the
// client decision to keep the elegant crossfade.
const SLIDE_INTERVAL_MS = 3500;

export default function Hero() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('hero');

  // Fetch Firestore content overrides for the 'hero' section.
  const { get: getContenu } = useContenus('hero', locale);

  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning]);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [current, goTo]);

  const slide = SLIDES[current];
  const title = t(`slides.${slide.id}.title`);
  const subtitle = t(`slides.${slide.id}.subtitle`);
  const i18nTagline = t(`slides.${slide.id}.tagline`);

  /**
   * For the first slide, prefer the Firestore override if non-empty.
   * For all other slides, use the i18n tagline.
   */
  const tagline =
    current === FIRESTORE_TAGLINE_SLIDE_INDEX
      ? getContenu('tagline') || i18nTagline
      : i18nTagline;

  return (
    <section className={styles.hero}>
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={`${styles.bgImage}${i === current ? ` ${styles.bgActive}` : ''}`}
        >
          <Image
            src={s.image}
            alt={t(`slides.${s.id}.title`)}
            fill
            priority={i === 0}
            sizes="100vw"
            quality={85}
            className={styles.image}
          />
        </div>
      ))}

      <div className={styles.overlay} />

      <div className={`${styles.content}${isTransitioning ? ` ${styles.fadeOut}` : ` ${styles.fadeIn}`}`}>
        <div className={styles.inner}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.tagline}>{tagline}</p>
          <p className={styles.subtitle}>{subtitle}</p>
          <Link href={localePath(slide.href, locale)} className={styles.cta}>
            {t('cta')}
          </Link>
        </div>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot}${i === current ? ` ${styles.dotActive}` : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
