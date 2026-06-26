/**
 * lib/hooks/useReservations.ts
 *
 * Admin-only Firestore hook for the reservations collection.
 *
 * Business context:
 *  - Reservations are created by the public booking flow (Stripe Checkout).
 *  - Only admin users can read, update or delete reservations (Firestore rules).
 *  - Status lifecycle: pending_payment → confirmed → completed | cancelled
 *
 * Features:
 *  - Real-time listener via onSnapshot (changes appear without refresh)
 *  - Client-side filtering by status, serviceType, and date range
 *  - KPI computation: today count, month count, month revenue
 *  - updateStatus() helper to patch a single document
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ReservationDoc, ReservationStatus } from '@/lib/types/reservation';

// ── Extended type with Firestore document id ──────────────────────────────────

export interface ReservationRow extends ReservationDoc {
  id: string;
}

// ── Filter shape ──────────────────────────────────────────────────────────────

export interface ReservationFilters {
  status     : ReservationStatus | 'all';
  serviceType: string;            // '' = all
  dateFrom   : string;            // ISO date YYYY-MM-DD or ''
  dateTo     : string;            // ISO date YYYY-MM-DD or ''
  search     : string;            // free-text on client name/email
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export interface ReservationKPIs {
  todayCount : number;
  monthCount : number;
  monthRevenue: number;   // sum of totalPrice for confirmed/completed this month
}

// ── Helper: Firestore Timestamp or string → JS Date ──────────────────────────

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // Firestore-like object with seconds
  if (typeof value === 'object' && 'seconds' in (value as object)) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useReservations(filters: ReservationFilters) {
  const [all, setAll]         = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Subscribe to the full reservations collection, ordered by createdAt desc.
  // Filtering is done client-side to avoid composite Firestore indexes.
  useEffect(() => {
    const q = query(
      collection(db, 'reservations'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ReservationRow[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as ReservationDoc),
        }));
        setAll(rows);
        setLoading(false);
      },
      (err) => {
        console.error('[useReservations]', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  // ── Client-side filtering ─────────────────────────────────────────────────

  const filtered = all.filter((r) => {
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.serviceType && r.serviceType !== filters.serviceType) return false;

    const created = toDate(r.createdAt);
    if (filters.dateFrom && created) {
      if (created < new Date(filters.dateFrom + 'T00:00:00')) return false;
    }
    if (filters.dateTo && created) {
      if (created > new Date(filters.dateTo + 'T23:59:59')) return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name  = r.client?.name?.toLowerCase()  ?? '';
      const email = r.client?.email?.toLowerCase() ?? '';
      if (!name.includes(q) && !email.includes(q)) return false;
    }

    return true;
  });

  // ── KPI computation (over the full unfiltered set) ────────────────────────

  const kpis: ReservationKPIs = (() => {
    const now       = new Date();
    const todayStr  = now.toISOString().slice(0, 10);
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth();

    let todayCount  = 0;
    let monthCount  = 0;
    let monthRevenue = 0;

    for (const r of all) {
      const d = toDate(r.createdAt);
      if (!d) continue;

      if (d.toISOString().slice(0, 10) === todayStr) todayCount++;

      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        monthCount++;
        if (r.status === 'confirmed' || r.status === 'completed') {
          monthRevenue += r.totalPrice ?? 0;
        }
      }
    }

    return { todayCount, monthCount, monthRevenue };
  })();

  // ── Mutators ──────────────────────────────────────────────────────────────

  const updateStatus = useCallback(async (id: string, status: ReservationStatus) => {
    await updateDoc(doc(db, 'reservations', id), { status });
  }, []);

  return { filtered, kpis, loading, error, updateStatus };
}
