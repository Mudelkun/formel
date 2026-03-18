const { eq, and, sum, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { payments } = require('../../db/schema/payments');
const { quarters } = require('../../db/schema/quarters');
const { AppError } = require('../../lib/apiError');

function computeDiscount(scholarship, tuitionAmount) {
  if (!scholarship) return 0;
  switch (scholarship.type) {
    case 'full':
      return tuitionAmount;
    case 'partial':
      return tuitionAmount * (Number(scholarship.percentage) / 100);
    case 'fixed_amount':
      return Number(scholarship.fixedAmount);
    default:
      return 0;
  }
}

async function getSummary({ classId, quarterId }) {
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

  // Get all enrollments with class tuition
  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
      annualTuitionFee: classes.annualTuitionFee,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(...conditions));

  const studentCount = enrollmentData.length;

  if (studentCount === 0) {
    return { total_expected: 0, total_collected: 0, total_remaining: 0, student_count: 0 };
  }

  // Get scholarships for these enrollments
  const enrollmentIds = enrollmentData.map((e) => e.enrollmentId);
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    scholarshipMap[s.enrollmentId] = s;
  }

  // Compute total expected (after scholarships)
  let totalExpected = 0;
  for (const e of enrollmentData) {
    const tuition = Number(e.annualTuitionFee);
    const discount = computeDiscount(scholarshipMap[e.enrollmentId], tuition);
    totalExpected += tuition - discount;
  }

  // If quarterId filter, divide by quarter count
  let quarterDivisor = 1;
  if (quarterId) {
    const [{ qCount }] = await db
      .select({ qCount: count() })
      .from(quarters)
      .where(eq(quarters.schoolYearId, activeYear.id));

    if (Number(qCount) === 0) {
      throw new AppError(400, 'No quarters defined for the active school year');
    }
    quarterDivisor = Number(qCount);
    totalExpected = totalExpected / quarterDivisor;
  }

  // Compute total collected
  let totalCollected = 0;
  for (const e of enrollmentData) {
    const paymentConditions = [
      eq(payments.enrollmentId, e.enrollmentId),
      eq(payments.status, 'completed'),
    ];
    if (quarterId) paymentConditions.push(eq(payments.quarterId, quarterId));

    const [{ paid }] = await db
      .select({ paid: sum(payments.amount) })
      .from(payments)
      .where(and(...paymentConditions));

    totalCollected += Number(paid || 0);
  }

  return {
    total_expected: Math.round(totalExpected * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_remaining: Math.round((totalExpected - totalCollected) * 100) / 100,
    student_count: studentCount,
  };
}

async function getQuarterFinance(quarterId) {
  // Get the quarter
  const [quarter] = await db
    .select()
    .from(quarters)
    .where(eq(quarters.id, quarterId));

  if (!quarter) {
    throw new AppError(404, 'Quarter not found');
  }

  // Get quarter count for the school year
  const [{ qCount }] = await db
    .select({ qCount: count() })
    .from(quarters)
    .where(eq(quarters.schoolYearId, quarter.schoolYearId));

  const numQuarters = Number(qCount);

  // Get all enrollments for this school year with tuition
  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
      annualTuitionFee: classes.annualTuitionFee,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(enrollments.schoolYearId, quarter.schoolYearId));

  const studentCount = enrollmentData.length;

  if (studentCount === 0) {
    return { quarter_tuition: 0, total_collected: 0, total_remaining: 0, student_count: 0 };
  }

  // Get scholarships
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    scholarshipMap[s.enrollmentId] = s;
  }

  // Compute total expected for this quarter
  let quarterTuition = 0;
  for (const e of enrollmentData) {
    const tuition = Number(e.annualTuitionFee);
    const discount = computeDiscount(scholarshipMap[e.enrollmentId], tuition);
    quarterTuition += (tuition - discount) / numQuarters;
  }

  // Total collected for this quarter
  let totalCollected = 0;
  for (const e of enrollmentData) {
    const [{ paid }] = await db
      .select({ paid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.quarterId, quarterId),
        eq(payments.status, 'completed'),
      ));
    totalCollected += Number(paid || 0);
  }

  return {
    quarter_tuition: Math.round(quarterTuition * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_remaining: Math.round((quarterTuition - totalCollected) * 100) / 100,
    student_count: studentCount,
  };
}

module.exports = { getSummary, getQuarterFinance };
