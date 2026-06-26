/**
 * lib/hooks/useImages.ts
 *
 * React hook that loads all image metadata from Firestore in a single pass
 * for use in the admin image management panel (Issue #23).
 *
 * Business context:
 *   The admin needs to see, at a glance, all image slots used on the public
 *   site (hero, vehicle cards, service section banners) and their current
 *   URL / alt text. This hook aggregates the three Firestore collections
 *   (images, vehicle_images, section_images) into a single flat list of
 *   ImageSlotState objects.
 *
 * Fallback:
 *   If Firestore is unreachable (network issue, cold start), the hook falls
 *   back to static data from lib/data/images.ts — the same pattern used by
 *   useTariffs.ts.
 */

'use client';

import { useState, useEffect } from 'react';
import { getHeroImage, getVehicleImages, getSectionImages } from '@/lib/firebase/images';
import { imagesData } from '@/lib/data/images';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImageSlotState {
  /** Unique identifier for the slot (used as Firestore doc ID) */
  id: string;
  /** Human-readable label for the admin UI */
  label: string;
  /** 'hero' | 'vehicle' | 'section' */
  type: 'hero' | 'vehicle' | 'section';
  /** Current public URL (from Firestore or static fallback) */
  url: string;
  /** Alt text */
  alt: string;
  /** Firebase Storage path where the file is stored */
  storagePath: string;
}

export interface UseImagesReturn {
  slots: ImageSlotState[];
  loading: boolean;
  reload: () => void;
}

// ── Slot definitions ──────────────────────────────────────────────────────────

/** Section slots: one per service page */
const SECTION_SLOTS: Array<{ id: string; label: string }> = [
  { id: 'transfert-aeroport',         label: 'Transfert Aéroport' },
  { id: 'transfert-simple',           label: 'Transfert Simple' },
  { id: 'mise-a-disposition',         label: 'Mise à Disposition' },
  { id: 'evenements-speciaux',        label: 'Événements Spéciaux' },
  { id: 'escapades-loisirs',          label: 'Escapades & Loisirs' },
  { id: 'deplacements-professionnels',label: 'Déplacements Professionnels' },
];

/** Vehicle slots */
const VEHICLE_SLOTS: Array<{ id: string; label: string }> = [
  { id: 'business', label: 'Berline Business' },
  { id: 'van',      label: 'Van Premium' },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useImages(): UseImagesReturn {
  const [slots,   setSlots]   = useState<ImageSlotState[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result: ImageSlotState[] = [];

      // ── Hero ────────────────────────────────────────────────────────────
      const hero = await getHeroImage();
      result.push({
        id          : 'hero',
        label       : 'Image Hero (page d\u2019accueil)',
        type        : 'hero',
        url         : hero?.url ?? imagesData.hero.url,
        alt         : hero?.alt ?? imagesData.hero.alt,
        storagePath : 'images/hero.webp',
      });

      // ── Vehicles ────────────────────────────────────────────────────────
      const vehicles = await getVehicleImages();
      for (const vSlot of VEHICLE_SLOTS) {
        const found = vehicles.find((v) => v.name === vSlot.id);
        const fb    = imagesData.vehicles[vSlot.id as keyof typeof imagesData.vehicles];
        result.push({
          id          : vSlot.id,
          label       : vSlot.label,
          type        : 'vehicle',
          url         : found?.url ?? fb?.url ?? '',
          alt         : found?.alt ?? fb?.alt ?? '',
          storagePath : `images/vehicles/${vSlot.id}.webp`,
        });
      }

      // ── Sections ────────────────────────────────────────────────────────
      for (const sSlot of SECTION_SLOTS) {
        const img = await getSectionImages(sSlot.id);
        const fb  = (imagesData.sections as Record<string, { url: string; alt: string }>)[sSlot.id];
        result.push({
          id          : sSlot.id,
          label       : sSlot.label,
          type        : 'section',
          url         : img?.url ?? fb?.url ?? '',
          alt         : img?.alt ?? fb?.alt ?? '',
          storagePath : `images/sections/${sSlot.id}.webp`,
        });
      }

      if (!cancelled) {
        setSlots(result);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  return { slots, loading, reload: () => setTick((n) => n + 1) };
}
