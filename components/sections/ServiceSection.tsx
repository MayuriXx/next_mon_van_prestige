'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSectionContent, type SectionContent } from '@/lib/firebase/contenu';
import { getSectionImages, type ImageData } from '@/lib/firebase/images';
import { localePath, getLocaleFromPath } from '@/lib/utils/locale';
import styles from './ServiceSection.module.css';

interface ServiceSectionProps {
  sectionId: string;
  slug: string;
}

export default function ServiceSection({ sectionId, slug }: ServiceSectionProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [content, setContent] = useState<SectionContent | null>(null);
  const [image, setImage] = useState<ImageData | null>(null);

  useEffect(() => {
    async function load() {
      const [c, img] = await Promise.all([
        getSectionContent(sectionId),
        getSectionImages(sectionId),
      ]);
      setContent(c);
      setImage(img);
    }
    load();
  }, [sectionId]);

  if (!content) return null;

  const imageLeft = content.imagePosition === 'left';

  return (
    <div className={`${styles.section} ${imageLeft ? styles.imageLeft : styles.imageRight}`}>
      <div className={styles.imageWrapper}>
        {image && (
          <Image
            src={image.url}
            alt={image.alt || content.title}
            fill
            className={styles.image}
          />
        )}
      </div>

      <div className={styles.textWrapper}>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.description}>{content.description}</p>
        <div className={styles.ctaGroup}>
          <Link href={localePath(`/services/${slug}`, locale)} className={styles.ctaLearn}>
            En savoir plus →
          </Link>
          <Link href={localePath('/reservation', locale)} className={styles.cta}>
            Réserver
          </Link>
        </div>
      </div>
    </div>
  );
}
