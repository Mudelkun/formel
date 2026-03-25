const { eq, and, sum, inArray } = require('drizzle-orm');
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
    const rawRemaining = Math.round((due - paid) * 100) / 100;
    const dueDate = new Date(v.dueDate + 'T23:59:59');

    return {
      id: v.id,
      number: v.number,
      name: v.name,
      amount: v.amount,
      effectiveAmount: due,
      dueDate: v.dueDate,
      amountPaid: Math.round(paid * 100) / 100,
      amountRemaining: Math.max(0, rawRemaining),
      isPaidInFull: paid >= due,
      isOverdue: rawRemaining > 0 && now > dueDate,
    };
  });
  // remaining now holds the tuition surplus (if any)
  const tuitionSurplus = Math.round(Math.max(0, remaining) * 100) / 100;

  // Book balance
  const bookAmountRemaining = Math.round((effectiveBookFee - totalBookPaid) * 100) / 100;
  const bookSurplus = Math.round(Math.max(0, -bookAmountRemaining) * 100) / 100;

  // Find current (first unpaid) versement
  const currentVersement = versementDetails.find((v) => !v.isPaidInFull) || null;

  // Derive total discount from effective amounts (most accurate)
  const effectiveTuitionTotal = effectiveVersements.reduce((s, v) => s + v.effectiveAmount, 0);
  const totalDiscount = Math.round((totalTuition - effectiveTuitionTotal - effectiveBookFee) * 100) / 100;
  const amountDue = Math.round((effectiveTuitionTotal + effectiveBookFee) * 100) / 100;
  const totalPaid = Math.round((totalNonBookPaid + totalBookPaid) * 100) / 100;
  const totalRemaining = Math.max(0, Math.round((amountDue - totalPaid) * 100) / 100);
  const totalSurplus = Math.round(Math.max(0, totalPaid - amountDue) * 100) / 100;

  return {
    versements: versementDetails,
    books: {
      fee: bookFee,
      effectiveFee: effectiveBookFee,
      amountPaid: Math.round(totalBookPaid * 100) / 100,
      amountRemaining: Math.max(0, bookAmountRemaining),
      surplus: bookSurplus,
    },
    total: {
      tuition: totalTuition,
      scholarshipDiscount: Math.round(totalDiscount * 100) / 100,
      amountDue,
      amountPaid: totalPaid,
      amountRemaining: totalRemaining,
      tuitionSurplus,
      bookSurplus,
      surplus: totalSurplus,
    },
    currentVersement: currentVersement ? {
      number: currentVersement.number,
      name: currentVersement.name,
      amountRemaining: currentVersement.amountRemaining,
    } : null,
  };
}

async function transferCredit(studentId, { from, amount }) {
  // Get current balance to validate surplus
  const balance = await getBalance(studentId);

  const surplus = from === 'tuition' ? balance.total.tuitionSurplus : balance.total.bookSurplus;
  if (amount > surplus) {
    throw new AppError(400, `Crédit insuffisant. Crédit disponible : ${surplus}`);
  }

  // Find enrollment for active school year
  const [enrollment] = await db
    .select({ enrollmentId: enrollments.id })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(schoolYears, and(
      eq(enrollments.schoolYearId, schoolYears.id),
      eq(schoolYears.isActive, true)
    ))
    .where(eq(enrollments.studentId, studentId));

  if (!enrollment) {
    throw new AppError(404, 'Aucune inscription active');
  }

  const today = new Date().toISOString().split('T')[0];
  const isFromBooks = from === 'books';

  // Create two payment records in a transaction:
  // 1. Negative on the source side (reduces surplus)
  // 2. Positive on the destination side (applies credit)
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      enrollmentId: enrollment.enrollmentId,
      amount: String(-amount),
      paymentDate: today,
      paymentMethod: 'credit_transfer',
      isBookPayment: isFromBooks,
      status: 'completed',
      notes: `Transfert de crédit ${isFromBooks ? 'livres → scolarité' : 'scolarité → livres'}`,
    });
    await tx.insert(payments).values({
      enrollmentId: enrollment.enrollmentId,
      amount: String(amount),
      paymentDate: today,
      paymentMethod: 'credit_transfer',
      isBookPayment: !isFromBooks,
      status: 'completed',
      notes: `Transfert de crédit ${isFromBooks ? 'livres → scolarité' : 'scolarité → livres'}`,
    });
  });

  // Return refreshed balance
  return getBalance(studentId);
}

