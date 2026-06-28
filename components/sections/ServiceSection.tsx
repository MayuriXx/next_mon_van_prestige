'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import { getSectionContent, type SectionContent } from '@/lib/firebase/contenu';
import { getSectionImages, type ImageData } from '@/lib/firebase/images';
import styles from './ServiceSection.module.css';

const SERVICE_HREFS: Record<string, string> = {
  'transfert-aeroport':          '/services/transfert-aeroport',
  'transfert-simple':            '/services/transfert-simple',
  'mise-a-disposition':          '/services/mise-a-disposition',
  'evenements-speciaux':         '/services/evenements-speciaux',
  'escapades-loisirs':           '/services/escapades-loisirs',
  'deplacements-professionnels': '/services/deplacements-professionnels',
};

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
  const href = localePath(SERVICE_HREFS[sectionId] ?? '/reservation', locale);

  return (
    <div className={`${styles.section} ${imageLeft ? styles.imageLeft : styles.imageRight}`}>
      <div className={styles.imageWrapper}>
        {image && (
          <Image
            src={image.url}
            alt={image.alt || content.title}
            fill
            /**
             * Service sections alternate image left/right at 50% width on desktop.
             * On mobile they stack to full width.
             */
            sizes="(max-width: 768px) 100vw, 50vw"
            className={styles.image}
          />
        )}
      </div>
      <div className={styles.textWrapper}>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.description}>{content.description}</p>
        <Link href={href} className={styles.cta}>
          En savoir plus →
        </Link>
      </div>
    </div>
  );
}
