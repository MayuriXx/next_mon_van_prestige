'use client';

/**
 * components/pages/TransferModal.tsx
 *
 * "Plan your transfer" modal opened from the airport package cards
 * (see TransfertAeroportPage). Instead of navigating straight to the
 * reservation funnel, clicking "Réserver" on a card opens this popup so the
 * visitor can pre-fill their pickup date, time, passenger count and optional
 * return trip. On submit it forwards those values to /reservation via query
 * params (departure is always Valenciennes, arrival is the selected airport),
 * where ReservationPage reads them and pre-populates the calculator.
 *
 * i18n: all labels come from the `transfertAeroport` namespace
 * (messages/{locale}.json → modal_*). The route line reuses the existing
 * `from` key (Valenciennes) plus the localized destination passed in as prop.
 *
 * Accessibility: rendered as role="dialog", closes on Escape, on overlay
 * click and on the × button; background scroll is locked while open.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { localePath } from '@/lib/utils/locale';
import styles from './TransferModal.module.css';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  /** Localized destination label shown in the route line + forwarded as arrival. */
  destination: string;
  /** Departure label (Valenciennes), forwarded as departure. */
  departure: string;
  locale: string;
}

export default function TransferModal({
  open,
  onClose,
  destination,
  departure,
  locale,
}: TransferModalProps) {
  const t = useTranslations('transfertAeroport');
  const router = useRouter();

  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [passengers, setPassengers] = useState('');
  const [addReturn, setAddReturn] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [returnHour, setReturnHour] = useState('');

  /* Lock background scroll + close on Escape while open. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit() {
    const params = new URLSearchParams({
      departure,
      arrival: destination,
      trip: addReturn ? 'round_trip' : 'one_way',
    });
    if (date) params.set('date', date);
    if (hour) params.set('hour', hour);
    if (passengers) params.set('passengers', passengers);
    if (addReturn && returnDate) params.set('returnDate', returnDate);
    if (addReturn && returnHour) params.set('returnHour', returnHour);
    router.push(`${localePath('/reservation', locale)}?${params.toString()}`);
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('modal_title')}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t('modal_close')}
        >
          ×
        </button>

        <h2 className={styles.title}>{t('modal_title')}</h2>
        <p className={styles.route}>
          {departure} <span className={styles.routeArrow}>→</span> {destination}
        </p>

        <div className={styles.separator} />

        <label className={styles.field}>
          <span className={styles.label}>{t('modal_date_label')}</span>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('modal_time_label')}</span>
          <input
            type="time"
            className={styles.input}
            value={hour}
            onChange={(e) => setHour(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('modal_passengers_label')}</span>
          <select
            className={styles.select}
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
          >
            <option value="">{t('modal_passengers_placeholder')}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`${styles.returnBox} ${addReturn ? styles.returnBoxActive : ''}`}
          onClick={() => setAddReturn((v) => !v)}
        >
          <span className={`${styles.checkbox} ${addReturn ? styles.checkboxChecked : ''}`}>
            {addReturn ? '✓' : ''}
          </span>
          <span className={styles.returnLabel}>{t('modal_return_label')}</span>
          <span className={styles.returnBadge}>{t('modal_return_badge')}</span>
        </button>

        {addReturn && (
          <div className={styles.returnSection}>
            <div className={styles.separator} />
            <p className={styles.returnSectionTitle}>{t('modal_return_section')}</p>

            <label className={styles.field}>
              <span className={styles.label}>{t('modal_return_date_label')}</span>
              <input
                type="date"
                className={styles.input}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{t('modal_return_time_label')}</span>
              <input
                type="time"
                className={styles.input}
                value={returnHour}
                onChange={(e) => setReturnHour(e.target.value)}
              />
            </label>
          </div>
        )}

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          {t('modal_submit')}
        </button>
      </div>
    </div>
  );
}
