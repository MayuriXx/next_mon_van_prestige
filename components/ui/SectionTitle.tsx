import styles from './SectionTitle.module.css';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: SectionTitleProps) {
  return (
    <div
      className={[styles.wrapper, styles[align], className]
        .filter(Boolean)
        .join(' ')}
    >
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.separator} aria-hidden="true" />
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
