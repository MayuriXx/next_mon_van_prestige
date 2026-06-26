/**
 * lib/hooks/useAdminAuth.ts
 *
 * Guard hook for admin pages.
 *
 * Usage: call at the top of any admin page/layout component.
 * - While Firebase resolves the session → shows a loading spinner (handled by caller).
 * - If no authenticated user → redirects to /admin/login.
 * - Returns { user, loading } for the caller to conditionally render content.
 *
 * Note: middleware is NOT used because `output: 'export'` (static site on
 * Firebase Hosting) makes Next.js middleware incompatible. All auth gating is
 * therefore done client-side via this hook.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';

export function useAdminAuth() {
  const { user, loading } = useAuth();
  const router            = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}
