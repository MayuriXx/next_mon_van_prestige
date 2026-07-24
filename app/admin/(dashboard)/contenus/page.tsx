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
 *     title:          { fr, en, nl }
 *     text:           { fr, en, nl }   — main À-propos paragraph
 *     values_title:   { fr, en, nl }   — Values card title   (issue #104)
 *     values_text:    { fr, en, nl }   — Values card text    (issue #104)
 *     mission_title:  { fr, en, nl }   — Mission card title  (issue #104)
 *     mission_text:   { fr, en, nl }   — Mission card text   (issue #104)
 *     vision_title:   { fr, en, nl }   — Vision card title   (issue #104)
 *     vision_text:    { fr, en, nl }   — Vision card text    (issue #104)
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
 *   contenus/homeSections   (issue #102)
 *     Homepage service teasers (ServiceSection.tsx), DIFFERENT content from
 *     the per-service-page docs above (which hold each service *page's* own
 *     title/subtitle). One flat doc for all 5 teasers, using compound keys
 *     `${sectionId}_title` / `${sectionId}_description` per section, e.g.:
 *       'transfert-aeroport_title':        { fr, en, nl }
 *       'transfert-aeroport_description':  { fr, en, nl }
 *       'transfert-simple_title':          { fr, en, nl }
 *       ... (transfert-simple, mise-a-disposition, evenements-speciaux,
 *            escapades-loisirs — deplacements-professionnels excluded, it
 *            isn't rendered on the homepage)
 *     Compound keys keep this doc compatible with the existing flat
 *     `useContenus(sectionId, locale).get(field)` hook and this page's
 *     generic per-field form below, with no changes to either.
 *
 *   contenus/mentionsLegales
 *     hebergeur_nom:     string   — hosting provider company name
 *     hebergeur_adresse: string   — hosting provider address
 *     hebergeur_contact: string   — hosting provider contact URL
 *     editeur_nom:       string   — publisher full name
 *     editeur_forme:     string   — legal form (EI, SARL, etc.)
 *     editeur_enseigne:  string   — trade name
 *     editeur_adresse:   string   — publisher address
 *     editeur_tel:       string   — publisher phone
 *     editeur_email:     string   — publisher email
 *     editeur_directeur: string   — publication director
 *     editeur_siren:     string   — SIREN number
 *     editeur_siret:     string   — SIRET number
 *     editeur_tva:       string   — intra-community VAT number
 *
 *   contenus/cgv
 *     intro:            string   — introductory paragraph
 *     article1_title:   string   — Article 1 heading
 *     article1_body:    string   — Article 1 body (supports "- " list items)
 *     article2_title … article6_body: same pattern for all 6 articles
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
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

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
    // Issue #104: extended with the 3 value cards (Values / Mission /
    // Vision), each as title+text compound keys on the same
    // contenus/about doc, so Mohammed can edit everything in this section.
    id: 'about', label: 'À Propos', icon: '👤',
    fields: [
      { key: 'title',          label: 'Titre section',           multiline: false, i18n: true },
      { key: 'text',           label: 'Texte À Propos',          multiline: true,  i18n: true },
      { key: 'values_title',   label: 'Carte Valeurs — Titre',   multiline: false, i18n: true },
      { key: 'values_text',    label: 'Carte Valeurs — Texte',   multiline: true,  i18n: true },
      { key: 'mission_title',  label: 'Carte Mission — Titre',   multiline: false, i18n: true },
      { key: 'mission_text',   label: 'Carte Mission — Texte',   multiline: true,  i18n: true },
      { key: 'vision_title',   label: 'Carte Vision — Titre',    multiline: false, i18n: true },
      { key: 'vision_text',    label: 'Carte Vision — Texte',    multiline: true,  i18n: true },
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
    id: 'transportFeminin', label: 'Transport au Féminin', icon: '♀️',
    fields: [
      { key: 'title',    label: 'Titre',       multiline: false, i18n: true },
      { key: 'subtitle', label: 'Sous-titre',  multiline: true,  i18n: true },
    ],
  },
  {
    // Issue #102: homepage teasers (ServiceSection.tsx). Distinct from the
    // per-service-page docs above — same field-per-key engine, just with
    // compound `${sectionId}_title` / `${sectionId}_description` keys so one
    // Firestore doc can hold all 5 teasers. See useContenus.ts / page.tsx
    // header comment for the full rationale.
    id: 'homeSections', label: 'Page d\'accueil — Blocs services', icon: '🧩',
    fields: [
      { key: 'transfert-aeroport_title',        label: 'Transfert Aéroport — Titre',        multiline: false, i18n: true },
      { key: 'transfert-aeroport_description',  label: 'Transfert Aéroport — Description',  multiline: true,  i18n: true },
      { key: 'transfert-simple_title',          label: 'Transfert Simple — Titre',          multiline: false, i18n: true },
      { key: 'transfert-simple_description',    label: 'Transfert Simple — Description',    multiline: true,  i18n: true },
      { key: 'mise-a-disposition_title',        label: 'Mise à Disposition — Titre',        multiline: false, i18n: true },
      { key: 'mise-a-disposition_description',  label: 'Mise à Disposition — Description',  multiline: true,  i18n: true },
      { key: 'evenements-speciaux_title',       label: 'Événements Spéciaux — Titre',       multiline: false, i18n: true },
      { key: 'evenements-speciaux_description', label: 'Événements Spéciaux — Description', multiline: true,  i18n: true },
      { key: 'escapades-loisirs_title',         label: 'Escapades Loisirs — Titre',         multiline: false, i18n: true },
      { key: 'escapades-loisirs_description',   label: 'Escapades Loisirs — Description',   multiline: true,  i18n: true },
      { key: 'transport-feminin_title',        label: 'Transport au Féminin — Titre',       multiline: false, i18n: true },
      { key: 'transport-feminin_description',  label: 'Transport au Féminin — Description', multiline: true,  i18n: true },
    ],
  },
  {
    id: 'mentionsLegales', label: 'Mentions Légales', icon: '⚖️',
    fields: [
      { key: 'hebergeur_nom',      label: 'Hébergeur — Nom',          multiline: false, i18n: false },
      { key: 'hebergeur_adresse',  label: 'Hébergeur — Adresse',      multiline: false, i18n: false },
      { key: 'hebergeur_contact',  label: 'Hébergeur — URL contact',  multiline: false, i18n: false },
      { key: 'editeur_nom',        label: 'Éditeur — Nom Prénom',     multiline: false, i18n: false },
      { key: 'editeur_forme',      label: 'Éditeur — Forme juridique', multiline: false, i18n: false },
      { key: 'editeur_enseigne',   label: 'Éditeur — Enseigne',       multiline: false, i18n: false },
      { key: 'editeur_adresse',    label: 'Éditeur — Adresse',        multiline: false, i18n: false },
      { key: 'editeur_tel',        label: 'Éditeur — Téléphone',      multiline: false, i18n: false },
      { key: 'editeur_email',      label: 'Éditeur — E-mail',         multiline: false, i18n: false },
      { key: 'editeur_directeur',  label: 'Directeur de publication', multiline: false, i18n: false },
      { key: 'editeur_siren',      label: 'SIREN',                    multiline: false, i18n: false },
      { key: 'editeur_siret',      label: 'SIRET',                    multiline: false, i18n: false },
      { key: 'editeur_tva',        label: 'N° TVA intracommunautaire', multiline: false, i18n: false },
    ],
  },
  {
    id: 'cgv', label: 'CGV', icon: '📜',
    fields: [
      { key: 'intro',           label: 'Introduction',                          multiline: true,  i18n: false },
      { key: 'article1_title',  label: 'Article 1 — Titre',                     multiline: false, i18n: false },
      { key: 'article1_body',   label: 'Article 1 — Contenu',                   multiline: true,  i18n: false },
      { key: 'article2_title',  label: 'Article 2 — Titre',                     multiline: false, i18n: false },
      { key: 'article2_body',   label: 'Article 2 — Contenu',                   multiline: true,  i18n: false },
      { key: 'article3_title',  label: 'Article 3 — Titre',                     multiline: false, i18n: false },
      { key: 'article3_body',   label: 'Article 3 — Contenu',                   multiline: true,  i18n: false },
      { key: 'article4_title',  label: 'Article 4 — Titre',                     multiline: false, i18n: false },
      { key: 'article4_body',   label: 'Article 4 — Contenu',                   multiline: true,  i18n: false },
      { key: 'article5_title',  label: 'Article 5 — Titre',                     multiline: false, i18n: false },
      { key: 'article5_body',   label: 'Article 5 — Contenu',                   multiline: true,  i18n: false },
      { key: 'article6_title',  label: 'Article 6 — Titre',                     multiline: false, i18n: false },
      { key: 'article6_body',   label: 'Article 6 — Contenu',                   multiline: true,  i18n: false },
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
  const isMobile = useIsMobile();
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

      <div style={{ ...s.layout, ...(isMobile ? { flexDirection: 'column' } : {}) }}>

        {/* ── Section sidebar ──────────────────────────────────────── */}
        <nav
          style={{
            ...s.sectionNav,
            ...(isMobile
              ? { width: '100%', minWidth: 0, position: 'static' as const }
              : {}),
          }}
        >
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
    border: '3px solid rgba(var(--color-gold-rgb), 0.2)', borderTopColor: 'var(--color-gold)',
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
    background: 'rgba(var(--color-gold-rgb), 0.12)', color: 'var(--color-gold)',
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
    background: 'rgba(var(--color-gold-rgb), 0.12)', border: '1px solid rgba(var(--color-gold-rgb), 0.3)', color: 'var(--color-gold)',
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
    padding: '9px 20px', background: 'var(--color-gold)', border: 'none', borderRadius: '8px',
    color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  fields     : { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  fieldGroup : { display: 'flex', flexDirection: 'column', gap: '6px' },
  label      : {
    fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  localeBadge: {
    fontSize: '10px', fontWeight: 700, color: 'var(--color-gold)',
    background: 'rgba(var(--color-gold-rgb), 0.12)', border: '1px solid rgba(var(--color-gold-rgb), 0.2)',
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
