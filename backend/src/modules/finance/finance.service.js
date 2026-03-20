const { eq, and, sum, count, gte, desc } = require('drizzle-orm');
const { db } = require('../../config/database');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { payments } = require('../../db/schema/payments');
const { feeConfigs } = require('../../db/schema/feeConfigs');
const { versements } = require('../../db/schema/versements');
const { students } = require('../../db/schema/students');
const { computeTotalDiscount } = require('../balance/balance.service');
const { AppError } = require('../../lib/apiError');

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

  // Get all scholarships and group by enrollmentId
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    if (!scholarshipMap[s.enrollmentId]) scholarshipMap[s.enrollmentId] = [];
    scholarshipMap[s.enrollmentId].push(s);
  }

  // Compute total expected (after scholarships)
  let totalExpected = 0;
  for (const e of enrollmentData) {
    const tuition = await getGroupTuition(e.classGroupId);
    const discount = computeTotalDiscount(scholarshipMap[e.enrollmentId] || [], tuition);
    totalExpected += tuition - discount;
  }

  // Compute total collected (completed payments) and total pending
  let totalCollected = 0;
  let totalPending = 0;
  const enrollmentIds = enrollmentData.map((e) => e.enrollmentId);

  for (const e of enrollmentData) {
    const [{ paid }] = await db
      .select({ paid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.status, 'completed'),
      ));
    totalCollected += Number(paid || 0);

    const [{ pending }] = await db
      .select({ pending: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.status, 'pending'),
      ));
    totalPending += Number(pending || 0);
  }

  return {
    total_expected: Math.round(totalExpected * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_pending: Math.round(totalPending * 100) / 100,
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

  // Get all versements for this group + year
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

  // Get all scholarships and group by enrollmentId
  const allScholarships = await db.select().from(scholarships);
  const scholarshipMap = {};
  for (const s of allScholarships) {
    if (!scholarshipMap[s.enrollmentId]) scholarshipMap[s.enrollmentId] = [];
    scholarshipMap[s.enrollmentId].push(s);
  }

  // Compute expected for this versement across all students
  const versementAmount = Number(versement.amount);
  let versementExpected = 0;

  for (const e of enrollmentData) {
    const discount = computeTotalDiscount(scholarshipMap[e.enrollmentId] || [], totalTuition);
    const discountRatio = totalTuition > 0 ? discount / totalTuition : 0;
    const effectiveAmount = versementAmount * (1 - discountRatio);
    versementExpected += effectiveAmount;
  }

  // Compute how much has been collected toward this specific versement
  let totalCollected = 0;

  for (const e of enrollmentData) {
    const discount = computeTotalDiscount(scholarshipMap[e.enrollmentId] || [], totalTuition);
    const discountRatio = totalTuition > 0 ? discount / totalTuition : 0;

    const [{ nonBookPaid }] = await db
      .select({ nonBookPaid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, e.enrollmentId),
        eq(payments.status, 'completed'),
        eq(payments.isBookPayment, false),
      ));

    let remaining = Number(nonBookPaid || 0);

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

async function getDashboardStats() {
  // Get active school year
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) {
    return {
      totalStudents: 0,
      totalClasses: 0,
      paymentsThisMonth: 0,
      overdueVersements: 0,
      recentPayments: [],
      upcomingDueDates: [],
    };
  }

  // Total students enrolled in active year
  const [{ studentCount }] = await db
    .select({ studentCount: count() })
    .from(enrollments)
    .where(eq(enrollments.schoolYearId, activeYear.id));

  // Total classes
  const [{ classCount }] = await db
    .select({ classCount: count() })
    .from(classes);

  // Payments this month (completed)
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [{ monthPayments }] = await db
    .select({ monthPayments: sum(payments.amount) })
    .from(payments)
    .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
    .where(and(
      eq(enrollments.schoolYearId, activeYear.id),
      eq(payments.status, 'completed'),
      gte(payments.paymentDate, firstOfMonth),
    ));

  // Overdue versements count (versements with dueDate < today)
  const today = now.toISOString().split('T')[0];
  const overdueList = await db
    .select({ id: versements.id })
    .from(versements)
    .where(and(
      eq(versements.schoolYearId, activeYear.id),
      gte(versements.dueDate, '2000-01-01'), // just to use the column
    ));
  const overdueVersements = overdueList.filter((v) => v.dueDate < today).length;

  // Recent payments (last 5 completed)
  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      className: classes.name,
    })
    .from(payments)
    .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(enrollments.schoolYearId, activeYear.id),
      eq(payments.status, 'completed'),
    ))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  // Upcoming due dates (next 3 versements with dueDate >= today)
  const upcomingDueDates = await db
    .select({
      id: versements.id,
      name: versements.name,
      amount: versements.amount,
      dueDate: versements.dueDate,
      classGroupId: versements.classGroupId,
    })
    .from(versements)
    .where(and(
      eq(versements.schoolYearId, activeYear.id),
      gte(versements.dueDate, today),
    ))
    .orderBy(versements.dueDate)
    .limit(3);

  return {
    totalStudents: studentCount,
    totalClasses: classCount,
    paymentsThisMonth: Number(monthPayments || 0),
    overdueVersements,
    recentPayments,
    upcomingDueDates,
  };
}

module.exports = { getSummary, getVersementFinance, getDashboardStats };
