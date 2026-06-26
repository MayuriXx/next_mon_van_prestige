/**
 * app/admin/(dashboard)/contenus/page.tsx
 *
 * Admin — Content Management Page (Issue #25)
 *
 * Business purpose:
 *   Mohammed can edit the key textual content shown on the public site
 *   (service descriptions, subtitles, "À propos" blurb, contact info)
 *   without touching any code.
 *
 *   On the public site, the relevant components first check Firestore
 *   (`contenus` collection) for overrides and fall back to the static
 *   i18n strings in messages/*.json.  This page is the interface for
 *   writing those overrides.
 *
 * Firestore structure (contenus collection):
 *   One document per "section", keyed by section ID:
 *
 *   contenus/hero
 *     tagline:  { fr, en, nl }   — hero tagline below logo
 *
 *   contenus/about
 *     title:    { fr, en, nl }
 *     text:     { fr, en, nl }   — main À-propos paragraph
 *
 *   contenus/transfertAeroport
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/transfertSimple
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/miseADisposition
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/evenementsSpeciaux
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/escapadesLoisirs
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/deplPro
 *     title:    { fr, en, nl }
 *     subtitle: { fr, en, nl }
 *
 *   contenus/contact
 *     phone:   string           — phone number (no i18n needed)
 *     email:   string
 *     address: string
 *
 * Note: The public site reads these as OVERRIDES. Empty/missing fields
 * fall through to the static i18n strings, so Mohammed can leave fields
 * blank to keep the default translations.
 *
 * Architecture:
 *   - Client component; loads all section documents on mount
 *   - Tab per section; per-section save button (writes only that doc)
 *   - Language switcher for multilingual fields
 *   - No real-time subscription needed (low-frequency writes)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type Locale = 'fr' | 'en' | 'nl';

interface I18nField {
  fr: string;
  en: string;
  nl: string;
}

function emptyI18n(): I18nField { return { fr: '', en: '', nl: '' }; }

// Section definitions
interface SectionDef {
  id:     string;
  label:  string;
  icon:   string;
  fields: { key: string; label: string; multiline: boolean; i18n: boolean }[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'hero', label: 'Page d\'accueil — Hero', icon: '🏠',
    fields: [
      { key: 'tagline', label: 'Accroche principale', multiline: false, i18n: true },
    ],
  },
  {
    id: 'about', label: 'À Propos', icon: '👤',
    fields: [
      { key: 'title',  label: 'Titre section',  multiline: false, i18n: true },
      { key: 'text',   label: 'Texte À Propos', multiline: true,  i18n: true },
    ],
  },
  {
    id: 'transfertAeroport', label: 'Transfert Aéroport', icon: '✈️',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'transfertSimple', label: 'Transfert Simple', icon: '🚗',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'miseADisposition', label: 'Mise à Disposition', icon: '⏱️',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'evenementsSpeciaux', label: 'Événements Spéciaux', icon: '🎉',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'escapadesLoisirs', label: 'Escapades Loisirs', icon: '🎡',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'deplPro', label: 'Déplacements Professionnels', icon: '💼',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    id: 'contact', label: 'Contact', icon: '📞',
    fields: [
      { key: 'phone',   label: 'Téléphone',  multiline: false, i18n: false },
      { key: 'email',   label: 'Email',      multiline: false, i18n: false },
      { key: 'address', label: 'Adresse',    multiline: false, i18n: false },
    ],
  },
];

type SectionData = Record<string, I18nField | string>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminContenusPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [locale,        setLocale]        = useState<Locale>('fr');
  const [data,          setData]          = useState<Record<string, SectionData>>({});
  const [loadingIds,    setLoadingIds]    = useState<Set<string>>(new Set(SECTIONS.map((s) => s.id)));
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Load all sections ──────────────────────────────────────────────────────

  const loadSection = useCallback(async (sectionId: string) => {
    try {
      const snap = await getDoc(doc(db, 'contenus', sectionId));
      const raw  = snap.exists() ? (snap.data() as SectionData) : {};
      setData((prev) => ({ ...prev, [sectionId]: raw }));
    } catch (e) {
      console.error('[contenus] load error:', sectionId, e);
      setData((prev) => ({ ...prev, [sectionId]: {} }));
    } finally {
      setLoadingIds((prev) => { const s = new Set(prev); s.delete(sectionId); return s; });
    }
  }, []);

  useEffect(() => {
    SECTIONS.forEach((s) => loadSection(s.id));
  }, [loadSection]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function getFieldValue(sectionId: string, fieldKey: string, i18n: boolean): string {
    const sectionData = data[sectionId] || {};
    if (i18n) {
      const field = (sectionData[fieldKey] as I18nField | undefined) || emptyI18n();
      return field[locale] || '';
    }
    return (sectionData[fieldKey] as string | undefined) || '';
  }

  function setFieldValue(sectionId: string, fieldKey: string, i18n: boolean, value: string) {
    setData((prev) => {
      const sectionData = { ...(prev[sectionId] || {}) };
      if (i18n) {
        const existing = (sectionData[fieldKey] as I18nField | undefined) || emptyI18n();
        sectionData[fieldKey] = { ...existing, [locale]: value };
      } else {
        sectionData[fieldKey] = value;
      }
      return { ...prev, [sectionId]: sectionData };
    });
  }

  // ── Save current section ──────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'contenus', activeSection),
        { ...(data[activeSection] || {}), updatedAt: serverTimestamp() },
      );
      showToast('✓ Section sauvegardée');
    } catch (e) {
      showToast('Erreur : ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentSection = SECTIONS.find((s) => s.id === activeSection)!;
  const isLoadingSection = loadingIds.has(activeSection);

  const LOCALES: { id: Locale; label: string; flag: string }[] = [
    { id: 'fr', label: 'Français',    flag: '🇫🇷' },
    { id: 'en', label: 'English',     flag: '🇬🇧' },
    { id: 'nl', label: 'Nederlands',  flag: '🇳🇱' },
  ];

  return (
    <div style={s.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={s.header}>
        <h1 style={s.title}>✏️ Gestion des contenus textes</h1>
        <p style={s.subtitle}>
          Modifiez les titres et descriptions visibles sur le site public.
          Laissez un champ vide pour utiliser le texte par défaut.
          La version française (FR) est prioritaire.
        </p>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={toast.ok ? s.toastOk : s.toastErr}>{toast.msg}</div>
      )}

      <div style={s.layout}>

        {/* ── Section sidebar ──────────────────────────────────────── */}
        <nav style={s.sectionNav}>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                ...s.sectionBtn,
                ...(activeSection === sec.id ? s.sectionBtnActive : {}),
              }}
            >
              <span>{sec.icon}</span>
              <span style={s.sectionBtnLabel}>{sec.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Section content ──────────────────────────────────────── */}
        <div style={s.content}>

          {/* Language tabs */}
          <div style={s.localeTabs}>
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLocale(l.id)}
                style={{ ...s.localeTab, ...(locale === l.id ? s.localeTabActive : {}) }}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>

          {isLoadingSection ? (
            <div style={s.centered}><div style={s.spinner} /></div>
          ) : (
            <div style={s.sectionCard}>
              <div style={s.sectionCardHeader}>
                <h2 style={s.sectionCardTitle}>
                  {currentSection.icon} {currentSection.label}
                </h2>
                <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
                  {saving ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
              </div>

              <div style={s.fields}>
                {currentSection.fields.map((field) => (
                  <div key={field.key} style={s.fieldGroup}>
                    <label style={s.label}>
                      {field.label}
                      {field.i18n && (
                        <span style={s.localeBadge}>{locale.toUpperCase()}</span>
                      )}
                    </label>
                    <p style={s.fieldHint}>
                      {field.i18n
                        ? `Texte ${locale === 'fr' ? 'en français' : locale === 'en' ? 'en anglais' : 'en néerlandais'}. Laissez vide pour utiliser la traduction par défaut.`
                        : 'Valeur commune à toutes les langues.'}
                    </p>
                    {field.multiline ? (
                      <textarea
                        rows={4}
                        value={getFieldValue(activeSection, field.key, field.i18n)}
                        onChange={(e) => setFieldValue(activeSection, field.key, field.i18n, e.target.value)}
                        style={s.textarea}
                        placeholder="Laisser vide = texte par défaut"
                      />
                    ) : (
                      <input
                        type="text"
                        value={getFieldValue(activeSection, field.key, field.i18n)}
                        onChange={(e) => setFieldValue(activeSection, field.key, field.i18n, e.target.value)}
                        style={s.input}
                        placeholder="Laisser vide = texte par défaut"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page       : { display: 'flex', flexDirection: 'column', gap: '24px' },
  header     : {},
  title      : { margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' },
  subtitle   : { margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '600px' },
  centered   : { display: 'flex', justifyContent: 'center', padding: '60px' },
  spinner    : {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C',
    animation: 'spin 0.8s linear infinite',
  },
  toastOk    : {
    padding: '12px 16px', background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
    color: '#22C55E', fontSize: '13px',
  },
  toastErr   : {
    padding: '12px 16px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    color: '#EF4444', fontSize: '13px',
  },
  layout     : { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  sectionNav : {
    width: '220px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '2px',
    background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '8px',
    position: 'sticky', top: '24px',
  },
  sectionBtn : {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px',
    fontWeight: 500, textAlign: 'left',
  },
  sectionBtnActive: {
    background: 'rgba(201,168,76,0.12)', color: '#C9A84C',
  },
  sectionBtnLabel : { flex: 1, lineHeight: '1.3' },
  content    : { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  localeTabs : { display: 'flex', gap: '6px' },
  localeTab  : {
    padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)', fontSize: '13px',
  },
  localeTabActive : {
    background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C',
  },
  sectionCard : {
    background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden',
  },
  sectionCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '12px',
  },
  sectionCardTitle : { margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' },
  saveBtn    : {
    padding: '9px 20px', background: '#C9A84C', border: 'none', borderRadius: '8px',
    color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  fields     : { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  fieldGroup : { display: 'flex', flexDirection: 'column', gap: '6px' },
  label      : {
    fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  localeBadge: {
    fontSize: '10px', fontWeight: 700, color: '#C9A84C',
    background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '4px', padding: '1px 6px',
  },
  fieldHint  : { margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.25)' },
  input      : {
    padding: '10px 12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
  },
  textarea   : {
    padding: '10px 12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6',
  },
};
