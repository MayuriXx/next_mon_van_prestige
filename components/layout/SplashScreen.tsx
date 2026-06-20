'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './SplashScreen.module.css';

const SPLASH_KEY = 'mvp_splash_shown';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(SPLASH_KEY)) return;

    setVisible(true);

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
          src="/images/ms_prestige_driver_logo.jpg"
          alt="MS Prestige Driver"
          width={280}
          height={280}
          priority
          className={styles.logo}
        />
      </div>
    </div>
  );
}
