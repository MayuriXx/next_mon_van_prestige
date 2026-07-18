/**
 * app/admin/login/page.tsx
 *
 * Public admin login page — the only /admin route accessible without auth.
 *
 * Business logic:
 * - Authenticates via Firebase Auth email/password (signInWithEmailAndPassword).
 * - On success → redirects to /admin (dashboard).
 * - If user is already logged in → redirects immediately to /admin.
 * - Displays a clear error message on wrong credentials.
 *
 * Design: matches the MS Prestige Driver dark/gold design system.
 */
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { reportError } from '@/lib/errors/errorBus';
import { useAuth } from '@/lib/firebase/auth-context';
import Image from 'next/image';

export default function AdminLoginPage() {
  const { user, loading } = useAuth();
  const router            = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [pending,  setPending]  = useState(false);

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      router.replace('/admin');
    } catch (err) {
      // Previously this was a bare `catch {}` that always blamed the
      // credentials. That hid a genuine configuration failure (an expired
      // Firebase API key) behind "mot de passe incorrect" and cost real
      // debugging time. Surface what actually happened.
      const reported = reportError(err, 'Email ou mot de passe incorrect.', 'auth');
      setError(reported.userMessage);
    } finally {
      setPending(false);
    }
  }

  if (loading) return null; // avoids flash before redirect

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / branding */}
        <div style={styles.header}>
          <div style={styles.logoWrapper}>
            <Image
              src="/images/ms_prestige_driver_logo_splash.png"
              alt="MS Prestige Driver"
              width={80}
              height={80}
              style={{ objectFit: 'contain', borderRadius: '12px' }}
              priority
            />
          </div>
          <h1 style={styles.title}>MS Prestige Driver</h1>
          <p style={styles.subtitle}>Espace administration</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            style={{ ...styles.btn, opacity: pending ? 0.7 : 1 }}
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight       : '100vh',
    display         : 'flex',
    alignItems      : 'center',
    justifyContent  : 'center',
    background      : '#0a0a0a',
    padding         : '24px',
  },
  card: {
    width           : '100%',
    maxWidth        : '420px',
    background      : '#1a1a1a',
    borderRadius    : '16px',
    padding         : '40px 36px',
    border          : '1px solid rgba(var(--color-gold-rgb), 0.2)',
    boxShadow       : '0 24px 64px rgba(0,0,0,0.6)',
  },
  header: {
    textAlign       : 'center',
    marginBottom    : '32px',
  },
  logoWrapper: {
    display         : 'flex',
    alignItems      : 'center',
    justifyContent  : 'center',
    marginBottom    : '16px',
  },
  title: {
    margin          : 0,
    fontSize        : '20px',
    fontWeight      : 700,
    color           : '#fff',
  },
  subtitle: {
    margin          : '4px 0 0',
    fontSize        : '13px',
    color           : 'rgba(255,255,255,0.45)',
  },
  form: {
    display         : 'flex',
    flexDirection   : 'column',
    gap             : '20px',
  },
  field: {
    display         : 'flex',
    flexDirection   : 'column',
    gap             : '6px',
  },
  label: {
    fontSize        : '13px',
    color           : 'rgba(255,255,255,0.6)',
    fontWeight      : 500,
    letterSpacing   : '.04em',
    textTransform   : 'uppercase',
  },
  input: {
    background      : '#0a0a0a',
    border          : '1px solid rgba(255,255,255,0.12)',
    borderRadius    : '8px',
    padding         : '12px 14px',
    color           : '#fff',
    fontSize        : '15px',
    outline         : 'none',
    transition      : 'border-color .2s',
  },
  error: {
    margin          : 0,
    padding         : '10px 14px',
    background      : 'rgba(220,38,38,0.12)',
    border          : '1px solid rgba(220,38,38,0.3)',
    borderRadius    : '8px',
    color           : '#f87171',
    fontSize        : '13px',
  },
  btn: {
    background      : 'var(--color-gold)',
    color           : '#0a0a0a',
    border          : 'none',
    borderRadius    : '8px',
    padding         : '13px',
    fontSize        : '15px',
    fontWeight      : 700,
    cursor          : 'pointer',
    letterSpacing   : '.04em',
    transition      : 'opacity .2s, transform .1s',
  },
};
