import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        hover ? styles.hover : '',
        styles[`p-${padding}`],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
