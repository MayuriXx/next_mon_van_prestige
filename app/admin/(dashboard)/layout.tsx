/**
 * app/admin/(dashboard)/layout.tsx
 *
 * Shared layout for all authenticated admin pages (everything except /login).
 *
 * Responsibilities:
 * - Guards access: redirects unauthenticated users to /admin/login via
 *   `useAdminAuth`. Shows a full-screen spinner while Firebase resolves the
 *   session (avoids content flash).
 * - Renders the persistent sidebar navigation with links to each admin section.
 * - Provides a top bar with the current user's email and a logout button.
 *
 * Sidebar sections (matching M4 issues):
 *   - Réservations  (#24)
 *   - Tarifs        (#22)
 *   - Images        (#23)
 *   - FAQ & Textes  (#25)
 */
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

const NAV_ITEMS = [
  { href: '/admin/reservations', label: 'Réservations', icon: '📋' },
  { href: '/admin/tarifs',       label: 'Tarifs',       icon: '💶' },
  { href: '/admin/images',       label: 'Images',       icon: '🖼️' },
  { href: '/admin/faq',          label: 'FAQ & Textes', icon: '📝' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const router            = useRouter();
  const pathname          = usePathname();

  async function handleLogout() {
    await signOut(auth);
    router.replace('/admin/login');
  }

  // Loading state: Firebase resolving session
  if (loading) {
    return (
      <div style={styles.loader}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Not authenticated: useAdminAuth will redirect, render nothing meanwhile
  if (!user) return null;

  return (
    <div style={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        {/* Branding */}
        <div style={styles.brand}>
          <div style={styles.brandLogo}>MVP</div>
          <div>
            <div style={styles.brandTitle}>MS Prestige</div>
            <div style={styles.brandSub}>Administration</div>
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Nav links */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <a
                key={href}
                href={href}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                }}
              >
                <span style={styles.navIcon}>{icon}</span>
                <span>{label}</span>
              </a>
            );
          })}
        </nav>

        {/* Spacer + logout */}
        <div style={{ flex: 1 }} />
        <div style={styles.sidebarFooter}>
          <div style={styles.userEmail}>{user.email}</div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  loader: {
    minHeight      : '100vh',
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'center',
    background     : '#0a0a0a',
  },
  spinner: {
    width          : '36px',
    height         : '36px',
    borderRadius   : '50%',
    border         : '3px solid rgba(201,168,76,0.2)',
    borderTopColor : '#C9A84C',
    animation      : 'spin 0.8s linear infinite',
  },
  shell: {
    display        : 'flex',
    minHeight      : '100vh',
    background     : '#0a0a0a',
  },
  sidebar: {
    width          : '240px',
    minWidth       : '240px',
    background     : '#111',
    borderRight    : '1px solid rgba(201,168,76,0.15)',
    display        : 'flex',
    flexDirection  : 'column',
    padding        : '24px 0',
    position       : 'sticky' as const,
    top            : 0,
    height         : '100vh',
  },
  brand: {
    display        : 'flex',
    alignItems     : 'center',
    gap            : '12px',
    padding        : '0 20px 0',
  },
  brandLogo: {
    width          : '40px',
    height         : '40px',
    borderRadius   : '8px',
    background     : '#C9A84C',
    color          : '#0a0a0a',
    fontWeight     : 700,
    fontSize       : '13px',
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'center',
    flexShrink     : 0,
  },
  brandTitle: {
    color          : '#fff',
    fontWeight     : 700,
    fontSize       : '14px',
    lineHeight     : '1.2',
  },
  brandSub: {
    color          : 'rgba(255,255,255,0.4)',
    fontSize       : '11px',
    textTransform  : 'uppercase' as const,
    letterSpacing  : '.08em',
  },
  divider: {
    height         : '1px',
    background     : 'rgba(201,168,76,0.15)',
    margin         : '20px 0',
  },
  nav: {
    display        : 'flex',
    flexDirection  : 'column',
    gap            : '2px',
    padding        : '0 12px',
  },
  navItem: {
    display        : 'flex',
    alignItems     : 'center',
    gap            : '10px',
    padding        : '10px 12px',
    borderRadius   : '8px',
    color          : 'rgba(255,255,255,0.55)',
    textDecoration : 'none',
    fontSize       : '14px',
    fontWeight     : 500,
    transition     : 'background .15s, color .15s',
    cursor         : 'pointer',
  },
  navItemActive: {
    background     : 'rgba(201,168,76,0.12)',
    color          : '#C9A84C',
  },
  navIcon: {
    fontSize       : '16px',
    width          : '20px',
    textAlign      : 'center' as const,
  },
  sidebarFooter: {
    padding        : '16px 20px 0',
    borderTop      : '1px solid rgba(255,255,255,0.08)',
    marginTop      : '16px',
  },
  userEmail: {
    fontSize       : '11px',
    color          : 'rgba(255,255,255,0.35)',
    marginBottom   : '10px',
    wordBreak      : 'break-all' as const,
  },
  logoutBtn: {
    width          : '100%',
    padding        : '9px',
    background     : 'transparent',
    border         : '1px solid rgba(255,255,255,0.12)',
    borderRadius   : '8px',
    color          : 'rgba(255,255,255,0.55)',
    fontSize       : '13px',
    cursor         : 'pointer',
    transition     : 'border-color .15s, color .15s',
  },
  main: {
    flex           : 1,
    overflow       : 'auto',
    padding        : '40px',
    background     : '#0a0a0a',
  },
};
