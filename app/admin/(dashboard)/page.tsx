/**
 * app/admin/(dashboard)/page.tsx
 *
 * Admin home — immediately redirects to /admin/reservations (the main
 * dashboard view). This avoids having a blank index page at /admin.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/reservations');
  }, [router]);

  return null;
}
