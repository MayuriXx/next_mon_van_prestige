'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSectionContent, type SectionContent } from '@/lib/firebase/contenu';
import { getSectionImages, type ImageData } from '@/lib/firebase/images';
import styles from './ServiceSection.module.css';

interface ServiceSectionProps {
  sectionId: string;
  slug: string;
}

export default function ServiceSection({ sectionId, slug }: ServiceSectionProps) {
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
        <Link href={`/reservation`} className={styles.cta}>
          Réserver →
        </Link>
      </div>
    </div>
  );
}
