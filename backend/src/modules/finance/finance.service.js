const { eq, and, sum, count, gte, lte, desc, inArray, sql } = require('drizzle-orm');
const { db } = require('../../config/database');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { payments } = require('../../db/schema/payments');
const { feeConfigs } = require('../../db/schema/feeConfigs');
const { versements } = require('../../db/schema/versements');
const { students } = require('../../db/schema/students');
const { computeTotalDiscount, computeDiscounts } = require('../balance/balance.service');
const { AppError } = require('../../lib/apiError');

async function getSummary({ classId, classGroupId, month }) {
  // Get active school year
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) {
    throw new AppError(404, 'No active school year');
  }

  // Build enrollment conditions — only count enrolled students
  const conditions = [eq(enrollments.schoolYearId, activeYear.id), eq(enrollments.status, 'enrolled')];
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
    return { total_expected: 0, total_collected: 0, total_pending: 0, total_remaining: 0, student_count: 0 };
  }

  const enrollmentIds = enrollmentData.map((e) => e.enrollmentId);

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
    groupTuitionCache[cgId] = { versementsTotal, bookFee, total: versementsTotal + bookFee };
    return groupTuitionCache[cgId];
  }

  // FIX #2: Filter scholarships by relevant enrollment IDs only
  const allScholarships = await db.select().from(scholarships)
    .where(inArray(scholarships.enrollmentId, enrollmentIds));
  const scholarshipMap = {};
  for (const s of allScholarships) {
    if (!scholarshipMap[s.enrollmentId]) scholarshipMap[s.enrollmentId] = [];
    scholarshipMap[s.enrollmentId].push(s);
  }

  // Compute total expected (after scholarships) and total scholarship amount
  let totalExpected = 0;
  let totalScholarships = 0;
  for (const e of enrollmentData) {
    const { versementsTotal, bookFee, total } = await getGroupTuition(e.classGroupId);
    const discount = computeTotalDiscount(scholarshipMap[e.enrollmentId] || [], versementsTotal, bookFee);
    totalScholarships += discount;
    totalExpected += total - discount;
  }

  // FIX #1: Single GROUP BY query for all payment totals instead of N+1
  const paymentConditions = [
    inArray(payments.enrollmentId, enrollmentIds),
    inArray(payments.status, ['completed', 'pending']),
  ];
  if (month) {
    paymentConditions.push(sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM') = ${month}`);
  }

  const paymentTotals = await db
    .select({
      enrollmentId: payments.enrollmentId,
      status: payments.status,
      total: sum(payments.amount),
    })
    .from(payments)
    .where(and(...paymentConditions))
    .groupBy(payments.enrollmentId, payments.status);

  // Build lookup map
  let totalCollected = 0;
  let totalPending = 0;
  for (const row of paymentTotals) {
    const amount = Number(row.total || 0);
    if (row.status === 'completed') totalCollected += amount;
    else if (row.status === 'pending') totalPending += amount;
  }

  return {
    total_expected: Math.round(totalExpected * 100) / 100,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_pending: Math.round(totalPending * 100) / 100,
    total_remaining: Math.round((totalExpected - totalCollected) * 100) / 100,
    total_scholarships: Math.round(totalScholarships * 100) / 100,
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

  // Get all enrolled students for this school year where class belongs to this class group
  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(enrollments.schoolYearId, versement.schoolYearId),
      eq(classes.classGroupId, versement.classGroupId),
      eq(enrollments.status, 'enrolled'),
    ));

  const studentCount = enrollmentData.length;

  if (studentCount === 0) {
    return { versement_expected: 0, total_collected: 0, total_remaining: 0, student_count: 0 };
  }

  const enrollmentIds = enrollmentData.map((e) => e.enrollmentId);

  // FIX #2: Filter scholarships by relevant enrollment IDs only
  const allScholarships = await db.select().from(scholarships)
    .where(inArray(scholarships.enrollmentId, enrollmentIds));
  const scholarshipMap = {};
  for (const s of allScholarships) {
    if (!scholarshipMap[s.enrollmentId]) scholarshipMap[s.enrollmentId] = [];
    scholarshipMap[s.enrollmentId].push(s);
  }

  // Compute expected for this versement across all students
  const versementAmount = Number(versement.amount);
  let versementExpected = 0;

  for (const e of enrollmentData) {
    const { proportionalDiscount, versementAnnulations } = computeDiscounts(scholarshipMap[e.enrollmentId] || [], versementsTotal);
    const discountRatio = versementsTotal > 0 ? Math.min(proportionalDiscount, versementsTotal) / versementsTotal : 0;
    const annulation = versementAnnulations.get(versement.id) || 0;
    const effectiveAmount = Math.max(0, versementAmount * (1 - discountRatio) - annulation);
    versementExpected += effectiveAmount;
  }

  // FIX #3: Single batch query for all non-book payments instead of N+1
  const nonBookPaymentTotals = await db
    .select({
      enrollmentId: payments.enrollmentId,
      total: sum(payments.amount),
    })
    .from(payments)
    .where(and(
      inArray(payments.enrollmentId, enrollmentIds),
      eq(payments.status, 'completed'),
      eq(payments.isBookPayment, false),
    ))
    .groupBy(payments.enrollmentId);

  // Build payment lookup map
  const paidByEnrollment = {};
  for (const row of nonBookPaymentTotals) {
    paidByEnrollment[row.enrollmentId] = Number(row.total || 0);
  }

  // Compute how much has been collected toward this specific versement
  let totalCollected = 0;

  for (const e of enrollmentData) {
    const { proportionalDiscount, versementAnnulations } = computeDiscounts(scholarshipMap[e.enrollmentId] || [], versementsTotal);
    const discountRatio = versementsTotal > 0 ? Math.min(proportionalDiscount, versementsTotal) / versementsTotal : 0;

    let remaining = paidByEnrollment[e.enrollmentId] || 0;

    for (const v of allVersements) {
      const annulation = versementAnnulations.get(v.id) || 0;
      const effectiveAmount = Math.max(0, Number(v.amount) * (1 - discountRatio) - annulation);
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

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  // FIX #4: Run all independent queries in parallel
  const [
    [{ studentCount }],
    [{ classCount }],
    [{ monthPayments }],
    [{ overdueCount }],
    recentPayments,
    upcomingDueDates,
  ] = await Promise.all([
    // Total students enrolled in active year (only 'enrolled' status)
    db.select({ studentCount: count() })
      .from(enrollments)
      .where(and(eq(enrollments.schoolYearId, activeYear.id), eq(enrollments.status, 'enrolled'))),

    // Total classes
    db.select({ classCount: count() })
      .from(classes),

    // Payments this month (completed)
    db.select({ monthPayments: sum(payments.amount) })
      .from(payments)
      .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .where(and(
        eq(enrollments.schoolYearId, activeYear.id),
        eq(payments.status, 'completed'),
        gte(payments.paymentDate, firstOfMonth),
      )),

    // FIX #9: Count overdue versements directly in SQL instead of loading + filtering in JS
    db.select({ overdueCount: count() })
      .from(versements)
      .where(and(
        eq(versements.schoolYearId, activeYear.id),
        lte(versements.dueDate, today),
      )),

    // Recent payments (last 5 completed)
    db.select({
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
      .limit(5),

    // Upcoming due dates (next 3 versements with dueDate >= today)
    db.select({
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
      .limit(3),
  ]);

  return {
    totalStudents: studentCount,
    totalClasses: classCount,
    paymentsThisMonth: Number(monthPayments || 0),
    overdueVersements: overdueCount,
    recentPayments,
    upcomingDueDates,
  };
}

async function getMonthlyPayments() {
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) return [];

  const rows = await db
    .select({
      month: sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`.as('month'),
      collected: sum(sql`CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END`),
      pending: sum(sql`CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END`),
      count: count(),
    })
    .from(payments)
    .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
    .where(eq(enrollments.schoolYearId, activeYear.id))
    .groupBy(sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`);

  return rows.map((r) => ({
    month: r.month,
    collected: Math.round(Number(r.collected || 0) * 100) / 100,
    pending: Math.round(Number(r.pending || 0) * 100) / 100,
    count: Number(r.count),
  }));
}

async function getGroupBreakdown({ month } = {}) {
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) return [];

  const { classGroups } = require('../../db/schema/classGroups');

  // Get all groups
  const groups = await db.select().from(classGroups);
  const results = [];

  for (const group of groups) {
    const summary = await getSummary({ classGroupId: group.id, month });
    results.push({
      id: group.id,
      name: group.name,
      expected: summary.total_expected,
      collected: summary.total_collected,
      pending: summary.total_pending,
      remaining: summary.total_remaining,
      scholarships: summary.total_scholarships,
      studentCount: summary.student_count,
    });
  }

  return results;
}

async function getPaymentMethodBreakdown() {
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) return [];

  const rows = await db
    .select({
      method: payments.paymentMethod,
      total: sum(payments.amount),
      count: count(),
    })
    .from(payments)
    .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
    .where(and(
      eq(enrollments.schoolYearId, activeYear.id),
      eq(payments.status, 'completed'),
    ))
    .groupBy(payments.paymentMethod);

  const methodLabels = {
    cash: 'Espèces',
    check: 'Chèque',
    transfer: 'Virement',
    mobile: 'Mobile',
    deposit: 'Dépôt bancaire',
    credit_transfer: 'Transfert',
  };

  return rows.map((r) => ({
    method: r.method,
    label: methodLabels[r.method] || r.method,
    total: Math.round(Number(r.total || 0) * 100) / 100,
    count: Number(r.count),
  }));
}

module.exports = { getSummary, getVersementFinance, getDashboardStats, getMonthlyPayments, getGroupBreakdown, getPaymentMethodBreakdown };
