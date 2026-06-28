'use client';

/**
 * components/layout/SplashScreen.tsx
 *
 * Full-screen branded overlay shown on the very first page load of a session.
 *
 * Business purpose:
 *   Creates a premium first impression by displaying the MS Prestige Driver
 *   logo for ~2 seconds before revealing the site content.
 *   SessionStorage ensures the splash is shown only once per browser session.
 *
 * Fix (issue #72) — Hero image flash before splash:
 *   The previous implementation initialised `visible` to `false` and set it
 *   to `true` inside useEffect (after hydration). This caused a brief flash
 *   where the Hero image was visible before the splash appeared.
 *
 *   Solution: initialise `visible` to `true` so the overlay is present from
 *   the very first render / paint. useEffect then checks sessionStorage:
 *   - Already seen this session  → hide immediately (no animation).
 *   - First visit                → run the normal 2s + 0.7s fade-out sequence.
 *
 *   SSR safety: rendering the splash on the server (visible=true) is
 *   intentional — it produces the correct initial HTML so no content bleeds
 *   through before JS hydrates. There is no hydration mismatch because the
 *   client also starts with visible=true and only hides after useEffect runs.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './SplashScreen.module.css';

const SPLASH_KEY = 'mvp_splash_shown';

export default function SplashScreen() {
  // Start visible=true so the overlay covers the page from the first paint.
  // This prevents any Hero content from bleeding through before useEffect runs.
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') {
      // SSR / environments without sessionStorage — hide immediately.
      setVisible(false);
      return;
    }

    if (sessionStorage.getItem(SPLASH_KEY)) {
      // Already shown this session: remove instantly, no animation.
      setVisible(false);
      return;
    }

    // First visit: display for 2s then fade out over 0.7s.
    const hideTimer = setTimeout(() => setHiding(true), 2000);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_KEY, '1');
    }, 2700);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.splash} ${hiding ? styles.hide : ''}`}>
      <div className={styles.logoWrap}>
        <Image
          src="/images/ms_prestige_driver_logo_splash.webp"
          alt="MS Prestige Driver"
          width={280}
          height={280}
          priority
          sizes="280px"
          className={styles.logo}
        />
        <p className={styles.name}>MS Prestige Driver</p>
        <p className={styles.tagline}>Excellence et raffinement depuis 2022</p>
      </div>
    </div>
  );
}
