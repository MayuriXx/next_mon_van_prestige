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
 * Firestore integration (issue #62):
 *   Mohammed can override the tagline of the FIRST slide (the "chauffeur-privé"
 *   slide) via the admin panel (/admin/contenus → "Page d'accueil — Hero").
 *   The override is stored in  as a multilingual field:
 *     { tagline: { fr: string; en: string; nl: string } }
 *   If the field is empty or the document does not exist, the hardcoded
 *   static string is used as fallback. Slide images and titles are NOT
 *   editable via the admin panel at this stage.
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
// Titles and subtitles are hardcoded; only slide[0].tagline can be overridden
// via Firestore (see Firestore integration notes above).
// ---------------------------------------------------------------------------
const SLIDES = [
  {
    id: 'chauffeur-prive',
    image: '/images/hero/chauffeur-prive.webp',
    title: 'CHAUFFEUR PRIVÉ',
    tagline: 'VALENCIENNES ET SES ALENTOURS',
    subtitle: 'Excellence et raffinement depuis 2022',
    href: '/reservation',
  },
  {
    id: 'transfert-aeroport',
    image: '/images/hero/transfert-aeroport.webp',
    title: 'TRANSFERT AÉROPORT',
    tagline: 'DISPONIBLE 24/7',
    subtitle: 'Paris CDG • Bruxelles • Lille',
    href: '/services/transfert-aeroport',
  },
  {
    id: 'deplacements-pro',
    image: '/images/hero/deplacements-pro.webp',
    title: 'DÉPLACEMENTS PROFESSIONNELS',
    tagline: 'SERVICE PREMIUM',
    subtitle: 'Ponctualité et discrétion garanties',
    href: '/services/deplacements-professionnels',
  },
  {
    id: 'evenements-speciaux',
    image: '/images/hero/evenements-speciaux.webp',
    title: 'ÉVÉNEMENTS SPÉCIAUX',
    tagline: 'MOMENTS INOUBLIABLES',
    subtitle: 'Mariages • Soirées • Cérémonies',
    href: '/services/evenements-speciaux',
  },
];

// Index of the slide whose tagline is controllable via Firestore.
const FIRESTORE_TAGLINE_SLIDE_INDEX = 0;

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
    }, 5000);
    return () => clearInterval(timer);
  }, [current, goTo]);

  const slide = SLIDES[current];

  /**
   * For the first slide, prefer the Firestore override if non-empty.
   * For all other slides, use the hardcoded static tagline.
   */
  const tagline =
    current === FIRESTORE_TAGLINE_SLIDE_INDEX
      ? getContenu('tagline') || slide.tagline
      : slide.tagline;

  return (
    <section className={styles.hero}>
      {SLIDES.map((s, i) => (
        <div key={s.id} className={}>
          <Image
            src={s.image}
            alt={s.title}
            fill
            /**
             * priority=true only on the first slide (LCP element).
             * Other slides are lazy-loaded; they are hidden off-screen
             * and do not affect LCP or initial page load.
             */
            priority={i === 0}
            /**
             * sizes tells the browser the rendered width of this image at
             * each breakpoint, so it can select the right srcset entry.
             * Hero covers 100vw at all breakpoints.
             */
            sizes="100vw"
            quality={85}
            className={styles.image}
          />
        </div>
      ))}

      <div className={styles.overlay} />

      <div className={}>
        <div className={styles.inner}>
          <h1 className={styles.title}>{slide.title}</h1>
          <p className={styles.tagline}>{tagline}</p>
          <p className={styles.subtitle}>{slide.subtitle}</p>
          <Link href={localePath(slide.href, locale)} className={styles.cta}>
            {t('cta')}
          </Link>
        </div>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={}
            onClick={() => goTo(i)}
            aria-label={}
          />
        ))}
      </div>
    </section>
  );
}
