import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SchoolSettings } from '@/api/settings';
import type { FinanceSummary, GroupBreakdown, MonthlyPayment } from '@/api/finance';
import type { VersementFinance } from '@/api/finance';

// ── Colors (consistent with student payment PDF) ─────────

const C = {
  primary:   [15, 23, 42]    as const,
  accent:    [37, 99, 235]   as const,
  textDark:  [17, 24, 39]    as const,
  textMed:   [75, 85, 99]    as const,
  textMuted: [156, 163, 175] as const,
  border:    [229, 231, 235] as const,
  bgLight:   [248, 250, 252] as const,
  bgCard:    [241, 245, 249] as const,
  green:     [22, 163, 74]   as const,
  orange:    [234, 88, 12]   as const,
  red:       [220, 38, 38]   as const,
  blue:      [37, 99, 235]   as const,
  white:     [255, 255, 255] as const,
};

const ML = 20; // left margin
const MR = 20; // right margin

// ── Helpers ──────────────────────────────────────────────

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function fmtAmount(amount: number | string, currency: string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency}`;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(num).replace(/,/g, ' ');
  return `${formatted} ${currency}`;
}

function pct(collected: number, expected: number): string {
  if (expected === 0) return '0%';
  return `${Math.round((collected / expected) * 100)}%`;
}

function rateColor(collected: number, expected: number): readonly [number, number, number] {
  const rate = expected > 0 ? (collected / expected) * 100 : 0;
  if (rate >= 75) return C.green;
  if (rate >= 40) return C.orange;
  return C.red;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
};

function monthLabel(yyyymm: string): string {
  const [year, mm] = yyyymm.split('-');
  return `${MONTH_LABELS[mm] || mm} ${year}`;
}

// ── Shared: draw header ──────────────────────────────────

function drawHeader(
  doc: jsPDF,
  settings: SchoolSettings | undefined,
  title: string,
  subtitle: string,
) {
  const pw = doc.internal.pageSize.getWidth();

  // School name
  const schoolName = settings?.schoolName || 'Formel';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.primary);
  doc.text(schoolName, ML, 20);

  // School details
  const details: string[] = [];
  if (settings?.address) details.push(settings.address);
  if (settings?.phone) details.push(settings.phone);
  if (settings?.email) details.push(settings.email);
  if (details.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(details.join('  ·  '), ML, 26);
  }

  // Title (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.accent);
  doc.text(title, pw - MR, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(subtitle, pw - MR, 23, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Généré le ${fmtDate(new Date().toISOString())}`, pw - MR, 29, { align: 'right' });

  // Separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(ML, 34, pw - MR, 34);

  return 42; // next Y position
}

// ── Shared: draw footer on all pages ─────────────────────

function drawFooters(doc: jsPDF, schoolName: string) {
  const pw = doc.internal.pageSize.getWidth();
  const total = doc.getNumberOfPages();

  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(ML, ph - 18, pw - MR, ph - 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.text(
      `Formel — Système de gestion scolaire  ·  ${schoolName}  ·  Document généré automatiquement`,
      ML, ph - 12,
    );
    doc.text(`Page ${p} / ${total}`, pw - MR, ph - 12, { align: 'right' });
  }
}

// ── Section label helper ─────────────────────────────────

function sectionLabel(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(text, ML, y);
  return y + 7;
}

// ── Shared: draw KPI summary cards ───────────────────────

function drawSummaryCards(
  doc: jsPDF,
  y: number,
  cards: { label: string; value: string; color: readonly [number, number, number] }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const cw = pw - ML - MR;
  const cardCount = cards.length;
  const gap = 4;
  const cardW = (cw - (cardCount - 1) * gap) / cardCount;
  const cardH = 28;

  cards.forEach((card, i) => {
    const x = ML + i * (cardW + gap);

    doc.setFillColor(...C.bgCard);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(card.label, x + 5, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + 5, y + 21);
  });

  return y + cardH + 10;
}

// ── Shared: draw notes section ───────────────────────────

function drawNotes(doc: jsPDF, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  if (y + 40 > ph - 30) return y;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(ML, y, pw - MR, y);
  y += 8;

  y = sectionLabel(doc, 'NOTES', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMed);

  const notes = [
    'Ce document est un relevé non-officiel généré à titre informatif.',
    'Les montants affichés reflètent les données enregistrées dans le système à la date de génération.',
    'Pour toute question, veuillez contacter l\'administration de l\'établissement.',
  ];
  notes.forEach((note, i) => {
    doc.text(`•  ${note}`, ML, y + i * 5);
  });

  return y + notes.length * 5 + 4;
}

// ══════════════════════════════════════════════════════════
// ANNUAL REPORT
// ══════════════════════════════════════════════════════════

export interface AnnualReportData {
  summary: FinanceSummary;
  groupBreakdown: GroupBreakdown[];
  monthlyPayments: MonthlyPayment[];
  versementDetails: {
    groupName: string;
    versements: {
      name: string;
      dueDate: string;
      finance: VersementFinance;
    }[];
  }[];
}

