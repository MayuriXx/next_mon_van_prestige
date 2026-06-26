/**
 * app/admin/(dashboard)/images/page.tsx
 *
 * Admin — Image Management Page (Issue #23)
 *
 * Business purpose:
 *   Mohammed can view, replace, and manage all images used across the public
 *   website from a single page. Three categories of images are handled:
 *   - Hero image (homepage banner)
 *   - Vehicle images (Business sedan and Van cards)
 *   - Service section images (one per service page)
 *
 * Upload flow:
 *   1. Mohammed selects a file via the file input (JPEG/PNG/WebP accepted).
 *   2. The image is compressed to WebP (max 1200×900, quality 85%) using the
 *      browser Canvas API — no server-side processing needed.
 *   3. A live preview is shown alongside the current image for comparison.
 *   4. On confirmation ("Valider"), the compressed WebP is uploaded to Firebase
 *      Storage, and the public download URL is written to Firestore.
 *   5. The public site picks up the new URL on next page load (Firestore read
 *      in getHeroImage / getVehicleImages / getSectionImages).
 *
 * Architecture notes:
 *   - Client component; uses useImages() to load current metadata from Firestore.
 *   - Image compression is handled entirely in the browser (no server required).
 *   - Firebase Storage CORS must allow the hosting domain. Firebase Storage
 *     rules: `allow write: if request.auth != null && isAdmin();`
 *   - The `output: 'export'` constraint is respected: no Next.js API routes used.
 *
 * Firestore documents updated:
 *   images/hero          → { url, alt }
 *   vehicle_images/{id}  → { url, alt, position }
 *   section_images/{id}  → { url, alt }
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useImages } from '@/lib/hooks/useImages';
import {
  uploadImage,
  updateImageDoc,
  deleteStorageImage,
} from '@/lib/firebase/images';
import type { ImageSlotState } from '@/lib/hooks/useImages';
import type { ImageSlot } from '@/lib/firebase/images';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingUpload {
  slotId: string;
  previewUrl: string;    // object URL for local preview
  compressedFile: File;  // WebP file ready to upload
  altText: string;
}

// ── Image compression ─────────────────────────────────────────────────────────

/**
 * Compress an image file to WebP using the browser Canvas API.
 * Max output: 1200×900px, quality 85%. Falls back to original if Canvas fails.
 */
