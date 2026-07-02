'use client';

/**
 * components/sections/ServiceSection.tsx
 *
 * Alternating image/text teaser block for a single service, rendered
 * repeatedly on the homepage (see app/[locale]/page.tsx).
 *
 * i18n (issue #87 / US-08, sub-task 08c):
 *   This component previously read its title/description from
 *   `getSectionContent(sectionId)` (lib/firebase/contenu.ts), which tried the
 *   Firestore `sections` collection and fell back to the hardcoded French
 *   `sectionsData` map. Two problems flagged in #87:
 *     1. `getSectionContent()` was NOT locale-aware, so the homepage teasers
 *        always showed French regardless of the active locale.
 *     2. Nothing ever writes to the `sections` collection — the admin panel
 *        (/admin/contenus) writes to the `contenus` collection — so the
 *        Firestore branch was effectively dead code and the teasers were
 *        always the hardcoded French fallback.
 *
 *   The teaser text now comes from i18n (messages/{locale}.json ->
 *   `homeSections.{sectionId}.{title,description}`), so switching locale
 *   (FR/EN/NL) correctly translates each teaser. The French strings were
 *   carried over verbatim from the previous `sectionsData` map, so the FR
 *   homepage is byte-for-byte unchanged; EN and NL are now populated instead
 *   of silently showing French.
 *
 *   The "En savoir plus →" CTA is now localized via the shared
 *   `cta.learnMore` key (the arrow is kept as static decoration).
 *
 *   `imagePosition` (left/right alternation) is layout, not content, so it
 *   stays as static config in this file rather than living in i18n or
 *   Firestore.
 *
 *   Section images are unchanged: they are still loaded from Firestore via
 *   `getSectionImages(sectionId)` (a separate images subsystem, issue #23).
 *
 * NOTE (deferred): the homepage teaser text is intentionally NOT wired to a
 * Firestore override in this PR. The admin `contenus/{service}` documents hold
 * the *service page* title/subtitle, which is different content from these
 * homepage teasers; reusing them would conflate the two. If Mohammed needs to
 * edit the homepage teasers from the admin panel, that requires a dedicated
 * admin field and can be done as a follow-up.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
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

/**
 * Image left/right alternation per section, matching the previous
 * `sectionsData[*].imagePosition` values so the visual layout is unchanged.
 */
const IMAGE_POSITION: Record<string, 'left' | 'right'> = {
  'transfert-aeroport':          'left',
  'transfert-simple':            'right',
  'mise-a-disposition':          'left',
  'evenements-speciaux':         'right',
  'escapades-loisirs':           'left',
  'deplacements-professionnels': 'right',
};

interface ServiceSectionProps {
  sectionId: string;
  slug: string;
}

export default function ServiceSection({ sectionId, slug }: ServiceSectionProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations('homeSections');
  const [image, setImage] = useState<ImageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSectionImages(sectionId)
      .then((img) => { if (!cancelled) setImage(img); })
      .catch(() => { if (!cancelled) setImage(null); });
    return () => { cancelled = true; };
  }, [sectionId]);

  const title = t(`${sectionId}.title`);
  const description = t(`${sectionId}.description`);
  const imageLeft = (IMAGE_POSITION[sectionId] ?? 'left') === 'left';
  const href = localePath(SERVICE_HREFS[sectionId] ?? '/reservation', locale);

  return (
    <div className={`${styles.section} ${imageLeft ? styles.imageLeft : styles.imageRight}`}>
      <div className={styles.imageWrapper}>
        {image && (
          <Image
            src={image.url}
            alt={image.alt || title}
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
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <Link href={href} className={styles.cta}>
          {t('learnMore')} →
        </Link>
      </div>
    </div>
  );
}
