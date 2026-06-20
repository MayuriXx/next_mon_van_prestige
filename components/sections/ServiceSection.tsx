'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getSectionContent, type SectionContent } from '@/lib/firebase/contenu';
import { getSectionImages, type ImageData } from '@/lib/firebase/images';
import Button from '@/components/ui/Button';
import styles from './ServiceSection.module.css';

interface ServiceSectionProps {
  sectionId: string;
  slug: string;
}

export default function ServiceSection({ sectionId, slug }: ServiceSectionProps) {
  const [content, setContent] = useState<SectionContent | null>(null);
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      const [contentData, imageData] = await Promise.all([
        getSectionContent(sectionId),
        getSectionImages(sectionId),
      ]);
      setContent(contentData);
      setImage(imageData);
      setLoading(false);
    }
    loadContent();
  }, [sectionId]);

  if (loading || !content) {
    return <section className={styles.section} />;
  }

  const imagePosition = content.imagePosition || 'left';

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={`${styles.grid} ${styles[`image${imagePosition === 'left' ? 'Left' : 'Right'}`]}`}>
          {image && (
            <div className={styles.imageWrapper}>
              <Image
                src={image.url}
                alt={image.alt || sectionId}
                fill
                className={styles.image}
              />
            </div>
          )}
          
          <div className={styles.textContent}>
            <h2 className={styles.title}>{content.title}</h2>
            <p className={styles.description}>{content.description}</p>
            <Button 
              href={`/services/${slug}`}
              variant="outline"
            >
              En savoir plus
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
