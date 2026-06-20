import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  icon?: React.ReactNode;
  label: string;
  variant?: 'gold' | 'dark';
  className?: string;
}

export default function Badge({
  icon,
  label,
  variant = 'dark',
  className = '',
}: BadgeProps) {
  return (
    <div
      className={[styles.badge, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
    </div>
  );
}
