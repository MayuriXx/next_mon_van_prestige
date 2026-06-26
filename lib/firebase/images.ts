/**
 * lib/firebase/images.ts
 *
 * Firebase helpers for image management (Issue #23).
 *
 * Business purpose:
 *   MS Prestige Driver images are stored in two layers:
 *   1. Firebase Storage  — the actual image files (JPEG/WebP)
 *   2. Firestore         — metadata (url, alt, position) per image slot
 *
 *   Three Firestore collections are used:
 *   - images/{slot}          → hero slot, keyed by slot name (e.g. "hero")
 *   - vehicle_images/{id}    → one doc per vehicle (business, van)
 *   - section_images/{id}    → one doc per service section
 *
 *   Static fallback data from lib/data/images.ts is used when Firestore
 *   is unavailable (e.g. during local development without credentials).
 *
 * Upload flow:
 *   1. Admin selects a file → compressed to WebP client-side (canvas)
 *   2. uploadImage() uploads to Firebase Storage at a deterministic path
 *   3. updateImageDoc() writes the public download URL + alt to Firestore
 *   4. The public site reads from Firestore on next load (useTariffs pattern)
 *
 * Storage paths:
 *   images/hero.webp
 *   images/vehicles/{id}.webp
 *   images/sections/{id}.webp
 */

import { db, storage } from '@/lib/firebase/client';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { imagesData } from '@/lib/data/images';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImageData {
  url: string;
  alt: string;
  position?: number;
}

export interface VehicleImage extends ImageData {
  name: string;
}

export type ImageSlot =
  | { type: 'hero'; slot: 'hero' }
  | { type: 'vehicle'; slot: string }
  | { type: 'section'; slot: string };

// ── Read helpers ─────────────────────────────────────────────────────────────

/** Fetch hero image metadata from Firestore, fallback to static data. */
export async function getHeroImage(): Promise<ImageData | null> {
  try {
    const snap = await getDoc(doc(db, 'images', 'hero'));
    if (snap.exists()) return snap.data() as ImageData;
  } catch {
    console.log('Firestore unavailable for hero image, using local data');
  }
  return imagesData.hero;
}

/** Fetch vehicle image list from Firestore, fallback to static data. */
export async function getVehicleImages(): Promise<VehicleImage[]> {
  try {
    const snap = await getDocs(query(collection(db, 'vehicle_images')));
    if (snap.docs.length > 0) {
      return snap.docs
        .map((d) => ({ name: d.id, ...d.data() } as VehicleImage))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
  } catch {
    console.log('Firestore unavailable for vehicle images, using local data');
  }
  return Object.entries(imagesData.vehicles).map(([id, data]) => ({
    name: id,
    ...data,
  }));
}

/** Fetch a single section image from Firestore, fallback to static data. */
export async function getSectionImages(section: string): Promise<ImageData | null> {
  try {
    const snap = await getDoc(doc(db, 'section_images', section));
    if (snap.exists()) return snap.data() as ImageData;
  } catch {
    console.log(`Firestore unavailable for ${section} image, using local data`);
  }
  return (imagesData.sections as Record<string, ImageData | undefined>)[section] ?? null;
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/**
 * Upload an image file to Firebase Storage and return its public download URL.
 *
 * @param file     The File object (should already be WebP-compressed)
 * @param storagePath  e.g. "images/hero.webp" or "images/vehicles/business.webp"
 */
export async function uploadImage(file: File, storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/**
 * Write image metadata (url, alt, position) to the correct Firestore document.
 *
 * Collection mapping:
 *   hero     → images/hero
 *   vehicle  → vehicle_images/{slot}
 *   section  → section_images/{slot}
 */
export async function updateImageDoc(
  slot: ImageSlot,
  data: Partial<ImageData>
): Promise<void> {
  let ref;
  if (slot.type === 'hero') {
    ref = doc(db, 'images', 'hero');
  } else if (slot.type === 'vehicle') {
    ref = doc(db, 'vehicle_images', slot.slot);
  } else {
    ref = doc(db, 'section_images', slot.slot);
  }
  await setDoc(ref, data, { merge: true });
}

/**
 * Delete an image from Firebase Storage.
 * Used when replacing an image to clean up the old file.
 */
export async function deleteStorageImage(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // Ignore — old file may not exist in Storage (e.g. placeholder URL)
  }
}

/**
 * Remove image metadata document from Firestore and optionally delete from Storage.
 */
export async function removeImageDoc(slot: ImageSlot): Promise<void> {
  let docRef;
  if (slot.type === 'hero') {
    docRef = doc(db, 'images', 'hero');
  } else if (slot.type === 'vehicle') {
    docRef = doc(db, 'vehicle_images', slot.slot);
  } else {
    docRef = doc(db, 'section_images', slot.slot);
  }
  await deleteDoc(docRef);
}
