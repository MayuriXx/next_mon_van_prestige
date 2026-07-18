/**
 * app/admin/(dashboard)/faq/page.tsx
 *
 * Admin — FAQ Management Page (Issue #25)
 *
 * Business purpose:
 *   Mohammed can manage the FAQ displayed on the public /faq page without
 *   touching any code. He can:
 *   - Add new questions and answers (in FR / EN / NL)
 *   - Edit existing entries inline
 *   - Reorder entries via up/down arrows
 *   - Toggle visibility (active/inactive) per entry
 *   - Delete entries
 *
 * Firestore structure:
 *   Collection: faq
 *   Each document:
 *     - question : { fr, en, nl }   — question text per language
 *     - answer   : { fr, en, nl }   — answer text per language
 *     - order    : number           — display order (0-based)
 *     - active   : boolean          — shown on public page when true
 *     - createdAt: Timestamp
 *     - updatedAt: Timestamp
 *
 * Architecture:
 *   - Client component with real-time Firestore subscription (onSnapshot)
 *   - All mutations go directly to Firestore; no local intermediate state
 *   - Reorder uses batch writes to update all `order` fields atomically
 *   - Tab-based language switching for editing multilingual content
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface I18nText {
  fr: string;
  en: string;
  nl: string;
}

interface FaqDoc {
  id:        string;
  question:  I18nText;
  answer:    I18nText;
  order:     number;
  active:    boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

type Locale = 'fr' | 'en' | 'nl';

const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'en', label: 'English',  flag: '🇬🇧' },
  { id: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

const EMPTY_I18N: I18nText = { fr: '', en: '', nl: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyFaq(): Omit<FaqDoc, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    question : { ...EMPTY_I18N },
    answer   : { ...EMPTY_I18N },
    order    : 0,
    active   : true,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminFaqPage() {
  const [items,    setItems]    = useState<FaqDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editId,   setEditId]   = useState<string | 'new' | null>(null);
  const [editData, setEditData] = useState<ReturnType<typeof emptyFaq> | null>(null);
  const [locale,   setLocale]   = useState<Locale>('fr');
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Real-time subscription ──────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, 'faq'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FaqDoc, 'id'>),
      }));
      setItems(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Toast helper ────────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Open editor ─────────────────────────────────────────────────────────────

  function openNew() {
    setEditId('new');
    setEditData(emptyFaq());
  }

  function openEdit(item: FaqDoc) {
    setEditId(item.id);
    setEditData({
      question : { ...item.question },
      answer   : { ...item.answer },
      order    : item.order,
      active   : item.active,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditData(null);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!editData) return;
    if (!editData.question.fr.trim() || !editData.answer.fr.trim()) {
      showToast('La question et la réponse en français sont obligatoires.', false);
      return;
    }
    setSaving(true);
    try {
      if (editId === 'new') {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0;
        await addDoc(collection(db, 'faq'), {
          ...editData,
          order     : maxOrder,
          createdAt : serverTimestamp(),
          updatedAt : serverTimestamp(),
        });
        showToast('✓ Entrée FAQ ajoutée');
      } else {
        await updateDoc(doc(db, 'faq', editId!), {
          ...editData,
          updatedAt: serverTimestamp(),
        });
        showToast('✓ Entrée FAQ mise à jour');
      }
      cancelEdit();
    } catch (e) {
      showToast('Erreur : ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée FAQ ?')) return;
    try {
      await deleteDoc(doc(db, 'faq', id));
      showToast('✓ Entrée supprimée');
    } catch (e) {
      showToast('Erreur : ' + (e as Error).message, false);
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(item: FaqDoc) {
    try {
      await updateDoc(doc(db, 'faq', item.id), {
        active    : !item.active,
        updatedAt : serverTimestamp(),
      });
    } catch (e) {
      showToast('Erreur : ' + (e as Error).message, false);
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────

  async function move(idx: number, direction: -1 | 1) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const batch = writeBatch(db);
    batch.update(doc(db, 'faq', items[idx].id),       { order: targetIdx, updatedAt: serverTimestamp() });
    batch.update(doc(db, 'faq', items[targetIdx].id), { order: idx,       updatedAt: serverTimestamp() });
    try {
      await batch.commit();
    } catch (e) {
      showToast('Erreur lors du réordonnancement : ' + (e as Error).message, false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
      </div>
    );
  }

  return (
    <div style={s.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>📝 Gestion FAQ</h1>
          <p style={s.subtitle}>
            Les modifications sont reflétées en temps réel sur la page publique /faq.
            La version française (FR) est obligatoire ; EN et NL sont optionnels.
          </p>
        </div>
        <button onClick={openNew} style={s.addBtn}>+ Ajouter une question</button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div style={toast.ok ? s.toastOk : s.toastErr}>{toast.msg}</div>
      )}

      {/* ── Edit / New form ──────────────────────────────────────────── */}
      {editId && editData && (
        <div style={s.formCard}>
          <h2 style={s.formTitle}>
            {editId === 'new' ? 'Nouvelle question' : 'Modifier la question'}
          </h2>

          {/* Language tabs */}
          <div style={s.localeTabs}>
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLocale(l.id)}
                style={{ ...s.localeTab, ...(locale === l.id ? s.localeTabActive : {}) }}
              >
                {l.flag} {l.label}
                {l.id === 'fr' && <span style={s.required}>*</span>}
              </button>
            ))}
          </div>

          {/* Question field */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Question ({locale.toUpperCase()})
              {locale === 'fr' && <span style={s.required}> *</span>}
            </label>
            <input
              type="text"
              value={editData.question[locale]}
              onChange={(e) =>
                setEditData((prev) =>
                  prev ? { ...prev, question: { ...prev.question, [locale]: e.target.value } } : prev
                )
              }
              placeholder={locale === 'fr' ? 'Ex: Comment réserver ?' : 'Optional translation…'}
              style={s.input}
            />
          </div>

          {/* Answer field */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Réponse ({locale.toUpperCase()})
              {locale === 'fr' && <span style={s.required}> *</span>}
            </label>
            <textarea
              rows={5}
              value={editData.answer[locale]}
              onChange={(e) =>
                setEditData((prev) =>
                  prev ? { ...prev, answer: { ...prev.answer, [locale]: e.target.value } } : prev
                )
              }
              placeholder={locale === 'fr' ? 'Saisissez la réponse…' : 'Optional translation…'}
              style={s.textarea}
            />
          </div>

          {/* Active toggle */}
          <div style={s.toggleRow}>
            <label style={s.label}>Visible sur le site public</label>
            <button
              onClick={() => setEditData((prev) => prev ? { ...prev, active: !prev.active } : prev)}
              style={{ ...s.toggle, ...(editData.active ? s.toggleOn : s.toggleOff) }}
            >
              {editData.active ? '✓ Actif' : '✕ Masqué'}
            </button>
          </div>

          {/* Actions */}
          <div style={s.formActions}>
            <button onClick={cancelEdit} style={s.cancelBtn}>Annuler</button>
            <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
              {saving ? 'Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ── FAQ list ──────────────────────────────────────────────────── */}
      {items.length === 0 && !editId ? (
        <div style={s.empty}>
          <p style={s.emptyText}>Aucune entrée FAQ. Cliquez sur « Ajouter une question » pour commencer.</p>
        </div>
      ) : (
        <div style={s.list}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ ...s.row, ...(item.active ? {} : s.rowInactive) }}>

              {/* Order controls */}
              <div style={s.orderBtns}>
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  style={s.orderBtn}
                  title="Monter"
                >▲</button>
                <span style={s.orderNum}>{idx + 1}</span>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  style={s.orderBtn}
                  title="Descendre"
                >▼</button>
              </div>

              {/* Content */}
              <div style={s.rowContent}>
                <div style={s.rowQ}>{item.question.fr || <em style={{ opacity: 0.4 }}>Sans titre</em>}</div>
                <div style={s.rowA}>
                  {(item.answer.fr || '').slice(0, 120)}{item.answer.fr?.length > 120 ? '…' : ''}
                </div>
                <div style={s.rowLangs}>
                  {LOCALES.map((l) => (
                    <span
                      key={l.id}
                      style={{
                        ...s.langBadge,
                        ...(item.question[l.id] ? s.langBadgeOk : s.langBadgeMissing),
                      }}
                      title={item.question[l.id] ? `Traduit en ${l.label}` : `Manquant en ${l.label}`}
                    >
                      {l.flag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={s.rowActions}>
                <button
                  onClick={() => toggleActive(item)}
                  style={{ ...s.badge, ...(item.active ? s.badgeActive : s.badgeInactive) }}
                  title={item.active ? 'Cliquer pour masquer' : 'Cliquer pour activer'}
                >
                  {item.active ? '● Actif' : '○ Masqué'}
                </button>
                <button onClick={() => openEdit(item)} style={s.editBtn}>✏️ Modifier</button>
                <button onClick={() => handleDelete(item.id)} style={s.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page      : { display: 'flex', flexDirection: 'column', gap: '24px' },
  header    : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' },
  title     : { margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' },
  subtitle  : { margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '560px' },
  centered  : { display: 'flex', justifyContent: 'center', padding: '80px' },
  spinner   : {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid rgba(var(--color-gold-rgb), 0.2)', borderTopColor: 'var(--color-gold)',
    animation: 'spin 0.8s linear infinite',
  },
  toastOk   : {
    padding: '12px 16px', background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
    color: '#22C55E', fontSize: '13px',
  },
  toastErr  : {
    padding: '12px 16px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    color: '#EF4444', fontSize: '13px',
  },
  addBtn    : {
    padding: '10px 20px', background: 'var(--color-gold)', border: 'none', borderRadius: '8px',
    color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
  },

  // Form card
  formCard  : {
    background: '#111', border: '1px solid rgba(var(--color-gold-rgb), 0.25)', borderRadius: '12px',
    padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  formTitle : { margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-gold)' },
  localeTabs: { display: 'flex', gap: '6px' },
  localeTab : {
    padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500,
  },
  localeTabActive: {
    background: 'rgba(var(--color-gold-rgb), 0.12)', border: '1px solid rgba(var(--color-gold-rgb), 0.3)', color: 'var(--color-gold)',
  },
  required  : { color: '#EF4444', marginLeft: '2px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label     : { fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  input     : {
    padding: '10px 12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
  },
  textarea  : {
    padding: '10px 12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
  },
  toggleRow : { display: 'flex', alignItems: 'center', gap: '12px' },
  toggle    : {
    padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600,
  },
  toggleOn  : { background: 'rgba(34,197,94,0.15)', color: '#22C55E' },
  toggleOff : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' },
  cancelBtn : {
    padding: '9px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: 'rgba(255,255,255,0.55)', fontSize: '13px', cursor: 'pointer',
  },
  saveBtn   : {
    padding: '9px 20px', background: 'var(--color-gold)', border: 'none', borderRadius: '8px',
    color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },

  // List
  list        : { display: 'flex', flexDirection: 'column', gap: '8px' },
  row         : {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
    padding: '14px 16px',
  },
  rowInactive : { opacity: 0.5 },
  orderBtns   : { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 },
  orderBtn    : {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer', fontSize: '11px', padding: '2px 6px', lineHeight: 1,
  },
  orderNum    : { fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 600 },
  rowContent  : { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  rowQ        : { color: '#fff', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowA        : { color: 'rgba(255,255,255,0.4)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowLangs    : { display: 'flex', gap: '4px', marginTop: '2px' },
  langBadge   : { fontSize: '14px', opacity: 1 },
  langBadgeOk : { filter: 'none' },
  langBadgeMissing: { filter: 'grayscale(1)', opacity: 0.3 },
  rowActions  : { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  badge       : { padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  badgeActive : { background: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  badgeInactive:{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
  editBtn     : {
    padding: '6px 12px', background: 'rgba(var(--color-gold-rgb), 0.1)', border: '1px solid rgba(var(--color-gold-rgb), 0.2)',
    borderRadius: '6px', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '12px',
  },
  deleteBtn   : {
    padding: '6px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '13px',
  },
  empty       : {
    background: '#111', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '48px', textAlign: 'center',
  },
  emptyText   : { color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: 0 },
};
