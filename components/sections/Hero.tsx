'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './Hero.module.css';

const SLIDES = [
  {
    id: 'chauffeur-prive',
    image: '/images/hero/chauffeur-prive.jpg',
    title: 'CHAUFFEUR PRIVÉ',
    tagline: 'VALENCIENNES ET SES ALENTOURS',
    subtitle: 'Excellence et raffinement depuis 2022',
    href: '/reservation',
  },
  {
    id: 'transfert-aeroport',
    image: '/images/hero/transfert-aeroport.jpg',
    title: 'TRANSFERT AÉROPORT',
    tagline: 'DISPONIBLE 24/7',
    subtitle: 'Paris CDG • Bruxelles • Lille',
    href: '/services/transfert-aeroport',
  },
  {
    id: 'deplacements-pro',
    image: '/images/hero/deplacements-pro.jpg',
    title: 'DÉPLACEMENTS PROFESSIONNELS',
    tagline: 'SERVICE PREMIUM',
    subtitle: 'Ponctualité et discrétion garanties',
    href: '/services/deplacements-professionnels',
  },
  {
    id: 'evenements-speciaux',
    image: '/images/hero/evenements-speciaux.jpg',
    title: 'ÉVÉNEMENTS SPÉCIAUX',
    tagline: 'MOMENTS INOUBLIABLES',
    subtitle: 'Mariages • Soirées • Cérémonies',
    href: '/services/evenements-speciaux',
  },
];

export default function Hero() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
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

  return (
    <section className={styles.hero}>
      {SLIDES.map((s, i) => (
        <div key={s.id} className={`${styles.bgImage} ${i === current ? styles.bgActive : ''}`}>
          <Image src={s.image} alt={s.title} fill priority={i === 0} quality={85} className={styles.image} />
        </div>
      ))}

      <div className={styles.overlay} />

      <div className={`${styles.content} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
        <div className={styles.inner}>
          <h1 className={styles.title}>{slide.title}</h1>
          <p className={styles.tagline}>{slide.tagline}</p>
          <p className={styles.subtitle}>{slide.subtitle}</p>
          <Link href={localePath(slide.href, locale)} className={styles.cta}>
            Réserver maintenant
          </Link>
        </div>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
