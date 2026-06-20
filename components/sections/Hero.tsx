'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { getHeroImage, type ImageData } from '@/lib/firebase/images';
import styles from './Hero.module.css';

export default function Hero() {
  const t = useTranslations('sections.hero');
  const [heroImage, setHeroImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHeroImage() {
      const image = await getHeroImage();
      setHeroImage(image);
      setLoading(false);
    }
    loadHeroImage();
  }, []);

  return (
    <section className={styles.hero}>
      {heroImage && !loading && (
        <Image
          src={heroImage.url}
          alt={heroImage.alt || 'MS Prestige Driver'}
          fill
          priority
          quality={85}
          className={styles.image}
        />
      )}
      
      <div className={styles.overlay} />
      
      <div className={styles.content}>
        <div className={styles.inner}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          
          <div className={styles.ctas}>
            <Button href="/reservation" variant="gold" size="lg">
              {t('cta_reserve')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
