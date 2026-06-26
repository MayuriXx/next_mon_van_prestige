/**
 * app/admin/layout.tsx
 *
 * Root layout for the entire /admin section.
 * - Injects AuthProvider so all child pages share the same auth state.
 * - Does NOT include the public Navbar/Footer/FloatingButtons.
 * - Does NOT use next-intl (admin UI is French-only, no i18n needed).
 * - Imports global CSS tokens (gold, dark background, fonts) from globals.css.
 *
 * Route protection is handled client-side by `useAdminAuth` inside each page
 * or sub-layout, because Next.js middleware is incompatible with static export.
 */
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/firebase/auth-context';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Admin — MS Prestige Driver',
  robots: 'noindex, nofollow',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
