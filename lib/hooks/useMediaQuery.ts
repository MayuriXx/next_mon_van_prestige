/**
 * lib/hooks/useMediaQuery.ts
 *
 * SSR-safe media-query hook built on `useSyncExternalStore`. The server
 * snapshot is always `false`, so the first client paint matches the server
 * render (no hydration mismatch); React then reconciles to the real match.
 * This lets components — notably the admin UI, whose inline styles cannot carry
 * `@media` rules — switch layout based on viewport width.
 */
'use client';

import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True when the viewport is at or below the mobile breakpoint (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
