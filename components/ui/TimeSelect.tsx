'use client';

/**
 * components/ui/TimeSelect.tsx
 *
 * Uniform time picker used everywhere the site asks for a pickup / return time.
 *
 * Why it exists:
 *   The native `<input type="time">` has no dropdown picker on desktop Safari
 *   (iMac / macOS): the visitor is forced to type the time digit by digit
 *   (Mohamed's feedback). This component replaces it with the SAME control on
 *   every device — a text field the visitor can still type into, PLUS a
 *   click-to-pick dropdown of 5-minute slots. The look and behaviour are
 *   identical across Chrome / Safari / Firefox and mobile / tablet / desktop.
 *
 * Value contract:
 *   `value` / `onChange` speak the exact same "HH:MM" 24-hour string the native
 *   input produced, so callers (payload building, validation) are unchanged.
 *   An empty string means "no time chosen".
 *
 * Styling:
 *   The trigger input borrows the host form's field class (passed via
 *   `className`) so it blends in with the surrounding inputs; the dropdown
 *   popover is styled by this component so it is visually consistent everywhere.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TimeSelect.module.css';

interface TimeSelectProps {
  /** Current value as "HH:MM" (24h) or '' when empty. */
  value: string;
  /** Fired with a normalised "HH:MM" (or '') whenever the value changes. */
  onChange: (value: string) => void;
  /** Field class from the host form, applied to the trigger input. */
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Minute granularity of the dropdown list (default 5). */
  stepMinutes?: number;
}

const CLOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
  </svg>
);

/** Build the "HH:MM" option list for a given minute step. */
function buildOptions(step: number): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

/**
 * Turn a loose user entry into a canonical "HH:MM", or null if it can't be a
 * time. Accepts "7", "730", "0730", "7:30", "17h45", etc.
 */
function normalize(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  let hh: number;
  let mm: number;
  if (digits.length <= 2) {
    hh = parseInt(digits, 10);
    mm = 0;
  } else {
    hh = parseInt(digits.slice(0, digits.length - 2), 10);
    mm = parseInt(digits.slice(-2), 10);
  }
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function TimeSelect({
  value,
  onChange,
  className,
  placeholder = 'HH:MM',
  ariaLabel,
  stepMinutes = 5,
}: TimeSelectProps) {
  const options = useMemo(() => buildOptions(stepMinutes), [stepMinutes]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reflect external value changes (e.g. query-param prefill) into the field.
  useEffect(() => { setText(value); }, [value]);

  // Close when clicking outside the widget.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Filter the list against what the visitor has typed so far. The entry is
  // read as a time, not a literal prefix, so "7" and "730" both land on the
  // 07:xx rows (the native input accepted "0730"; users type "730" too).
  const typed = text.replace(/\D/g, '');
  const filtered = useMemo(() => {
    if (!typed) return options;
    // 1–2 digits → an hour ("7" → 07:xx, "17" → 17:xx).
    // 3–4 digits → hour is everything but the last two ("730" → 07, "1745" → 17),
    // so we surface that hour's slots for a quick fine-pick.
    const hourStr = typed.length <= 2 ? typed : typed.slice(0, typed.length - 2);
    const hr = parseInt(hourStr, 10);
    const match =
      hr <= 23 ? options.filter((o) => parseInt(o.slice(0, 2), 10) === hr) : [];
    return match.length ? match : options;
  }, [typed, options]);

  // On open, scroll the selected (or first) row into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const target =
      listRef.current.querySelector('[data-selected="true"]') ??
      listRef.current.querySelector('li');
    (target as HTMLElement | null)?.scrollIntoView({ block: 'center' });
  }, [open, filtered]);

  function commit(raw: string) {
    if (raw === '') { onChange(''); setText(''); return; }
    const norm = normalize(raw);
    if (norm) { onChange(norm); setText(norm); }
    else setText(value); // revert an unparseable entry to the last good value
  }

  function select(opt: string) {
    onChange(opt);
    setText(opt);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        type="text"
        inputMode="numeric"
        className={className}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => { setText(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Prefer the exact time the digits spell out ("737" → 07:37); fall
            // back to the first listed slot only when the entry isn't a time.
            const norm = normalize(text);
            if (norm) select(norm);
            else if (filtered[0]) select(filtered[0]);
          }
          else if (e.key === 'Escape') setOpen(false);
        }}
        onBlur={() => commit(text)}
        autoComplete="off"
      />
      <span className={styles.icon}>{CLOCK_ICON}</span>
      {open && (
        <ul className={styles.list} ref={listRef} role="listbox">
          {filtered.map((opt) => {
            const selected = opt === value;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={selected}
                data-selected={selected}
                className={`${styles.item} ${selected ? styles.itemSelected : ''}`}
                // mousedown (not click) + preventDefault keeps focus on the input
                // so the field's blur doesn't fire before the selection lands.
                onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
