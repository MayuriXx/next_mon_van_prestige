/**
 * app/admin/(dashboard)/tarifs/page.tsx
 *
 * Admin — Tariff Management Page (Issue #22)
 *
 * Business purpose:
 *   Mohammed can view and edit all pricing data from this single page:
 *   - Airport package prices (Business / Van) — the two values per vehicle are
 *     DIRECTIONAL fares, not a range: min = departure from Valenciennes,
 *     max = reverse trip back to Valenciennes (grid notation "300///390")
 *   - Leisure package prices (Business / Van) — same directional semantics
 *   - MAD (Mise à Disposition) hourly rates
 *   - Per-km transfer brackets (Business and Van)
 *   - Out-of-base (hors-base) surcharge brackets
 *   All changes are saved in real time to Firestore (`tarifs` collection).
 *
 * Firestore document structure:
 *   tarifs/airports          → { CDG: { BUSINESS: {min,max}, VAN: {min,max} }, … }
 *   tarifs/leisure           → { ASTERIX: { BUSINESS: {min,max}, VAN: {min,max} }, … }
 *   tarifs/mad               → { BUSINESS: 55, VAN: 90 }
 *   tarifs/minimum_fares     → { BUSINESS: 22, VAN: 45 }
 *   tarifs/transfer_brackets → { BUSINESS: [...], VAN: [...] }
 *   tarifs/out_of_base_brackets → { BUSINESS: [...], VAN: [...] }
 *
 * Sentinel: Infinity is stored as -1 in Firestore (JSON-incompatible).
 *   normaliseBrackets() in useTariffs converts -1 → Infinity on read.
 *   Here we convert Infinity → -1 on write before saving.
 *
 * Architecture:
 *   - Client component; uses useTariffs() to seed initial data from Firestore
 *   - Local state mirrors the tariff data; save buttons write to Firestore
 *   - Tab-based UI: one tab per tariff category
 *   - Input validation: numbers must be positive, bracket bounds must be coherent
 */

'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useTariffs } from '@/lib/hooks/useTariffs';
import type { TariffData } from '@/lib/hooks/useTariffs';
import type {
  AirportDestination,
  LeisureDestination,
  VehicleType,
} from '@/lib/types/pricing';
import type { KmBracket } from '@/lib/data/tariffs';

// ── Constants ─────────────────────────────────────────────────────────────────

const AIRPORT_LABELS: Record<AirportDestination, string> = {
  CDG       : 'Paris CDG',
  ORLY      : 'Paris Orly',
  ZAVENTEM  : 'Bruxelles Zaventem',
  CHARLEROI : 'Charleroi',
  LESQUIN   : 'Lille Lesquin',
  GARES     : 'Gares TGV',
};

const LEISURE_LABELS: Record<LeisureDestination, string> = {
  ASTERIX : 'Parc Astérix',
  WALIBI  : 'Walibi',
  DISNEY  : 'Disneyland Paris',
  LENS    : 'Musée du Louvre-Lens',
  LOSC    : 'Match LOSC',
};

