'use client';

/**
 * components/ui/ErrorToaster.tsx
 *
 * Global error notifications.
 *
 * Business rationale:
 * Until now, when a Firebase call or a routing API call failed, the site
 * degraded silently — a form button simply did nothing, or the pricing quietly
 * fell back to hardcoded defaults. Visitors had no way to know something went
 * wrong, and the operator had no way to notice either. This component makes
 * every reported failure visible.
 *
 * Two verbosity modes:
 *  - `user` (public site): a short, plain-French message only. No error codes,
 *    no internals leaked to visitors.
 *  - `technical` (admin panel): the same message plus the raw code/message,
 *    because whoever is logged into /admin is the person who has to fix it.
 *
 * Sources covered:
 *  - explicit `reportError()` calls from anywhere in the app
 *  - uncaught runtime errors (`window.onerror`)
 *  - unhandled promise rejections (`unhandledrejection`)
 */

import { useEffect, useState, useCallback } from 'react';
import { subscribeToErrors, reportError, type AppError } from '@/lib/errors/errorBus';

const AUTO_DISMISS_MS = 8000;
/** Cap so a failing loop cannot paper the whole viewport. */
const MAX_VISIBLE = 3;

export default function ErrorToaster({
  verbosity = 'user',
}: {
  verbosity?: 'user' | 'technical';
}) {
  const [toasts, setToasts] = useState<AppError[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToErrors((e) => {
      setToasts((prev) => {
        // De-duplicate: a retry loop should refresh the existing toast rather
        // than stack ten identical ones.
        if (prev.some((p) => p.userMessage === e.userMessage)) return prev;
        return [...prev, e].slice(-MAX_VISIBLE);
      });
      window.setTimeout(() => dismiss(e.id), AUTO_DISMISS_MS);
    });
    return unsubscribe;
  }, [dismiss]);

  // Catch anything that never went through a try/catch at all.
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      reportError(ev.error ?? ev.message, "Une erreur inattendue est survenue.", 'window');
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      reportError(ev.reason, "Une opération a échoué.", 'promise');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      // aria-live so screen readers announce failures without stealing focus.
      role="status"
      aria-live="polite"
      style={{
        position      : 'fixed',
        bottom        : '1rem',
        left          : '1rem',
        zIndex        : 9999,
        display       : 'flex',
        flexDirection : 'column',
        gap           : '0.5rem',
        maxWidth      : 'min(380px, calc(100vw - 2rem))',
        pointerEvents : 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents : 'auto',
            display       : 'flex',
            alignItems    : 'flex-start',
            gap           : '0.6rem',
            background    : 'var(--color-card, #1a1a1a)',
            color         : 'var(--color-text, #ededed)',
            border        : `1px solid ${t.severity === 'warning' ? 'var(--color-gold, #D4AF37)' : '#C0392B'}`,
            borderLeftWidth: '3px',
            borderRadius  : '6px',
            padding       : '0.7rem 0.8rem',
            fontFamily    : 'var(--font-body)',
            fontSize      : '0.85rem',
            lineHeight    : 1.45,
            boxShadow     : '0 6px 24px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{t.userMessage}</div>

            {verbosity === 'technical' && t.technical && (
              <div
                style={{
                  marginTop  : '0.35rem',
                  fontFamily : 'monospace',
                  fontSize   : '0.72rem',
                  opacity    : 0.75,
                  wordBreak  : 'break-word',
                }}
              >
                {t.source}: {t.technical}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Fermer la notification"
            style={{
              background : 'none',
              border     : 'none',
              color      : 'inherit',
              opacity    : 0.6,
              cursor     : 'pointer',
              fontSize   : '1rem',
              lineHeight : 1,
              padding    : 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