export function generateAnnualReportPdf(
  data: AnnualReportData,
  settings: SchoolSettings | undefined,
  schoolYear: string,
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const currency = settings?.currency || 'HTG';
  const schoolName = settings?.schoolName || 'Formel';

  let y = drawHeader(doc, settings, 'RAPPORT FINANCIER', `Année scolaire ${schoolYear}`);

  // ── 1. KPI Summary ─────────────────────────────────────

  y = sectionLabel(doc, 'RÉSUMÉ FINANCIER', y);

  const collectionRate = data.summary.total_expected > 0
    ? Math.round((data.summary.total_collected / data.summary.total_expected) * 100)
    : 0;

  y = drawSummaryCards(doc, y, [
    { label: 'Total attendu', value: fmtAmount(data.summary.total_expected, currency), color: C.primary },
    { label: `Total collecté (${collectionRate}%)`, value: fmtAmount(data.summary.total_collected, currency), color: C.green },
    { label: 'Restant à collecter', value: fmtAmount(data.summary.total_remaining, currency), color: data.summary.total_remaining > 0 ? C.orange : C.green },
    { label: 'Total bourses', value: fmtAmount(data.summary.total_scholarships, currency), color: C.blue },
  ]);

  // ── 2. Collection by Group ─────────────────────────────

  y = sectionLabel(doc, 'RECOUVREMENT PAR GROUPE', y);

  const groupRows = data.groupBreakdown.map((g) => [
    g.name,
    String(g.studentCount),
    fmtAmount(g.expected, currency),
    fmtAmount(g.collected, currency),
    fmtAmount(g.remaining, currency),
    pct(g.collected, g.expected),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Groupe', 'Élèves', 'Attendu', 'Collecté', 'Restant', 'Taux']],
    body: groupRows,
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: C.textDark as unknown as number[],
      lineWidth: 0,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: C.primary as unknown as number[],
      textColor: C.white as unknown as number[],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: C.bgLight as unknown as number[],
    },
    margin: { left: ML, right: MR },
    showHead: 'everyPage',
    didParseCell(cellData) {
      const col = cellData.column.index;
      if (col >= 2 && col <= 4) cellData.cell.styles.halign = 'right';
      if (col === 5) {
        cellData.cell.styles.halign = 'center';
        cellData.cell.styles.fontStyle = 'bold';
        if (cellData.section === 'body') {
          const g = data.groupBreakdown[cellData.row.index];
          if (g) {
            cellData.cell.styles.textColor = [...rateColor(g.collected, g.expected)] as [number, number, number];
          }
        }
      }
    },
    didDrawCell(cellData) {
      if (cellData.section === 'body') {
        const { x, y: cy, width, height } = cellData.cell;
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.15);
        doc.line(x, cy + height, x + width, cy + height);
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 30;
  y += 10;

  // ── 3. Versement Breakdown per Group ───────────────────

  for (const group of data.versementDetails) {
    if (group.versements.length === 0) continue;

    // Check if we need a new page (need ~60px minimum)
    if (y + 60 > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }

    y = sectionLabel(doc, group.groupName.toUpperCase(), y);

    const today = new Date();
    const versRows = group.versements.map((v) => {
      const due = new Date(v.dueDate);
      const rate = v.finance.versement_expected > 0
        ? Math.round((v.finance.total_collected / v.finance.versement_expected) * 100)
        : 0;
      let status = 'À venir';
      if (due < today && rate < 100) status = 'En retard';
      else if (rate > 0 && rate < 100) status = 'En cours';
      else if (rate >= 100) status = 'Complété';

      return { cells: [
        v.name,
        fmtDate(v.dueDate),
        fmtAmount(v.finance.versement_expected, currency),
        fmtAmount(v.finance.total_collected, currency),
        `${rate}%`,
        status,
      ], rate, status };
    });

    autoTable(doc, {
      startY: y,
      head: [['Versement', 'Échéance', 'Attendu', 'Collecté', 'Taux', 'Statut']],
      body: versRows.map((r) => r.cells),
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        textColor: C.textDark as unknown as number[],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: C.bgCard as unknown as number[],
        textColor: C.primary as unknown as number[],
        fontStyle: 'bold',
        fontSize: 6.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      },
      alternateRowStyles: {
        fillColor: C.bgLight as unknown as number[],
      },
      margin: { left: ML, right: MR },
      showHead: 'everyPage',
      didParseCell(cellData) {
        const col = cellData.column.index;
        if (col >= 2 && col <= 3) cellData.cell.styles.halign = 'right';
        if (col === 4) {
          cellData.cell.styles.halign = 'center';
          cellData.cell.styles.fontStyle = 'bold';
        }
        if (col === 5 && cellData.section === 'body') {
          cellData.cell.styles.halign = 'center';
          cellData.cell.styles.fontStyle = 'bold';
          const row = versRows[cellData.row.index];
          if (row) {
            if (row.status === 'En retard') cellData.cell.styles.textColor = [...C.red] as [number, number, number];
            else if (row.status === 'En cours') cellData.cell.styles.textColor = [...C.blue] as [number, number, number];
            else if (row.status === 'Complété') cellData.cell.styles.textColor = [...C.green] as [number, number, number];
            else cellData.cell.styles.textColor = [...C.textMuted] as [number, number, number];
          }
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 20;
    y += 10;
  }

  // ── 4. Monthly Collection Trend ────────────────────────

  if (data.monthlyPayments.length > 0) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }

    y = sectionLabel(doc, 'ÉVOLUTION MENSUELLE DES RECETTES', y);

    let cumCollected = 0;
    const monthRows = data.monthlyPayments.map((m) => {
      cumCollected += m.collected;
      return [
        monthLabel(m.month),
        fmtAmount(m.collected, currency),
        fmtAmount(m.pending, currency),
        fmtAmount(cumCollected, currency),
        String(m.count),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Mois', 'Collecté', 'En attente', 'Cumul collecté', 'Nb. paiements']],
      body: monthRows,
      theme: 'plain',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        textColor: C.textDark as unknown as number[],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: C.primary as unknown as number[],
        textColor: C.white as unknown as number[],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: C.bgLight as unknown as number[],
      },
      margin: { left: ML, right: MR },
      showHead: 'everyPage',
      didParseCell(cellData) {
        const col = cellData.column.index;
        if (col >= 1 && col <= 3) cellData.cell.styles.halign = 'right';
        if (col === 3) cellData.cell.styles.fontStyle = 'bold';
        if (col === 4) cellData.cell.styles.halign = 'center';
      },
      didDrawCell(cellData) {
        if (cellData.section === 'body') {
          const { x, y: cy, width, height } = cellData.cell;
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.15);
          doc.line(x, cy + height, x + width, cy + height);
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 20;
    y += 10;
  }

  // ── 5. Notes ───────────────────────────────────────────

  drawNotes(doc, y);

  // ── 6. Footer ──────────────────────────────────────────

  drawFooters(doc, schoolName);

  // ── Save ───────────────────────────────────────────────

  const yearSlug = schoolYear.replace(/\s+/g, '').replace(/\//g, '-');
  doc.save(`rapport_financier_${yearSlug}.pdf`);
}

// ══════════════════════════════════════════════════════════
// MONTHLY REPORT
// ══════════════════════════════════════════════════════════

export interface MonthlyReportData {
  summary: FinanceSummary;
  groupBreakdown: GroupBreakdown[];
  monthlyRow: MonthlyPayment | undefined;
}

export function generateMonthlyReportPdf(
  data: MonthlyReportData,
  settings: SchoolSettings | undefined,
  month: string, // YYYY-MM
) {
  const doc = new jsPDF();
  const currency = settings?.currency || 'HTG';
  const schoolName = settings?.schoolName || 'Formel';
  const label = monthLabel(month);

  let y = drawHeader(doc, settings, 'RAPPORT MENSUEL', label);

  // ── 1. KPI Summary ─────────────────────────────────────

  y = sectionLabel(doc, `RÉSUMÉ — ${label.toUpperCase()}`, y);

  y = drawSummaryCards(doc, y, [
    { label: 'Total collecté', value: fmtAmount(data.summary.total_collected, currency), color: C.green },
    { label: 'En attente', value: fmtAmount(data.summary.total_pending, currency), color: C.orange },
    { label: 'Nb. paiements', value: String(data.monthlyRow?.count ?? 0), color: C.primary },
    { label: 'Total bourses', value: fmtAmount(data.summary.total_scholarships, currency), color: C.blue },
  ]);

  // ── 2. Collection by Group (this month) ────────────────

  const activeGroups = data.groupBreakdown.filter((g) => g.collected > 0 || g.pending > 0);

  if (activeGroups.length > 0) {
    y = sectionLabel(doc, `RECOUVREMENT PAR GROUPE — ${label.toUpperCase()}`, y);

    const groupRows = activeGroups.map((g) => [
      g.name,
      String(g.studentCount),
      fmtAmount(g.collected, currency),
      fmtAmount(g.pending, currency),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Groupe', 'Élèves', 'Collecté', 'En attente']],
      body: groupRows,
      theme: 'plain',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        textColor: C.textDark as unknown as number[],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: C.primary as unknown as number[],
        textColor: C.white as unknown as number[],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: C.bgLight as unknown as number[],
      },
      margin: { left: ML, right: MR },
      didParseCell(cellData) {
        const col = cellData.column.index;
        if (col >= 2) cellData.cell.styles.halign = 'right';
        if (col === 2 && cellData.section === 'body') cellData.cell.styles.fontStyle = 'bold';
      },
      didDrawCell(cellData) {
        if (cellData.section === 'body') {
          const { x, y: cy, width, height } = cellData.cell;
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.15);
          doc.line(x, cy + height, x + width, cy + height);
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 20;
    y += 10;
  }

  // ── 3. Notes ───────────────────────────────────────────

  drawNotes(doc, y);

  // ── 4. Footer ──────────────────────────────────────────

  drawFooters(doc, schoolName);

  // ── Save ───────────────────────────────────────────────

  const [yr, mm] = month.split('-');
  const monthSlug = (MONTH_LABELS[mm] || mm).toLowerCase();
  doc.save(`rapport_financier_${monthSlug}_${yr}.pdf`);
}
