/**
 * lib/errors/errorBus.ts
 *
 * A tiny, framework-agnostic error bus.
 *
 * Why this exists:
 * Several failure paths live in plain module-level `async function`s (address
 * autocomplete, geocoding, route calculation) rather than inside React
 * components. Those functions cannot call hooks, so they have no way to reach
 * a React context. Historically they swallowed the error and returned
 * `null` / `[]`, which is why a broken API key produced a silently dead UI
 * with no feedback at all.
 *
 * This module is deliberately dependency-free and React-free: anything can
 * import `reportError()`, and the UI layer subscribes to it separately.
 */

export type ErrorSeverity = 'error' | 'warning';

export interface AppError {
  /** Stable id, used as React key and for de-duplication. */
  id: string;
  /** Short message safe to display to any visitor. French, no jargon. */
  userMessage: string;
  /** Full technical detail. Shown only in admin, always sent to console. */
  technical?: string;
  severity: ErrorSeverity;
  /** Where it came from, e.g. 'auth', 'firestore', 'route', 'window'. */
  source: string;
  at: number;
}

type Listener = (e: AppError) => void;

const listeners = new Set<Listener>();

export function subscribeToErrors(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Maps known Firebase / network error codes to a French message a visitor can
 * understand. Anything unmapped falls back to a generic message; the raw code
 * is still preserved in `technical` so nothing is lost.
 */
function toUserMessage(code: string | undefined, fallback: string): string {
  if (!code) return fallback;

  const map: Record<string, string> = {
    // --- Auth ---
    'auth/invalid-email': "Adresse e-mail invalide.",
    'auth/user-disabled': "Ce compte a été désactivé.",
    'auth/user-not-found': "Aucun compte ne correspond à cet e-mail.",
    'auth/wrong-password': "Mot de passe incorrect.",
    'auth/invalid-credential': "E-mail ou mot de passe incorrect.",
    'auth/invalid-login-credentials': "E-mail ou mot de passe incorrect.",
    'auth/too-many-requests':
      "Trop de tentatives. Réessayez dans quelques minutes.",
    'auth/network-request-failed':
      "Connexion au serveur impossible. Vérifiez votre réseau.",
    'auth/operation-not-allowed':
      "La connexion par e-mail n'est pas activée sur ce projet.",
    // This is the one that cost us a debugging session: the message must say
    // plainly that it is a configuration problem, not a wrong password.
    'auth/invalid-api-key':
      "Configuration du site invalide (clé API). Contactez l'administrateur.",
    'auth/api-key-expired':
      "Configuration du site expirée (clé API). Contactez l'administrateur.",

    // --- Firestore / Storage ---
    'permission-denied': "Vous n'avez pas les droits nécessaires.",
    'unavailable': "Service momentanément indisponible. Réessayez.",
    'storage/unauthorized': "Vous n'avez pas les droits pour ce fichier.",
    'storage/retry-limit-exceeded': "L'envoi du fichier a échoué. Réessayez.",
  };

  return map[code] ?? fallback;
}

/** Best-effort extraction of a Firebase-style error code. */
function extractCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return undefined;
}

function extractTechnical(err: unknown): string {
  if (err instanceof Error) {
    const code = extractCode(err);
    return code ? `${code} — ${err.message}` : err.message;
  }
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

let counter = 0;

/**
 * Report an error from anywhere — React component, plain function, or a global
 * window handler.
 *
 * @param err       the caught value (Error, Firebase error, string, unknown)
 * @param fallback  visitor-facing message used when the code is unrecognised
 * @param source    short tag for grouping, e.g. 'auth' | 'route' | 'firestore'
 */
export function reportError(
  err: unknown,
  fallback: string,
  source = 'app',
  severity: ErrorSeverity = 'error',
): AppError {
  const technical = extractTechnical(err);
  const appError: AppError = {
    id: `${Date.now()}-${counter++}`,
    userMessage: toUserMessage(extractCode(err), fallback),
    technical,
    severity,
    source,
    at: Date.now(),
  };

  // Always keep the full detail in the console, regardless of what the UI
  // chooses to display.
  if (typeof console !== 'undefined') {
    console.error(`[${source}]`, technical, err);
  }

  listeners.forEach((fn) => {
    try {
      fn(appError);
    } catch {
      // A broken listener must never break the caller's error path.
    }
  });

  return appError;
}