/**
 * Bulk balance computation for multiple students.
 *
 * Replaces N×6 sequential getBalance() calls with 5 parallel bulk queries
 * + O(N) in-memory computation. Total DB round trips: O(1).
 *
 * @param {Array<{enrollmentId, studentId, classGroupId, schoolYearId}>} enrollmentData
 * @param {string} activeYearId
 * @returns {Promise<Map<studentId, balance>>}
 */
async function getBulkBalances(enrollmentData, activeYearId) {
  if (enrollmentData.length === 0) return new Map();

  const classGroupIds = [...new Set(enrollmentData.map((e) => e.classGroupId))];
  const enrollmentIds = enrollmentData.map((e) => e.enrollmentId);

  // 5 queries fired in parallel — independent of N
  const [versementList, feeConfigList, scholarshipList, nonBookSums, bookSums] = await Promise.all([
    db.select()
      .from(versements)
      .where(and(inArray(versements.classGroupId, classGroupIds), eq(versements.schoolYearId, activeYearId)))
      .orderBy(versements.number),

    db.select()
      .from(feeConfigs)
      .where(and(inArray(feeConfigs.classGroupId, classGroupIds), eq(feeConfigs.schoolYearId, activeYearId))),

    db.select()
      .from(scholarships)
      .where(inArray(scholarships.enrollmentId, enrollmentIds)),

    db.select({ enrollmentId: payments.enrollmentId, total: sum(payments.amount) })
      .from(payments)
      .where(and(inArray(payments.enrollmentId, enrollmentIds), eq(payments.status, 'completed'), eq(payments.isBookPayment, false)))
      .groupBy(payments.enrollmentId),

    db.select({ enrollmentId: payments.enrollmentId, total: sum(payments.amount) })
      .from(payments)
      .where(and(inArray(payments.enrollmentId, enrollmentIds), eq(payments.status, 'completed'), eq(payments.isBookPayment, true)))
      .groupBy(payments.enrollmentId),
  ]);

  // Build lookup maps for O(1) access per student
  const versementsByGroup = new Map();
  for (const v of versementList) {
    if (!versementsByGroup.has(v.classGroupId)) versementsByGroup.set(v.classGroupId, []);
    versementsByGroup.get(v.classGroupId).push(v);
  }
  const feeConfigByGroup = new Map(feeConfigList.map((f) => [f.classGroupId, f]));
  const scholarshipsByEnrollment = new Map();
  for (const s of scholarshipList) {
    if (!scholarshipsByEnrollment.has(s.enrollmentId)) scholarshipsByEnrollment.set(s.enrollmentId, []);
    scholarshipsByEnrollment.get(s.enrollmentId).push(s);
  }
  const nonBookPaidMap = new Map(nonBookSums.map((r) => [r.enrollmentId, Number(r.total || 0)]));
  const bookPaidMap = new Map(bookSums.map((r) => [r.enrollmentId, Number(r.total || 0)]));

  const result = new Map();
  const now = new Date();

  // O(N) in-memory computation — no further DB calls
  for (const { enrollmentId, studentId, classGroupId } of enrollmentData) {
    const feeConfig = feeConfigByGroup.get(classGroupId);
    const bookFee = feeConfig ? Number(feeConfig.bookFee) : 0;
    const versementsForGroup = versementsByGroup.get(classGroupId) || [];
    const enrollmentScholarships = scholarshipsByEnrollment.get(enrollmentId) || [];
    const totalNonBookPaid = nonBookPaidMap.get(enrollmentId) || 0;
    const totalBookPaid = bookPaidMap.get(enrollmentId) || 0;

    const versementsTotal = versementsForGroup.reduce((s, v) => s + Number(v.amount), 0);
    const { proportionalDiscount, versementAnnulations, bookAnnulation } = computeDiscounts(enrollmentScholarships, versementsTotal);
    const discountRatio = versementsTotal > 0 ? Math.min(proportionalDiscount, versementsTotal) / versementsTotal : 0;
    const effectiveBookFee = Math.max(0, Math.round((bookFee - Math.min(bookAnnulation, bookFee)) * 100) / 100);

    const effectiveVersements = versementsForGroup.map((v) => {
      const baseEffective = Number(v.amount) * (1 - discountRatio);
      const annulation = versementAnnulations.get(v.id) || 0;
      return { ...v, effectiveAmount: Math.max(0, Math.round((baseEffective - annulation) * 100) / 100) };
    });

    let remaining = totalNonBookPaid;
    const versementDetails = effectiveVersements.map((v) => {
      const due = v.effectiveAmount;
      const paid = Math.min(remaining, due);
      remaining -= paid;
      const rawRemaining = Math.round((due - paid) * 100) / 100;
      const dueDate = new Date(v.dueDate + 'T23:59:59');
      return {
        id: v.id,
        number: v.number,
        name: v.name,
        amount: v.amount,
        effectiveAmount: due,
        dueDate: v.dueDate,
        amountPaid: Math.round(paid * 100) / 100,
        amountRemaining: Math.max(0, rawRemaining),
        isPaidInFull: paid >= due,
        isOverdue: rawRemaining > 0 && now > dueDate,
      };
    });

    const tuitionSurplus = Math.round(Math.max(0, remaining) * 100) / 100;
    const bookAmountRemaining = Math.round((effectiveBookFee - totalBookPaid) * 100) / 100;
    const bookSurplus = Math.round(Math.max(0, -bookAmountRemaining) * 100) / 100;
    const effectiveTuitionTotal = effectiveVersements.reduce((s, v) => s + v.effectiveAmount, 0);
    const totalTuition = versementsTotal + bookFee;
    const totalDiscount = Math.round((totalTuition - effectiveTuitionTotal - effectiveBookFee) * 100) / 100;
    const amountDue = Math.round((effectiveTuitionTotal + effectiveBookFee) * 100) / 100;
    const totalPaid = Math.round((totalNonBookPaid + totalBookPaid) * 100) / 100;
    const totalRemaining = Math.max(0, Math.round((amountDue - totalPaid) * 100) / 100);
    const totalSurplus = Math.round(Math.max(0, totalPaid - amountDue) * 100) / 100;

    const currentVersement = versementDetails.find((v) => !v.isPaidInFull) || null;

    result.set(studentId, {
      versements: versementDetails,
      books: {
        fee: bookFee,
        effectiveFee: effectiveBookFee,
        amountPaid: Math.round(totalBookPaid * 100) / 100,
        amountRemaining: Math.max(0, bookAmountRemaining),
        surplus: bookSurplus,
      },
      total: {
        tuition: totalTuition,
        scholarshipDiscount: Math.round(totalDiscount * 100) / 100,
        amountDue,
        amountPaid: totalPaid,
        amountRemaining: totalRemaining,
        tuitionSurplus,
        bookSurplus,
        surplus: totalSurplus,
      },
      currentVersement: currentVersement
        ? { number: currentVersement.number, name: currentVersement.name, amountRemaining: currentVersement.amountRemaining }
        : null,
    });
  }

  return result;
}

module.exports = { getBalance, getBulkBalances, transferCredit, computeDiscounts, computeTotalDiscount };
