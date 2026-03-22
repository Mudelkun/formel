const { eq, and, sum } = require('drizzle-orm');
const { db } = require('../../config/database');
const { students } = require('../../db/schema/students');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { payments } = require('../../db/schema/payments');
const { feeConfigs } = require('../../db/schema/feeConfigs');
const { versements } = require('../../db/schema/versements');
const { AppError } = require('../../lib/apiError');

/**
 * Compute discount components from multiple scholarships.
 *
 * IMPORTANT: proportionalDiscount is a ratio (0–1) applied ONLY to versements.
 * Books are only affected by explicit book_annulation records.
 *
 * @param scholarshipList  Array of scholarship records
 * @param versementsTotal  Sum of all versement amounts (excluding books)
 * @returns { proportionalDiscount, versementAnnulations: Map<versementId, amount>, bookAnnulation: amount }
 */
function computeDiscounts(scholarshipList, versementsTotal) {
  let proportionalDiscount = 0;
  const versementAnnulations = new Map();
  let bookAnnulation = 0;

  for (const s of scholarshipList) {
    switch (s.type) {
      case 'full':
        proportionalDiscount += versementsTotal;
        break;
      case 'partial':
        proportionalDiscount += versementsTotal * (Number(s.percentage) / 100);
        break;
      case 'fixed_amount':
        proportionalDiscount += Math.min(Number(s.fixedAmount), versementsTotal);
        break;
      case 'versement_annulation': {
        const current = versementAnnulations.get(s.targetVersementId) || 0;
        versementAnnulations.set(s.targetVersementId, current + Number(s.fixedAmount));
        break;
      }
      case 'book_annulation':
        bookAnnulation += Number(s.fixedAmount);
        break;
    }
  }

  return { proportionalDiscount, versementAnnulations, bookAnnulation };
}

/**
 * Simple total discount for finance summaries (flattens all scholarship types into a single number).
 *
 * @param scholarshipList  Array of scholarship records
 * @param versementsTotal  Sum of all versement amounts (excluding books)
 * @param bookFee          The book fee amount
 */
function computeTotalDiscount(scholarshipList, versementsTotal, bookFee) {
  const { proportionalDiscount, versementAnnulations, bookAnnulation } = computeDiscounts(scholarshipList, versementsTotal);

  // Proportional discount capped at versements total
  let total = Math.min(proportionalDiscount, versementsTotal);

  // Versement annulations (each capped at its versement amount implicitly)
  for (const amount of versementAnnulations.values()) {
    total += amount;
  }

  // Book annulation capped at actual book fee
  total += Math.min(bookAnnulation, bookFee);

  return Math.min(total, versementsTotal + bookFee);
}

