import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StudentDetail, BalanceResponse } from '@/types/student';
import type { SchoolSettings } from '@/api/settings';

interface Payment {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  isBookPayment: boolean;
  status: string;
  notes: string | null;
}

// ── Labels ───────────────────────────────────────────────

const methodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  mobile: 'Mobile',
  deposit: 'Dépôt bancaire',
  credit_transfer: 'Transfert de crédit',
};

const statusLabels: Record<string, string> = {
  completed: 'Confirmé',
  pending: 'En attente',
  failed: 'Rejeté',
};

// ── Colors ───────────────────────────────────────────────

const C = {
  primary:    [15, 23, 42]   as const,  // slate-900
  accent:     [37, 99, 235]  as const,  // blue-600
  textDark:   [17, 24, 39]   as const,  // gray-900
  textMed:    [75, 85, 99]   as const,  // gray-600
  textMuted:  [156, 163, 175] as const, // gray-400
  border:     [229, 231, 235] as const, // gray-200
  bgLight:    [248, 250, 252] as const, // slate-50
  bgCard:     [241, 245, 249] as const, // slate-100
  green:      [22, 163, 74]  as const,  // green-600
  orange:     [234, 88, 12]  as const,  // orange-600
  red:        [220, 38, 38]  as const,  // red-600
  blue:       [37, 99, 235]  as const,  // blue-600
  white:      [255, 255, 255] as const,
};

