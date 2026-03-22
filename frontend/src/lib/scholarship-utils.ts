import type { CreateScholarshipInput, Scholarship } from '@/api/enrollments';
import type { ScholarshipConfig } from '@/components/students/ScholarshipForm';
import { EMPTY_CONFIG } from '@/components/students/ScholarshipForm';
import type { VersementDetail } from '@/types/student';

/**
 * Convert a ScholarshipConfig into the list of backend scholarship records to create.
 *
 * @param config  The form state
 * @param versements  Available versements (needed for annulations).
 *                    Pass [] when creating a student (versements don't exist yet).
 */
export function configToInputs(
  config: ScholarshipConfig,
  versements: VersementDetail[],
): CreateScholarshipInput[] {
  const out: CreateScholarshipInput[] = [];

  // ── Scholarship type ───────────────────────────
  if (config.type === 'complete') {
    out.push({ type: 'partial', percentage: 100 });
    out.push({ type: 'book_annulation', fixedAmount: '999999' });
  } else if (config.type === 'tuition') {
    out.push({ type: 'partial', percentage: 100 });
  }

  // ── Versement annulations ──────────────────────
  if (config.versementCancel === 'all') {
    for (const v of versements) {
      out.push({
        type: 'versement_annulation',
        fixedAmount: String(v.amount),
        targetVersementId: v.id,
      });
    }
  } else if (config.versementCancel === 'pick') {
    for (const id of config.pickedVersementIds) {
      const v = versements.find((x) => x.id === id);
      if (v) {
        out.push({
          type: 'versement_annulation',
          fixedAmount: String(v.amount),
          targetVersementId: v.id,
        });
      }
    }
  }

  // ── Book waiver (only when not already covered by "complete") ──
  if (config.waiveBooks && config.type !== 'complete') {
    out.push({ type: 'book_annulation', fixedAmount: '999999' });
  }

  return out;
}

/**
 * Reverse-map existing backend scholarship records back to a ScholarshipConfig
 * so we can populate the form for editing.
 */
export function recordsToConfig(
  records: Scholarship[],
  allVersementIds: string[],
): ScholarshipConfig {
  const config: ScholarshipConfig = { ...EMPTY_CONFIG };

  const partial100 = records.some((r) => r.type === 'partial' && Number(r.percentage) >= 100);
  const bookAnnulation = records.some((r) => r.type === 'book_annulation');
  const versAnnulations = records.filter((r) => r.type === 'versement_annulation');

  // Determine type
  if (partial100 && bookAnnulation) {
    config.type = 'complete';
  } else if (partial100) {
    config.type = 'tuition';
  }

  // Determine versement cancellation
  if (versAnnulations.length > 0) {
    const cancelledIds = versAnnulations
      .map((r) => r.targetVersementId)
      .filter(Boolean) as string[];

    if (allVersementIds.length > 0 && cancelledIds.length >= allVersementIds.length) {
      config.versementCancel = 'all';
    } else {
      config.versementCancel = 'pick';
      config.pickedVersementIds = cancelledIds;
    }
  }

  // Book waiver (only mark if not already part of "complete")
  if (bookAnnulation && config.type !== 'complete') {
    config.waiveBooks = true;
  }

  return config;
}