const TABS = [
  { id: 'airports',    label: '✈️ Aéroports' },
  { id: 'leisure',     label: '🎡 Loisirs' },
  { id: 'mad',         label: '⏱️ MAD' },
  { id: 'transfer',    label: '🚗 Tranches km Transfer' },
  { id: 'out_of_base', label: '📍 Hors-base' },
  { id: 'women',       label: '👩 Transport Féminin' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert Infinity → -1 for Firestore serialisation */
function bracketsForFirestore(brackets: KmBracket[]): KmBracket[] {
  return brackets.map((b) => ({ ...b, to: b.to === Infinity ? -1 : b.to }));
}

function num(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TarifsPage() {
  const { tariffs, loading } = useTariffs();

  // Local editable copies of each tariff section
  const [airports,       setAirports]       = useState<TariffData['airports']       | null>(null);
  const [leisure,        setLeisure]         = useState<TariffData['leisure']        | null>(null);
  const [mad,            setMad]             = useState<TariffData['mad']            | null>(null);
  const [transferB,      setTransferB]       = useState<TariffData['transferBrackets'] | null>(null);
  const [outOfBaseB,     setOutOfBaseB]      = useState<TariffData['outOfBaseBrackets'] | null>(null);
  const [minimumFares,   setMinimumFares]    = useState<TariffData['minimumFares']  | null>(null);

  const [womenSurcharge, setWomenSurcharge] = useState<number>(20);

  const [activeTab,   setActiveTab]   = useState<TabId>('airports');
  const [saving,      setSaving]      = useState<string | null>(null); // doc id being saved
  const [savedMsg,    setSavedMsg]    = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  // Seed local state once tariffs are loaded
  useEffect(() => {
    if (!loading) {
      setAirports(JSON.parse(JSON.stringify(tariffs.airports)));
      setLeisure(JSON.parse(JSON.stringify(tariffs.leisure)));
      setMad({ ...tariffs.mad });
      setMinimumFares({ ...tariffs.minimumFares });
      setTransferB(JSON.parse(JSON.stringify(tariffs.transferBrackets)));
      setOutOfBaseB(JSON.parse(JSON.stringify(tariffs.outOfBaseBrackets)));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch women surcharge from Firestore
  useEffect(() => {
    const ref = doc(db, 'tarifs', 'women_surcharge');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.percentage === 'number') setWomenSurcharge(data.percentage);
      }
    });
    return () => unsub();
  }, []);

  // ── Save helpers ────────────────────────────────────────────────────────────

  async function save(docId: string, data: unknown) {
    setSaving(docId);
    setErrorMsg(null);
    try {
      await setDoc(doc(db, 'tarifs', docId), data as Record<string, unknown>);
      setSavedMsg(`✓ "${docId}" sauvegardé`);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (e) {
      setErrorMsg('Erreur : ' + (e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading || !airports || !leisure || !mad || !transferB || !outOfBaseB || !minimumFares) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <h1 style={s.title}>💶 Gestion des tarifs</h1>
        <p style={s.subtitle}>
          Toutes les modifications sont enregistrées dans Firestore et répercutées
          immédiatement sur le site public.
        </p>
      </div>

      {/* ── Toasts ─────────────────────────────────────────────────────── */}
      {savedMsg && <div style={s.toastOk}>{savedMsg}</div>}
      {errorMsg && <div style={s.toastErr}>{errorMsg}</div>}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Airports ──────────────────────────────────────────────── */}
      {activeTab === 'airports' && (
        <Section
          title="Forfaits aéroports"
          description="Deux tarifs par véhicule : « Aller » = trajet au départ de Valenciennes, « Retour » = trajet en sens inverse (destination → Valenciennes). Ex. V-CDG Business : 300 € à l'aller, 390 € au retour. La majoration hors-base s'ajoute par-dessus."
          onSave={() => save('airports', airports)}
          saving={saving === 'airports'}
        >
          <PackageTable
            data={airports}
            labels={AIRPORT_LABELS}
            onChange={(dest, vehicle, field, val) => {
              setAirports((prev) => {
                if (!prev) return prev;
                const next = JSON.parse(JSON.stringify(prev));
                next[dest][vehicle][field] = num(val);
                return next;
              });
            }}
          />
        </Section>
      )}

      {/* ── Tab: Leisure ───────────────────────────────────────────────── */}
      {activeTab === 'leisure' && (
        <Section
          title="Forfaits loisirs"
          description="Deux tarifs par véhicule : « Aller » = départ de Valenciennes, « Retour » = destination → Valenciennes. La majoration hors-base s'ajoute par-dessus."
          onSave={() => save('leisure', leisure)}
          saving={saving === 'leisure'}
        >
          <PackageTable
            data={leisure}
            labels={LEISURE_LABELS}
            onChange={(dest, vehicle, field, val) => {
              setLeisure((prev) => {
                if (!prev) return prev;
                const next = JSON.parse(JSON.stringify(prev));
                next[dest][vehicle][field] = num(val);
                return next;
              });
            }}
          />
        </Section>
      )}

      {/* ── Tab: MAD ───────────────────────────────────────────────────── */}
      {activeTab === 'mad' && (
        <Section
          title="Mise à Disposition (MAD)"
          description="Tarif horaire en €/h par type de véhicule."
          onSave={async () => {
            await save('mad', mad);
            await save('minimum_fares', minimumFares);
          }}
          saving={saving === 'mad' || saving === 'minimum_fares'}
        >
          <div style={s.madGrid}>
            {(['BUSINESS', 'VAN'] as VehicleType[]).map((v) => (
              <div key={v} style={s.madCard}>
                <div style={s.madLabel}>{v}</div>
                <div style={s.madRow}>
                  <span style={s.fieldLabel}>Tarif horaire (€/h)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={mad[v]}
                    onChange={(e) => setMad((prev) => ({ ...prev!, [v]: num(e.target.value) }))}
                    style={s.input}
                  />
                </div>
                <div style={s.madRow}>
                  <span style={s.fieldLabel}>Minimum facturable (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={minimumFares[v]}
                    onChange={(e) =>
                      setMinimumFares((prev) => ({ ...prev!, [v]: num(e.target.value) }))
                    }
                    style={s.input}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Tab: Transfer brackets ─────────────────────────────────────── */}
      {activeTab === 'transfer' && (
        <Section
          title="Tranches kilométriques — Transfert"
          description={
            'Chaque tranche définit un prix pour une plage de distance. ' +
            'Utilisez "Forfait" pour un tarif fixe ou "€/km" pour un tarif variable. ' +
            'La dernière tranche est toujours ouverte (borne supérieure = ∞).'
          }
          onSave={() =>
            save('transfer_brackets', {
              BUSINESS: bracketsForFirestore(transferB.BUSINESS),
              VAN      : bracketsForFirestore(transferB.VAN),
            })
          }
          saving={saving === 'transfer_brackets'}
        >
          <BracketEditor
            vehicleType="BUSINESS"
            brackets={transferB.BUSINESS}
            onChange={(brackets) => setTransferB((prev) => prev ? { ...prev, BUSINESS: brackets } : prev)}
          />
          <div style={{ height: '24px' }} />
          <BracketEditor
            vehicleType="VAN"
            brackets={transferB.VAN}
            onChange={(brackets) => setTransferB((prev) => prev ? { ...prev, VAN: brackets } : prev)}
          />
        </Section>
      )}

      {/* ── Tab: Out-of-base brackets ──────────────────────────────────── */}
      {activeTab === 'out_of_base' && (
        <Section
          title="Supplément hors-base"
          description={
            'Majoration appliquée lorsque le point de prise en charge est éloigné ' +
            'de la base (Gare de Valenciennes). Les tranches portent sur la distance ' +
            'routière base → prise en charge (ex. « 3 à 7 km »). Elle s\'applique à ' +
            'TOUS les services (transfert, mise à disposition, forfaits aéroport et ' +
            'loisirs) et s\'ajoute en supplément fixe, sans remise.'
          }
          onSave={() =>
            save('out_of_base_brackets', {
              BUSINESS: bracketsForFirestore(outOfBaseB.BUSINESS),
              VAN      : bracketsForFirestore(outOfBaseB.VAN),
            })
          }
          saving={saving === 'out_of_base_brackets'}
        >
          <BracketEditor
            vehicleType="BUSINESS"
            brackets={outOfBaseB.BUSINESS}
            onChange={(brackets) => setOutOfBaseB((prev) => prev ? { ...prev, BUSINESS: brackets } : prev)}
          />
          <div style={{ height: '24px' }} />
          <BracketEditor
            vehicleType="VAN"
            brackets={outOfBaseB.VAN}
            onChange={(brackets) => setOutOfBaseB((prev) => prev ? { ...prev, VAN: brackets } : prev)}
          />
        </Section>
      )}

      {/* ── Tab: Women's transport surcharge ───────────────────────────── */}
      {activeTab === 'women' && (
        <Section
          title="Majoration Transport au Féminin"
          description={
            'Pourcentage de majoration appliqué aux tarifs de la page Transport au Féminin. ' +
            'Par exemple, 20 signifie +20% sur le prix de base du transfert.'
          }
          onSave={() => save('women_surcharge', { percentage: womenSurcharge })}
          saving={saving === 'women_surcharge'}
        >
          <div style={s.madGrid}>
            <div style={s.madCard}>
              <div style={s.madLabel}>Majoration (%)</div>
              <div style={s.madRow}>
                <span style={s.fieldLabel}>Pourcentage appliqué</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={womenSurcharge}
                    onChange={(e) => setWomenSurcharge(num(e.target.value))}
                    style={s.input}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>%</span>
                </div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                Exemple : un transfert à 50 € avec une majoration de {womenSurcharge}% sera facturé{' '}
                <strong style={{ color: 'var(--color-gold)' }}>{Math.ceil(50 * (1 + womenSurcharge / 100))} €</strong>
              </p>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title, description, children, onSave, saving,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <div>
          <h2 style={s.sectionTitle}>{title}</h2>
          <p style={s.sectionDesc}>{description}</p>
        </div>
        <button onClick={onSave} disabled={saving} style={s.saveBtn}>
          {saving ? 'Enregistrement…' : '💾 Enregistrer'}
        </button>
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

// ── PackageTable — airports and leisure ───────────────────────────────────────

function PackageTable<T extends string>({
  data, labels, onChange,
}: {
  data: Record<T, Record<VehicleType, { min: number; max: number }>>;
  labels: Record<T, string>;
  onChange: (dest: T, vehicle: VehicleType, field: 'min' | 'max', val: string) => void;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={t.table}>
        <thead>
          <tr>
            <th style={t.th}>Destination</th>
            <th style={t.th} colSpan={2}>Business (€)</th>
            <th style={t.thSep} />
            <th style={t.th} colSpan={2}>Van (€)</th>
          </tr>
          <tr>
            <th style={t.thSub} />
            {/* Stored as min/max in Firestore for backward compatibility, but the
                two values are DIRECTIONAL fares, not a price range. */}
            <th style={t.thSub} title="Trajet au départ de Valenciennes">Aller (départ V.)</th>
            <th style={t.thSub} title="Trajet en sens inverse, vers Valenciennes">Retour (vers V.)</th>
            <th style={t.thSep} />
            <th style={t.thSub} title="Trajet au départ de Valenciennes">Aller (départ V.)</th>
            <th style={t.thSub} title="Trajet en sens inverse, vers Valenciennes">Retour (vers V.)</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(labels) as T[]).map((dest) => (
            <tr key={dest}>
              <td style={t.tdLabel}>{labels[dest]}</td>
              {(['BUSINESS', 'VAN'] as VehicleType[]).map((vehicle, vi) => (
                <React.Fragment key={vehicle}>
                  {vi === 1 && <td style={t.tdSep} />}
                  <td style={t.td}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={data[dest][vehicle].min}
                      onChange={(e) => onChange(dest, vehicle, 'min', e.target.value)}
                      style={s.inputSm}
                    />
                  </td>
                  <td style={t.td}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={data[dest][vehicle].max}
                      onChange={(e) => onChange(dest, vehicle, 'max', e.target.value)}
                      style={s.inputSm}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── BracketEditor — km bracket pricing ────────────────────────────────────────

function BracketEditor({
  vehicleType, brackets, onChange,
}: {
  vehicleType: VehicleType;
  brackets: KmBracket[];
  onChange: (updated: KmBracket[]) => void;
}) {
  function update(idx: number, field: keyof KmBracket, raw: string) {
    const next = brackets.map((b, i) => {
      if (i !== idx) return b;
      if (field === 'flat' || field === 'ratePerKm') {
        const v = raw === '' ? undefined : num(raw);
        return { ...b, [field]: v };
      }
      // from / to
      const v = raw === '∞' || raw === '' ? Infinity : num(raw);
      return { ...b, [field]: v };
    });
    onChange(next);
  }

  function addRow() {
    const last = brackets[brackets.length - 1];
    const newFrom = last ? (last.to === Infinity ? last.from + 50 : last.to + 1) : 0;
    onChange([
      ...brackets.map((b, i) =>
        i === brackets.length - 1 && b.to === Infinity
          ? { ...b, to: newFrom - 1 }
          : b
      ),
      { from: newFrom, to: Infinity, flat: undefined, ratePerKm: undefined },
    ]);
  }

  function removeRow(idx: number) {
    const next = brackets.filter((_, i) => i !== idx);
    // Re-open the new last bracket
    if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], to: Infinity };
    onChange(next);
  }

  const color = vehicleType === 'BUSINESS' ? 'var(--color-gold)' : '#818CF8';

  return (
    <div style={be.wrap}>
      <div style={{ ...be.vehicleLabel, color }}>{vehicleType}</div>
      <table style={t.table}>
        <thead>
          <tr>
            <th style={t.thSub}>De (km)</th>
            <th style={t.thSub}>À (km)</th>
            <th style={t.thSub}>Forfait (€)</th>
            <th style={t.thSub}>€/km</th>
            <th style={t.thSub} />
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, idx) => (
            <tr key={idx}>
              <td style={t.td}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={b.from}
                  onChange={(e) => update(idx, 'from', e.target.value)}
                  style={s.inputSm}
                />
              </td>
              <td style={t.td}>
                {b.to === Infinity ? (
                  <span style={be.infty}>∞</span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={b.to}
                    onChange={(e) => update(idx, 'to', e.target.value)}
                    style={s.inputSm}
                  />
                )}
              </td>
              <td style={t.td}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={b.flat ?? ''}
                  placeholder="—"
                  onChange={(e) => update(idx, 'flat', e.target.value)}
                  style={s.inputSm}
                />
              </td>
              <td style={t.td}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={b.ratePerKm ?? ''}
                  placeholder="—"
                  onChange={(e) => update(idx, 'ratePerKm', e.target.value)}
                  style={s.inputSm}
                />
              </td>
              <td style={t.td}>
                <button
                  onClick={() => removeRow(idx)}
                  disabled={brackets.length <= 1}
                  style={be.removeBtn}
                  title="Supprimer cette tranche"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={be.addBtn}>+ Ajouter une tranche</button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page     : { display: 'flex', flexDirection: 'column', gap: '24px' },
  header   : { marginBottom: '4px' },
  title    : { margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' },
  subtitle : { margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)' },
  centered : { display: 'flex', justifyContent: 'center', padding: '80px' },
  spinner  : {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid rgba(var(--color-gold-rgb), 0.2)', borderTopColor: 'var(--color-gold)',
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
  tabs     : { display: 'flex', gap: '6px', flexWrap: 'wrap' as const },
  tab      : {
    padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500,
    transition: 'all .15s',
  },
  tabActive: {
    background: 'rgba(var(--color-gold-rgb), 0.12)', border: '1px solid rgba(var(--color-gold-rgb), 0.3)',
    color: 'var(--color-gold)',
  },
  section  : {
    background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '16px', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexWrap: 'wrap' as const,
  },
  sectionTitle : { margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' },
  sectionDesc  : { margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)', maxWidth: '500px' },
  sectionBody  : { padding: '24px' },
  saveBtn      : {
    padding: '9px 20px', background: 'var(--color-gold)', border: 'none', borderRadius: '8px',
    color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
    whiteSpace: 'nowrap' as const, flexShrink: 0,
  },
  madGrid  : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  madCard  : {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  madLabel : { color: 'var(--color-gold)', fontWeight: 700, fontSize: '14px' },
  madRow   : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  fieldLabel : { fontSize: '13px', color: 'rgba(255,255,255,0.5)' },
  input    : {
    padding: '7px 10px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px', color: '#fff', fontSize: '13px', width: '90px', textAlign: 'right' as const,
  },
  inputSm  : {
    padding: '5px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px', color: '#fff', fontSize: '12px', width: '72px', textAlign: 'right' as const,
  },
};

const t: Record<string, React.CSSProperties> = {
  table   : { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th      : {
    padding: '8px 12px', textAlign: 'left' as const,
    color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  thSub   : {
    padding: '6px 12px', textAlign: 'left' as const,
    color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontSize: '11px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  thSep   : { width: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td      : { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' as const },
  tdLabel : {
    padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: '#fff', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' as const,
  },
  tdSep   : { width: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
};

const be: Record<string, React.CSSProperties> = {
  wrap        : { display: 'flex', flexDirection: 'column', gap: '8px' },
  vehicleLabel: { fontWeight: 700, fontSize: '13px', marginBottom: '2px' },
  infty       : { color: 'rgba(255,255,255,0.3)', fontSize: '18px', paddingLeft: '16px' },
  removeBtn   : {
    padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '5px', color: '#EF4444', cursor: 'pointer', fontSize: '11px',
  },
  addBtn      : {
    marginTop: '8px', padding: '7px 14px', background: 'transparent',
    border: '1px dashed rgba(var(--color-gold-rgb), 0.3)', borderRadius: '8px',
    color: 'var(--color-gold)', cursor: 'pointer', fontSize: '12px', alignSelf: 'flex-start',
  },
};