async function compressToWebP(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_W = 1200;
      const MAX_H = 900;
      let { width, height } = img;

      if (width > MAX_W || height > MAX_H) {
        const ratio = Math.min(MAX_W / width, MAX_H / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
          });
          resolve(webpFile);
        },
        'image/webp',
        0.85,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function slotToImageSlot(s: ImageSlotState): ImageSlot {
  if (s.type === 'hero')    return { type: 'hero',    slot: 'hero' };
  if (s.type === 'vehicle') return { type: 'vehicle', slot: s.id };
  return { type: 'section', slot: s.id };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImagesPage() {
  const { slots, loading, reload } = useImages();

  const [activeTab,  setActiveTab]  = useState<'hero' | 'vehicle' | 'section'>('hero');
  const [pending,    setPending]    = useState<PendingUpload | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [toastOk,    setToastOk]    = useState<string | null>(null);
  const [toastErr,   setToastErr]   = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: ImageSlotState,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected after cancel
    if (fileInputRef.current) fileInputRef.current.value = '';

    const compressed   = await compressToWebP(file);
    const previewUrl   = URL.createObjectURL(compressed);

    setPending({
      slotId       : slot.id,
      previewUrl,
      compressedFile: compressed,
      altText      : slot.alt,
    });
  }, []);

  // ── Confirm upload ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async (slot: ImageSlotState) => {
    if (!pending || pending.slotId !== slot.id) return;
    setUploading(true);
    setToastErr(null);

    try {
      // 1. Delete old Storage file (best-effort)
      await deleteStorageImage(slot.storagePath);

      // 2. Upload new WebP
      const url = await uploadImage(pending.compressedFile, slot.storagePath);

      // 3. Write metadata to Firestore
      await updateImageDoc(slotToImageSlot(slot), {
        url,
        alt     : pending.altText,
        ...(slot.type === 'vehicle' ? { position: slots.findIndex((s) => s.id === slot.id) } : {}),
      });

      // 4. Cleanup local state
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
      setToastOk(`✓ Image "${slot.label}" mise à jour`);
      setTimeout(() => setToastOk(null), 3500);
      reload();
    } catch (err) {
      setToastErr('Erreur : ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }, [pending, slots, reload]);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  }, [pending]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const visibleSlots = slots.filter((s) => s.type === activeTab);

  const TABS: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'hero',    label: '🏠 Hero' },
    { id: 'vehicle', label: '🚗 Véhicules' },
    { id: 'section', label: '🖼️ Sections' },
  ];

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
      </div>
    );
  }

  return (
    <div style={s.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <h1 style={s.title}>🖼️ Gestion des images</h1>
        <p style={s.subtitle}>
          Uploadez et remplacez les images du site. Les fichiers sont compressés
          automatiquement en WebP avant l&apos;envoi. Une prévisualisation est affichée
          avant validation.
        </p>
      </div>

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      {toastOk  && <div style={s.toastOk}>{toastOk}</div>}
      {toastErr && <div style={s.toastErr}>{toastErr}</div>}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={s.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); handleCancel(); }}
            style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Grid of image slots ─────────────────────────────────────────── */}
      <div style={s.grid}>
        {visibleSlots.map((slot) => {
          const isPending = pending?.slotId === slot.id;
          return (
            <ImageCard
              key={slot.id}
              slot={slot}
              pending={isPending ? pending : null}
              uploading={uploading && isPending}
              onFileSelect={handleFileSelect}
              onConfirm={() => handleConfirm(slot)}
              onCancel={handleCancel}
              onAltChange={(alt) => {
                if (pending && pending.slotId === slot.id) {
                  setPending((p) => p ? { ...p, altText: alt } : p);
                }
              }}
              fileInputRef={isPending ? fileInputRef : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── ImageCard sub-component ───────────────────────────────────────────────────

function ImageCard({
  slot,
  pending,
  uploading,
  onFileSelect,
  onConfirm,
  onCancel,
  onAltChange,
  fileInputRef,
}: {
  slot: ImageSlotState;
  pending: PendingUpload | null;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, slot: ImageSlotState) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onAltChange: (alt: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = fileInputRef ?? localRef;

  return (
    <div style={c.card}>
      {/* Card header */}
      <div style={c.cardHeader}>
        <span style={c.cardLabel}>{slot.label}</span>
        <span style={c.cardType}>{slot.type}</span>
      </div>

      {/* Image preview area */}
      <div style={c.previewArea}>
        {/* Current image */}
        <div style={c.previewBlock}>
          <div style={c.previewLabel}>Actuelle</div>
          <div style={c.imgWrap}>
            {slot.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={slot.url} alt={slot.alt} style={c.img} />
            ) : (
              <div style={c.placeholder}>Aucune image</div>
            )}
          </div>
          <div style={c.altText} title={slot.alt}>{slot.alt || '—'}</div>
        </div>

        {/* Arrow + new preview (shown when pending) */}
        {pending && (
          <>
            <div style={c.arrow}>→</div>
            <div style={c.previewBlock}>
              <div style={{ ...c.previewLabel, color: '#C9A84C' }}>Nouvelle</div>
              <div style={c.imgWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.previewUrl} alt="Prévisualisation" style={c.img} />
              </div>
              {/* Editable alt text */}
              <input
                type="text"
                value={pending.altText}
                onChange={(e) => onAltChange(e.target.value)}
                placeholder="Texte alternatif (SEO)"
                style={c.altInput}
              />
            </div>
          </>
        )}
      </div>

      {/* Storage path hint */}
      <div style={c.storagePath}>
        📦 Storage : <code style={c.code}>{slot.storagePath}</code>
      </div>

      {/* Actions */}
      <div style={c.actions}>
        {!pending ? (
          <>
            <input
              ref={ref as React.RefObject<HTMLInputElement>}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => onFileSelect(e, slot)}
            />
            <button
              onClick={() => (ref as React.RefObject<HTMLInputElement>).current?.click()}
              style={c.btnUpload}
            >
              📤 Choisir une image
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onConfirm}
              disabled={uploading}
              style={c.btnConfirm}
            >
              {uploading ? 'Envoi en cours…' : '✓ Valider'}
            </button>
            <button
              onClick={onCancel}
              disabled={uploading}
              style={c.btnCancel}
            >
              ✕ Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page     : { display: 'flex', flexDirection: 'column', gap: '24px' },
  header   : { marginBottom: '4px' },
  title    : { margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' },
  subtitle : { margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '600px' },
  centered : { display: 'flex', justifyContent: 'center', padding: '80px' },
  spinner  : {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C',
    animation: 'spin 0.8s linear infinite',
  },
  toastOk  : {
    padding: '12px 16px', background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
    color: '#22C55E', fontSize: '13px',
  },
  toastErr : {
    padding: '12px 16px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    color: '#EF4444', fontSize: '13px',
  },
  tabs     : { display: 'flex', gap: '6px' },
  tab      : {
    padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500,
    transition: 'all .15s',
  },
  tabActive: {
    background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
    color: '#C9A84C',
  },
  grid     : {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
};

const c: Record<string, React.CSSProperties> = {
  card        : {
    background: '#111', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', overflow: 'hidden', display: 'flex',
    flexDirection: 'column', gap: '0',
  },
  cardHeader  : {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  cardLabel   : { fontSize: '14px', fontWeight: 600, color: '#fff' },
  cardType    : {
    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '20px',
  },
  previewArea : {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '16px', background: '#0d0d0d',
  },
  previewBlock: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 },
  previewLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.06em' },
  imgWrap     : {
    width: '100%', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  img         : { width: '100%', height: '100%', objectFit: 'cover' as const },
  placeholder : { color: 'rgba(255,255,255,0.2)', fontSize: '12px' },
  altText     : {
    fontSize: '11px', color: 'rgba(255,255,255,0.3)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  altInput    : {
    width: '100%', padding: '5px 8px', background: '#0a0a0a',
    border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px',
    color: '#fff', fontSize: '11px', boxSizing: 'border-box' as const,
  },
  arrow       : { color: 'rgba(255,255,255,0.25)', fontSize: '20px', paddingTop: '28px', flexShrink: 0 },
  storagePath : {
    padding: '8px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.25)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  code        : { fontFamily: 'monospace', color: 'rgba(201,168,76,0.6)', fontSize: '11px' },
  actions     : {
    display: 'flex', gap: '8px', padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  btnUpload   : {
    flex: 1, padding: '9px 14px', background: 'transparent',
    border: '1px dashed rgba(201,168,76,0.4)', borderRadius: '8px',
    color: '#C9A84C', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
    transition: 'all .15s',
  },
  btnConfirm  : {
    flex: 1, padding: '9px 14px', background: '#C9A84C',
    border: 'none', borderRadius: '8px',
    color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  },
  btnCancel   : {
    padding: '9px 14px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px',
  },
};
