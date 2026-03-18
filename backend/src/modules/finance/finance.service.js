const { eq, and, sum } = require('drizzle-orm');
const { db } = require('../../config/database');
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

async function getSummary({ classId, classGroupId }) {
  // Get active school year
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) {
    throw new AppError(404, 'No active school year');
  }

  // Build enrollment conditions
  const conditions = [eq(enrollments.schoolYearId, activeYear.id)];
  if (classId) conditions.push(eq(enrollments.classId, classId));
  if (classGroupId) conditions.push(eq(classes.classGroupId, classGroupId));

  // Get all enrollments with class info
  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
      classGroupId: classes.classGroupId,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(...conditions));

  const studentCount = enrollmentData.length;

  if (studentCount === 0) {
    return { total_expected: 0, total_collected: 0, total_remaining: 0, student_count: 0 };
  }

  // Cache versement totals + bookFees per classGroup
  const groupTuitionCache = {};
  async function getGroupTuition(cgId) {
    if (groupTuitionCache[cgId]) return groupTuitionCache[cgId];

    const versementList = await db
      .select({ amount: versements.amount })
      .from(versements)
      .where(and(
        eq(versements.classGroupId, cgId),
        eq(versements.schoolYearId, activeYear.id),
      ));

    const [feeConfig] = await db
      .select({ bookFee: feeConfigs.bookFee })
      .from(feeConfigs)
      .where(and(
        eq(feeConfigs.classGroupId, cgId),
        eq(feeConfigs.schoolYearId, activeYear.id),
      ));

    const versementsTotal = versementList.reduce((s, v) => s + Number(v.amount), 0);
    const bookFee = feeConfig ? Number(feeConfig.bookFee) : 0;
    groupTuitionCache[cgId] = versementsTotal + bookFee;
    return groupTuitionCache[cgId];
  }

  // Get scholarships
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    scholarshipMap[s.enrollmentId] = s;
  }

  // Compute total expected (after scholarships)
  let totalExpected = 0;
  for (const e of enrollmentData) {
    const tuition = await getGroupTuition(e.classGroupId);
    const discount = computeDiscount(scholarshipMap[e.enrollmentId], tuition);
    totalExpected += tuition - discount;
  }

  // Compute total collected (all completed payments)
  let totalCollected = 0;
  for (const e of enrollmentData) {
    const [{ paid }] = await db
      .select({ paid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.status, 'completed'),
      ));
    totalCollected += Number(paid || 0);
  }

  return {
    total_expected: Math.round(totalExpected * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_remaining: Math.round((totalExpected - totalCollected) * 100) / 100,
    student_count: studentCount,
  };
}

async function getVersementFinance(versementId) {
  // Get the versement
  const [versement] = await db
    .select()
    .from(versements)
    .where(eq(versements.id, versementId));

  if (!versement) {
    throw new AppError(404, 'Versement not found');
  }

  // Get all versements for this group + year (needed to compute discount ratio)
  const allVersements = await db
    .select()
    .from(versements)
    .where(and(
      eq(versements.classGroupId, versement.classGroupId),
      eq(versements.schoolYearId, versement.schoolYearId),
    ))
    .orderBy(versements.number);

  const [feeConfig] = await db
    .select({ bookFee: feeConfigs.bookFee })
    .from(feeConfigs)
    .where(and(
      eq(feeConfigs.classGroupId, versement.classGroupId),
      eq(feeConfigs.schoolYearId, versement.schoolYearId),
    ));

  const versementsTotal = allVersements.reduce((s, v) => s + Number(v.amount), 0);
  const bookFee = feeConfig ? Number(feeConfig.bookFee) : 0;
  const totalTuition = versementsTotal + bookFee;

  // Get all enrollments for this school year where class belongs to this class group
  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(enrollments.schoolYearId, versement.schoolYearId),
      eq(classes.classGroupId, versement.classGroupId),
    ));

  const studentCount = enrollmentData.length;

  if (studentCount === 0) {
    return { versement_expected: 0, total_collected: 0, total_remaining: 0, student_count: 0 };
  }

  // Get scholarships
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    scholarshipMap[s.enrollmentId] = s;
  }

  // Compute expected for this versement across all students
  const versementAmount = Number(versement.amount);
  let versementExpected = 0;

  for (const e of enrollmentData) {
    const discount = computeDiscount(scholarshipMap[e.enrollmentId], totalTuition);
    const discountRatio = totalTuition > 0 ? discount / totalTuition : 0;
    const effectiveAmount = versementAmount * (1 - discountRatio);
    versementExpected += effectiveAmount;
  }

  // Compute how much has been collected toward this specific versement
  // For each enrollment: sum non-book completed payments, allocate to versements in order
  let totalCollected = 0;

  for (const e of enrollmentData) {
    const discount = computeDiscount(scholarshipMap[e.enrollmentId], totalTuition);
    const discountRatio = totalTuition > 0 ? discount / totalTuition : 0;

    // Get total non-book payments for this enrollment
    const [{ nonBookPaid }] = await db
      .select({ nonBookPaid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.status, 'completed'),
        eq(payments.isBookPayment, false),
      ));

    let remaining = Number(nonBookPaid || 0);

    // Allocate to versements in order until we reach the target versement
    for (const v of allVersements) {
      const effectiveAmount = Number(v.amount) * (1 - discountRatio);
      const allocated = Math.min(remaining, effectiveAmount);
      remaining -= allocated;

      if (v.id === versement.id) {
        totalCollected += allocated;
        break;
      }
    }
  }

  return {
    versement_expected: Math.round(versementExpected * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_remaining: Math.round((versementExpected - totalCollected) * 100) / 100,
    student_count: studentCount,
  };
}

module.exports = { getSummary, getVersementFinance };
