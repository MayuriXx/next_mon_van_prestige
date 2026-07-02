# Tariff Consistency Audit — 2026 Grid

**Date:** 2026-07-02
**Scope:** Verify that every representation of the pricing grid (data, seed,
calculator, admin panel, Firestore, homepage display) is consistent with the
official source file `GRILLE_TARIFAIRE_MS_PRESTIGE_DRIVER_2026.xlsx`, and fix
the discrepancies found.

---

## 1. Business context

MS Prestige Driver publishes prices in two very different ways:

1. **The real grid** used by the online price calculator on `/reservation`
   (airport & leisure packages, per-km transfer brackets, MAD hourly rates,
   hors-base surcharge). This is the contractual pricing.
2. **"From" teaser prices** (`à partir de …`) shown on the homepage marketing
   cards (Services/Vehicles/most-requested transfers). These exist to make the
   offer feel accessible at a glance.

The risk audited here: a teaser price advertised **below** the real grid floor.
A visitor sees "CDG from 260 €", opens the calculator, and is quoted 300 €
minimum. That gap erodes trust and can trigger complaints. The fix aligns every
teaser to the true floor of the grid so the advertised "from" price is always
honoured.

---

## 2. What was verified

The uploaded 2026 grid was compared, value by value, against all pricing
sources in the repository:

| Source | Role | Result |
| --- | --- | --- |
| `lib/data/tariffs.ts` | Canonical static data + offline fallback | **Matches** the xlsx exactly |
| `scripts/seed-tariffs.ts` | Writes the grid to Firestore | **Matches** the xlsx exactly |
| `lib/utils/pricing.ts` | Price calculation engine | Consistent (data-driven) |
| `lib/hooks/useTariffs.ts` | Live Firestore reader (`-1 → Infinity`) | Consistent |
| `app/admin/(dashboard)/tarifs/page.tsx` | Admin editor | Complete & consistent |

Coverage confirmed: 6 airport destinations, 5 leisure destinations, MAD
(55 € / 90 €), Business & Van transfer brackets, minimum fares (22 € / 45 €),
and hors-base surcharge brackets — all identical to the source file.

**Conclusion: the contractual pricing grid required no change.** It was already
in sync with the 2026 file.

---

## 3. Discrepancies found and fixed

Two homepage components carried hardcoded teaser prices that were **below** the
grid floor. These were the only inconsistencies.

### 3.1 `components/sections/Tarifs.tsx` (most-requested transfers)

Teaser prices were aligned to the **Business minimum** of each airport package
(`AIRPORT_PRICES[dest].BUSINESS.min`). Business is the cheapest vehicle tier for
every destination, so this is a truthful floor.

| Destination | Before | After (grid Business min) |
| --- | --- | --- |
| Paris CDG | 260 € | **300 €** |
| Paris Orly | 320 € | **360 €** |
| Bruxelles Zaventem | 160 € | **190 €** |
| Charleroi | 125 € | **145 €** |
| Lille Lesquin | 80 € | **90 €** |
| Gares | 80 € | **90 €** |

### 3.2 `components/sections/Vehicles.tsx` (vehicle cards)

Teaser prices were aligned to the **guaranteed minimum fare** of each vehicle
tier (`MINIMUM_FARES`).

| Vehicle | Before | After (grid minimum fare) |
| --- | --- | --- |
| Business | 25 € | **22 €** |
| Van | 45 € | 45 € (already correct) |

> Note: these figures remain **static** display data on purpose. They are not
> fetched from Firestore, because the "from" label only needs a stable
> marketing floor, not a live value. Each file now carries a comment instructing
> future maintainers to keep the teaser in sync when the grid changes.

### 3.3 Already consistent (no change)

`components/pages/ReservationPage.tsx` shows `55 €/h · Business` and
`90 €/h · Van`, which already match the MAD grid.

---

## 4. Firebase / admin verification

### 4.1 Admin panel — complete and correct

`app/admin/(dashboard)/tarifs/page.tsx` lets Mohammed edit **every** field of
the grid: airport packages, leisure packages, MAD rates, **minimum fares**,
transfer brackets and hors-base brackets. The write path correctly converts the
open-ended bracket bound `Infinity → -1` before saving (Firestore cannot store
`Infinity`), matching the `-1 → Infinity` conversion in `useTariffs`. No missing
field, no structural drift versus the seed.

### 4.2 Live Firestore data — how to verify

The live `tarifs` collection could **not** be read from the build environment
(no admin credentials / no outbound access to Google APIs there). If prices were
edited through the admin panel, production may differ from the repo. A
**read-only** verification script was added:

```bash
npx ts-node --project tsconfig.json scripts/verify-tariffs.ts
```

It fetches the live collection, diffs it against the canonical grid, reports any
`MISMATCH` / `MISSING` / `EXTRA` document, prints `_meta` for traceability, and
**never writes anything**. Exit code `0` means production is in sync.

> **Verified 2026-07-02 (by Evan, locally):** all six documents returned `OK`,
> no `EXTRA`/`MISMATCH`, `_meta.version = 2026` (`updatedBy = seed-tariffs.ts`).
> **Live production Firestore is in sync with the canonical grid — no re-seed
> needed.** No legacy `_structure` document was present either.

To re-synchronise production **if** the verify script reports mismatches (this is
**destructive** — it deletes and recreates the documents):

```bash
npx ts-node --project tsconfig.json scripts/seed-tariffs.ts
```

### 4.3 Dead code removed

Two modules were **not imported anywhere** in the app (verified across the whole
`*.ts` / `*.tsx` tree — zero references to their paths or exported symbols) and
had no runtime effect. They duplicated, in an older string-based shape, the
canonical data now held in `lib/data/tariffs.ts`. Both were deleted in this pass:

- `lib/data/tarifs.ts` — `tarifsData`, a string-formatted display grid
  (e.g. `'300-390€'`). Superseded by the typed `lib/data/tariffs.ts`
  (`AIRPORT_PRICES`, `LEISURE_PRICES`, …). **Note the single vs double "f":** the
  live file is `tariffs.ts`; only the dead `tarifs.ts` was removed.
- `lib/firebase/tarifs.ts` — `getAllTarifs` / `getTarifsByCategory`, an unused
  Firestore reader. The live reader is `lib/hooks/useTariffs.ts`.

### 4.4 Legacy init script (left in place, flagged)

`scripts/init-firestore.ts` writes a legacy `tarifs/_structure` sample document
(plus `_structure` scaffolding in `reservations`, `faq`, `vehicules`,
`contenus`). It is a manual one-off setup script, not import-graph dead code, so
it was **not** deleted. `seed-tariffs.ts` deletes all `tarifs` docs before
seeding, so `_structure` only survives if `init-firestore.ts` is run afterwards.
The live app ignores `tarifs/_structure` (`useTariffs` only reads known document
IDs), and `verify-tariffs.ts` flags it as an `EXTRA` document if present.
Consider retiring this script once every collection has real data.

---

## 5. Files changed in this pass

- `components/sections/Tarifs.tsx` — airport teaser prices aligned to grid.
- `components/sections/Vehicles.tsx` — Business teaser price aligned to grid.
- `scripts/verify-tariffs.ts` — **new** read-only Firestore verification script.
- `docs/TARIFF_AUDIT_2026.md` — this document.
- `lib/data/tarifs.ts` — **removed** (dead code, single-"f" duplicate).
- `lib/firebase/tarifs.ts` — **removed** (dead code, unused Firestore reader).

No change to the contractual pricing grid, the calculator, or the admin panel.