async function getBalance(studentId) {
  // Verify student exists
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Find enrollment for active school year
  const [enrollment] = await db
    .select({
      enrollmentId: enrollments.id,
      schoolYearId: enrollments.schoolYearId,
      classGroupId: classes.classGroupId,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(schoolYears, and(
      eq(enrollments.schoolYearId, schoolYears.id),
      eq(schoolYears.isActive, true)
    ))
    .where(eq(enrollments.studentId, studentId));

  if (!enrollment) {
    throw new AppError(404, 'Student has no enrollment for the active school year');
  }

  // Get fee config (bookFee) for this class group + school year
  const [feeConfig] = await db
    .select()
    .from(feeConfigs)
    .where(and(
      eq(feeConfigs.classGroupId, enrollment.classGroupId),
      eq(feeConfigs.schoolYearId, enrollment.schoolYearId),
    ));

  const bookFee = feeConfig ? Number(feeConfig.bookFee) : 0;

  // Get versements for this class group + school year
  const versementList = await db
    .select()
    .from(versements)
    .where(and(
      eq(versements.classGroupId, enrollment.classGroupId),
      eq(versements.schoolYearId, enrollment.schoolYearId),
    ))
    .orderBy(versements.number);

  const versementsTotal = versementList.reduce((s, v) => s + Number(v.amount), 0);
  const totalTuition = versementsTotal + bookFee;

  // Get ALL scholarships for this enrollment
  const scholarshipList = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollment.enrollmentId));

  // Proportional discount applies ONLY to versements, not books
  const { proportionalDiscount, versementAnnulations, bookAnnulation } = computeDiscounts(scholarshipList, versementsTotal);
  const discountRatio = versementsTotal > 0 ? Math.min(proportionalDiscount, versementsTotal) / versementsTotal : 0;

  // Books are only affected by explicit book_annulation, capped at actual bookFee
  const effectiveBookFee = Math.max(0, Math.round((bookFee - Math.min(bookAnnulation, bookFee)) * 100) / 100);

  // Versements affected by proportional discount AND individual annulations
  const effectiveVersements = versementList.map((v) => {
    const baseEffective = Number(v.amount) * (1 - discountRatio);
    const annulation = versementAnnulations.get(v.id) || 0;
    return {
      ...v,
      effectiveAmount: Math.max(0, Math.round((baseEffective - annulation) * 100) / 100),
    };
  });

  // Sum completed non-book payments
  const [{ nonBookPaid }] = await db
    .select({ nonBookPaid: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, enrollment.enrollmentId),
      eq(payments.status, 'completed'),
      eq(payments.isBookPayment, false),
    ));

  // Sum completed book payments
  const [{ bookPaid }] = await db
    .select({ bookPaid: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, enrollment.enrollmentId),
      eq(payments.status, 'completed'),
      eq(payments.isBookPayment, true),
    ));

  const totalNonBookPaid = Number(nonBookPaid || 0);
  const totalBookPaid = Number(bookPaid || 0);

  // Allocate non-book payments to versements in order
  let remaining = totalNonBookPaid;
  const now = new Date();
  const versementDetails = effectiveVersements.map((v) => {
    const due = v.effectiveAmount;
    const paid = Math.min(remaining, due);
    remaining -= paid;
    const amountRemaining = Math.round((due - paid) * 100) / 100;
    const dueDate = new Date(v.dueDate + 'T23:59:59');

    return {
      id: v.id,
      number: v.number,
      name: v.name,
      amount: v.amount,
      effectiveAmount: due,
      dueDate: v.dueDate,
      amountPaid: Math.round(paid * 100) / 100,
      amountRemaining,
      isPaidInFull: paid >= due,
      isOverdue: amountRemaining > 0 && now > dueDate,
    };
  });

  // Book balance
  const bookAmountRemaining = Math.round((effectiveBookFee - totalBookPaid) * 100) / 100;

  // Find current (first unpaid) versement
  const currentVersement = versementDetails.find((v) => !v.isPaidInFull) || null;

  // Derive total discount from effective amounts (most accurate)
  const effectiveTuitionTotal = effectiveVersements.reduce((s, v) => s + v.effectiveAmount, 0);
  const totalDiscount = Math.round((totalTuition - effectiveTuitionTotal - effectiveBookFee) * 100) / 100;
  const amountDue = Math.round((effectiveTuitionTotal + effectiveBookFee) * 100) / 100;
  const totalPaid = Math.round((totalNonBookPaid + totalBookPaid) * 100) / 100;

  return {
    versements: versementDetails,
    books: {
      fee: bookFee,
      effectiveFee: effectiveBookFee,
      amountPaid: Math.round(totalBookPaid * 100) / 100,
      amountRemaining: Math.max(0, bookAmountRemaining),
    },
    total: {
      tuition: totalTuition,
      scholarshipDiscount: Math.round(totalDiscount * 100) / 100,
      amountDue,
      amountPaid: totalPaid,
      amountRemaining: Math.round((amountDue - totalPaid) * 100) / 100,
    },
    currentVersement: currentVersement ? {
      number: currentVersement.number,
      name: currentVersement.name,
      amountRemaining: currentVersement.amountRemaining,
    } : null,
  };
}

module.exports = { getBalance, computeDiscounts, computeTotalDiscount };
