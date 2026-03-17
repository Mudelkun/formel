const { eq, and, sum, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { students } = require('../../db/schema/students');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { payments } = require('../../db/schema/payments');
const { quarters } = require('../../db/schema/quarters');
const { AppError } = require('../../lib/apiError');

async function getBalance(studentId, quarterId) {
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
      annualTuitionFee: classes.annualTuitionFee,
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

  const tuitionAmount = Number(enrollment.annualTuitionFee);

  // Get scholarship discount
  const [scholarship] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollment.enrollmentId));

  let scholarshipDiscount = 0;
  if (scholarship) {
    switch (scholarship.type) {
      case 'full':
        scholarshipDiscount = tuitionAmount;
        break;
      case 'partial':
        scholarshipDiscount = tuitionAmount * (Number(scholarship.percentage) / 100);
        break;
      case 'fixed_amount':
        scholarshipDiscount = Number(scholarship.fixedAmount);
        break;
    }
  }

  if (quarterId) {
    // Get total number of quarters for this school year
    const [{ quarterCount }] = await db
      .select({ quarterCount: count() })
      .from(quarters)
      .where(eq(quarters.schoolYearId, enrollment.schoolYearId));

    const numQuarters = Number(quarterCount);
    if (numQuarters === 0) {
      throw new AppError(400, 'No quarters defined for the active school year');
    }

    const quarterTuition = tuitionAmount / numQuarters;
    const quarterDiscount = scholarshipDiscount / numQuarters;
    const amountDue = quarterTuition - quarterDiscount;

    // Sum completed payments for this quarter
    const [{ paid }] = await db
      .select({ paid: sum(payments.amount) })
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, enrollment.enrollmentId),
        eq(payments.quarterId, quarterId),
        eq(payments.status, 'completed')
      ));

    const amountPaid = Number(paid || 0);

    return {
      tuition_amount: quarterTuition,
      scholarship_discount: quarterDiscount,
      amount_due: amountDue,
      amount_paid: amountPaid,
      remaining_balance: amountDue - amountPaid,
    };
  }

  // Full year balance
  const amountDue = tuitionAmount - scholarshipDiscount;

  const [{ paid }] = await db
    .select({ paid: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, enrollment.enrollmentId),
      eq(payments.status, 'completed')
    ));

  const amountPaid = Number(paid || 0);

  return {
    tuition_amount: tuitionAmount,
    scholarship_discount: scholarshipDiscount,
    amount_due: amountDue,
    amount_paid: amountPaid,
    remaining_balance: amountDue - amountPaid,
  };
}

module.exports = { getBalance };
