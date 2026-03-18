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

function computeDiscount(scholarship, totalTuition) {
  if (!scholarship) return 0;
  switch (scholarship.type) {
    case 'full':
      return totalTuition;
    case 'partial':
      return totalTuition * (Number(scholarship.percentage) / 100);
    case 'fixed_amount':
      return Math.min(Number(scholarship.fixedAmount), totalTuition);
    default:
      return 0;
  }
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

  const versementsTotal = versementList.reduce((sum, v) => sum + Number(v.amount), 0);
  const totalTuition = versementsTotal + bookFee;

  // Get scholarship discount
  const [scholarship] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollment.enrollmentId));

  const discount = computeDiscount(scholarship, totalTuition);
  const discountRatio = totalTuition > 0 ? discount / totalTuition : 0;

  // Compute effective amounts after scholarship
  const effectiveBookFee = Math.round(bookFee * (1 - discountRatio) * 100) / 100;
  const effectiveVersements = versementList.map((v) => ({
    ...v,
    effectiveAmount: Math.round(Number(v.amount) * (1 - discountRatio) * 100) / 100,
  }));

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

  const amountDue = Math.round((totalTuition - discount) * 100) / 100;
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
      scholarshipDiscount: Math.round(discount * 100) / 100,
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

module.exports = { getBalance, computeDiscount };