// ── Helpers ──────────────────────────────────────────────

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtDateShort(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtAmount(amount: string | number, currency: string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency}`;
  // Use en-US formatting then replace comma separator to avoid non-breaking
  // space issues in jsPDF with fr-FR locale
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num).replace(/,/g, ' ');
  return `${formatted} ${currency}`;
}

const M = { left: 20, right: 20 }; // margins

function contentWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth() - M.left - M.right;
}

// ── Status color helper ──────────────────────────────────

function statusColor(status: string): readonly [number, number, number] {
  switch (status) {
    case 'completed': return C.green;
    case 'pending':   return C.orange;
    case 'failed':    return C.red;
    default:          return C.textMuted;
  }
}

// ── Main export ──────────────────────────────────────────

export function generatePaymentHistoryPdf(
  student: StudentDetail,
  payments: Payment[],
  settings: SchoolSettings | undefined,
  balance: BalanceResponse | undefined,
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const cw = contentWidth(doc);
  const currency = settings?.currency || 'HTG';
  const schoolName = settings?.schoolName || 'Formel';
  const today = fmtDate(new Date().toISOString());

  let y = 0;

  // ═══════════════════════════════════════════════════════
  // 1. HEADER
  // ═══════════════════════════════════════════════════════

  // School name (left)
  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.primary);
  doc.text(schoolName, M.left, y);

  // School details below name
  const details: string[] = [];
  if (settings?.address) details.push(settings.address);
  if (settings?.phone) details.push(settings.phone);
  if (settings?.email) details.push(settings.email);
  if (details.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(details.join('  ·  '), M.left, y + 6);
  }

  // Document title (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.accent);
  doc.text('RELEVÉ DE PAIEMENTS', pw - M.right, y - 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(`Généré le ${today}`, pw - M.right, y + 3, { align: 'right' });

  // Separator
  y += 14;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(M.left, y, pw - M.right, y);

  // ═══════════════════════════════════════════════════════
  // 2. STUDENT INFORMATION
  // ═══════════════════════════════════════════════════════

  y += 12;

  // Section label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('INFORMATIONS ÉLÈVE', M.left, y);
  y += 8;

  const infoLeft = [
    ['Nom complet', `${student.firstName} ${student.lastName}`],
    ['NIE', student.nie || 'Non assigné'],
  ];

  const infoRight = [
    ['Classe', student.currentEnrollment?.className || '—'],
    ['Statut', student.status === 'active' ? 'Actif' : student.status],
  ];

  // Primary contact
  const primaryContact = student.contacts?.find((c) => c.isPrimary);
  if (primaryContact) {
    infoLeft.push(['Parent/Tuteur', `${primaryContact.firstName} ${primaryContact.lastName}`]);
    if (primaryContact.phone) infoRight.push(['Téléphone', primaryContact.phone]);
  }

  const midX = M.left + cw / 2 + 10;

  infoLeft.forEach(([label, value], i) => {
    const rowY = y + i * 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(label, M.left, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.textDark);
    doc.text(value, M.left + 38, rowY);
  });

  infoRight.forEach(([label, value], i) => {
    const rowY = y + i * 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(label, midX, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.textDark);
    doc.text(value, midX + 34, rowY);
  });

  y += Math.max(infoLeft.length, infoRight.length) * 11 + 6;

  // ═══════════════════════════════════════════════════════
  // 3. FINANCIAL SUMMARY
  // ═══════════════════════════════════════════════════════

  if (balance) {
    // Section label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text('RÉSUMÉ FINANCIER', M.left, y);
    y += 6;

    const cardW = (cw - 12) / 4; // 4 cards with 4px gaps
    const cardH = 28;

    const summaryCards = [
      { label: 'Total payé',   value: fmtAmount(balance.total.amountPaid, currency),            color: C.green },
      { label: 'Frais de livres payés', value: fmtAmount(balance.books.amountPaid, currency),       color: C.accent },
      { label: 'Solde restant', value: fmtAmount(balance.total.amountRemaining, currency),      color: balance.total.amountRemaining > 0 ? C.orange : C.green },
      { label: 'Bourse/Remise', value: fmtAmount(balance.total.scholarshipDiscount, currency),  color: C.blue },
    ];

    summaryCards.forEach((card, i) => {
      const x = M.left + i * (cardW + 4);

      // Card background
      doc.setFillColor(...C.bgCard);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.textMuted);
      doc.text(card.label, x + 6, y + 10);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.value, x + 6, y + 21);
    });

    y += cardH + 12;
  }

  // ═══════════════════════════════════════════════════════
  // 4. PAYMENT HISTORY TABLE
  // ═══════════════════════════════════════════════════════

  // Section label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('DÉTAIL DES TRANSACTIONS', M.left, y);
  y += 6;

  // Sort payments by date ascending for running balance
  const sorted = [...payments].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
  );

  // Compute total due for running balance
  const totalDue = balance?.total.amountDue ?? 0;
  let runningBalance = totalDue;

  const tableBody = sorted.map((p) => {
    const amt = parseFloat(p.amount);
    if (p.status === 'completed') {
      runningBalance -= amt;
    }
    return {
      cells: [
        fmtDateShort(p.paymentDate),
        p.isBookPayment ? 'Frais de livres' : 'Scolarité',
        methodLabels[p.paymentMethod || ''] || p.paymentMethod || '—',
        fmtAmount(amt, currency),
        statusLabels[p.status] || p.status,
        p.status === 'completed' ? fmtAmount(Math.max(0, runningBalance), currency) : '—',
      ],
      status: p.status,
    };
  });

  // Column widths sum exactly to 170mm (page 210 - margins 20+20)
  // 27 + 30 + 27 + 32 + 23 + 31 = 170
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Méthode', 'Montant', 'Statut', 'Solde restant']],
    body: tableBody.map((r) => r.cells),
    theme: 'plain',
    tableWidth: 170,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: C.textDark as unknown as [number, number, number],
      lineWidth: 0,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: C.primary as unknown as [number, number, number],
      textColor: C.white as unknown as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
    },
    alternateRowStyles: {
      fillColor: C.bgLight as unknown as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 30 },
      2: { cellWidth: 27 },
      3: { cellWidth: 32 },
      4: { cellWidth: 23 },
      5: { cellWidth: 31 },
    },
    margin: { left: M.left, right: M.right },
    showHead: 'everyPage',
    didParseCell(data) {
      const col = data.column.index;

      // Enforce alignment on every cell (head + body) so headers match data
      if (col === 3) {
        data.cell.styles.halign = 'right';
        if (data.section === 'body') data.cell.styles.fontStyle = 'bold';
      }
      if (col === 4) {
        data.cell.styles.halign = 'center';
      }
      if (col === 5) {
        data.cell.styles.halign = 'right';
      }

      // Status color
      if (data.section === 'body' && col === 4) {
        const row = tableBody[data.row.index];
        if (row) {
          data.cell.styles.textColor = [...statusColor(row.status)] as [number, number, number];
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Muted running balance
      if (data.section === 'body' && col === 5) {
        data.cell.styles.textColor = [...C.textMed] as [number, number, number];
      }
    },
    // Subtle bottom border on each body row
    didDrawCell(data) {
      if (data.section === 'body') {
        const { x, y, width, height } = data.cell;
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(x, y + height, x + width, y + height);
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY: number = (doc as any).lastAutoTable?.finalY ?? y + 40;

  // ═══════════════════════════════════════════════════════
  // 5. NOTES
  // ═══════════════════════════════════════════════════════

  finalY += 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Only add notes if there's room on this page
  if (finalY + 40 < pageHeight - 30) {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(M.left, finalY, pw - M.right, finalY);
    finalY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text('NOTES', M.left, finalY);
    finalY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMed);

    const notes = [
      'Ce document est un relevé non-officiel généré à titre informatif.',
      'Les montants affichés reflètent les paiements enregistrés dans le système à la date de génération.',
      'Pour toute question, veuillez contacter l\'administration de l\'établissement.',
    ];

    notes.forEach((note, i) => {
      doc.text(`•  ${note}`, M.left, finalY + i * 5);
    });
  }

  // ═══════════════════════════════════════════════════════
  // 6. FOOTER (every page)
  // ═══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();

    // Footer line
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M.left, ph - 18, pw - M.right, ph - 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);

    // Left: system + authenticity
    doc.text(`Formel — Système de gestion scolaire  ·  Document généré automatiquement`, M.left, ph - 12);

    // Right: page number
    doc.text(`Page ${p} / ${totalPages}`, pw - M.right, ph - 12, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════

  const fileName = `releve_paiements_${student.lastName}_${student.firstName}.pdf`.replace(/\s+/g, '_');
  doc.save(fileName);
}
