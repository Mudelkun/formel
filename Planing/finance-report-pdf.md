# Finance Report PDF — Aperçu Financier

## Goal

Allow admins to download two types of professional PDF financial reports from the "Aperçu financier" page:

1. **Annual report** — full picture of the active school year
2. **Monthly report** — scoped to a specific month selected by the admin

Both should read like a school financial statement, similar to a bank statement or end-of-period summary.

---

## What Should Be Downloadable

### 1. Header
- School name, address, phone, email (from settings)
- Document title: **"Rapport Financier — Année Scolaire {year}"**
- Generation date (right-aligned)

---

### 2. Financial Summary (4 KPIs)
Pulled from `GET /finance/summary`:

| Field | Label |
|---|---|
| `total_expected` | Total attendu |
| `total_collected` | Total collecté |
| `total_remaining` | Restant à collecter |
| `total_scholarships` | Total bourses accordées |

Layout: horizontal card row, same as on-screen summary.
Show collection rate percentage: `(collected / expected) * 100`.

---

### 3. Collection by Group Table
Pulled from `GET /finance/group-breakdown`:

| Column | Notes |
|---|---|
| Groupe | Group name |
| Élèves | Student count |
| Attendu | Expected total |
| Collecté | Collected total |
| Restant | Remaining |
| Taux | Collection rate % |

Visual: progress bar is not possible in PDF — replace with color-coded rate text:
- ≥ 75% → green
- ≥ 40% → orange
- < 40% → red

---

### 4. Versement Breakdown per Group
Pulled from `GET /finance/versement/{versementId}` for each versement in each group:

For each group, a sub-table showing:

| Column | Notes |
|---|---|
| Versement | Name (e.g. "1er versement") |
| Échéance | Due date |
| Attendu | Expected amount |
| Collecté | Collected amount |
| Taux | Collection rate % |
| Statut | En retard / En cours / À venir |

Status color rules (text only):
- En retard → red
- En cours → blue
- À venir → gray

---

### 5. Monthly Collection Trend Table
Pulled from `GET /finance/monthly-payments`:

Simple table replacing the line chart:

| Mois | Collecté | En attente | Cumul collecté |
|---|---|---|---|
| Janvier | ... | ... | ... |
| Février | ... | ... | ... |
| ...| | | |

Charts cannot be embedded in jsPDF without canvas rendering — use a clean table instead.

---

### 6. Notes Section
- Standard disclaimer: report is generated automatically, figures reflect data at time of generation.

---

### 7. Footer (every page)
- System name + authenticity note
- Page X / Y

---

## UI Design

### Trigger
- Location: top-right of the `PageHeader` on the Aperçu financier page
- Visibility: admin only (`user?.role === 'admin'`)
- A single **dropdown button** (split button pattern):
  - Primary action: **"Télécharger rapport annuel"** → downloads the full year report immediately
  - Dropdown arrow opens a menu with a month picker:
    - Lists only months that have payment data (derived from `monthlyPayments`)
    - Selecting a month triggers the monthly report download

```
[ Aperçu financier                         2024-2025 ]

                    [ ↓ Télécharger rapport ▾ ]
                         ┌──────────────────────┐
                         │ Rapport annuel        │
                         │ ─────────────────── │
                         │ Janvier 2025          │
                         │ Février 2025          │
                         │ Mars 2025             │
                         └──────────────────────┘
```

---

### Loading State
- Button (or selected menu item) shows a `Loader2` spinner and disables during fetch + generation
- All data is **refetched fresh** before generating (same pattern as student payment PDF)

---

## UX Behavior — Annual Report

1. Admin clicks **"Rapport annuel"** from the dropdown
2. Button enters loading state (spinner, disabled)
3. Fetch in parallel:
   - `GET /finance/summary`
   - `GET /finance/group-breakdown`
   - `GET /finance/monthly-payments`
   - Versement details for each group/fee (batched)
4. PDF generated client-side
5. Downloads as `rapport_financier_2024-2025.pdf`
6. Button resets

---

## UX Behavior — Monthly Report

1. Admin opens dropdown, selects a month (e.g. "Mars 2025")
2. Button enters loading state
3. Fetch in parallel:
   - `GET /finance/summary?month=2025-03`  ← **needs backend support** (see below)
   - `GET /finance/group-breakdown?month=2025-03`  ← **needs backend support**
   - Month row already in cached `monthlyPayments` data — no extra call needed
4. PDF generated client-side
5. Downloads as `rapport_financier_mars_2025.pdf`
6. Button resets

---

## Monthly Report — Contents

The monthly PDF is a focused, condensed version of the annual report scoped to one month:

### 1. Header
- Same school branding
- Title: **"Rapport Mensuel — {Mois} {Année}"** (e.g. "Rapport Mensuel — Mars 2025")

### 2. Monthly KPI Summary
From `/finance/summary?month=YYYY-MM`:
- Total collecté ce mois
- Total en attente ce mois
- Nombre de paiements

### 3. Collection by Group (this month only)
From `/finance/group-breakdown?month=YYYY-MM`:
- Same table as annual but filtered to that month's payments

### 4. Notes + Footer
- Same as annual report

---

## Backend Changes Required

The `/finance/summary` and `/finance/group-breakdown` endpoints currently filter by active school year only. A `month` query param needs to be added to both:

- **`GET /finance/summary?month=YYYY-MM`** — additionally filter `payments.paymentDate` to that month
- **`GET /finance/group-breakdown?month=YYYY-MM`** — same month filter on collected/pending amounts

The versement breakdown and monthly trend table are **not** included in the monthly report (they are year-scoped by nature).

---

## Implementation Notes

- Reuse `generate-payment-pdf.ts` patterns (color palette, header, footer, fmtAmount)
- Create a new file: `src/lib/generate-finance-report-pdf.ts` — handles both annual and monthly (accepts optional `month` param)
- `jsPDF` + `jspdf-autotable` already installed
- Monthly trend: compute cumulative in the generator (same as running balance logic in student PDF)
- Multi-page: `showHead: 'everyPage'` on all tables
- Font size: 7.5pt for table data, consistent with student PDF
- Dropdown UI: use a `DropdownMenu` from the existing component library

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/lib/generate-finance-report-pdf.ts` | Create — PDF generator (annual + monthly) |
| `src/pages/FinancePage.tsx` | Modify — add dropdown download button |
| `src/api/finance.ts` | Modify — add `month` param to `getFinanceSummary` and `getGroupBreakdown` |
| `backend/src/modules/finance/finance.service.js` | Modify — add `month` filter to `getFinanceSummary` and `getGroupBreakdown` |
| `backend/src/modules/finance/finance.routes.js` | Modify — pass `month` query param through to service |
