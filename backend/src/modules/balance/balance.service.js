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
 * Compute total discount from multiple scholarships.
 * Returns { proportionalDiscount, versementAnnulations: Map<versementId, amount>, bookAnnulation: amount }
 */
function computeDiscounts(scholarshipList, totalTuition) {
  let proportionalDiscount = 0;
  const versementAnnulations = new Map();
  let bookAnnulation = 0;

  for (const s of scholarshipList) {
    switch (s.type) {
      case 'full':
        proportionalDiscount += totalTuition;
        break;
      case 'partial':
        proportionalDiscount += totalTuition * (Number(s.percentage) / 100);
        break;
      case 'fixed_amount':
        proportionalDiscount += Math.min(Number(s.fixedAmount), totalTuition);
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
 */
function computeTotalDiscount(scholarshipList, totalTuition) {
  const { proportionalDiscount, versementAnnulations, bookAnnulation } = computeDiscounts(scholarshipList, totalTuition);
  let total = proportionalDiscount + bookAnnulation;
  for (const amount of versementAnnulations.values()) {
    total += amount;
  }
  return Math.min(total, totalTuition);
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

  const { proportionalDiscount, versementAnnulations, bookAnnulation } = computeDiscounts(scholarshipList, totalTuition);
  const discountRatio = totalTuition > 0 ? Math.min(proportionalDiscount, totalTuition) / totalTuition : 0;

  // Compute effective amounts after scholarships
  // First apply proportional discount, then subtract direct annulations
  const effectiveBookFee = Math.max(0, Math.round((bookFee * (1 - discountRatio) - bookAnnulation) * 100) / 100);
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

  const totalDiscount = computeTotalDiscount(scholarshipList, totalTuition);
  const amountDue = Math.round((totalTuition - totalDiscount) * 100) / 100;
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
