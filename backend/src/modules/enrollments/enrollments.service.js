const { eq, and, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { enrollments } = require('../../db/schema/enrollments');
const { students } = require('../../db/schema/students');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function listEnrollments({ schoolYearId, classId, page, limit }) {
  const conditions = [];
  if (schoolYearId) conditions.push(eq(enrollments.schoolYearId, schoolYearId));
  if (classId) conditions.push(eq(enrollments.classId, classId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      classId: enrollments.classId,
      schoolYearId: enrollments.schoolYearId,
      createdAt: enrollments.createdAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      className: classes.name,
      schoolYear: schoolYears.year,
    })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .innerJoin(schoolYears, eq(enrollments.schoolYearId, schoolYears.id))
      .where(where)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(students.lastName),
    db.select({ total: count() }).from(enrollments).where(where),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

async function createEnrollment(data, userId) {
  // Verify student exists
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, data.studentId));
  if (!student) throw new AppError(404, 'Student not found');

  // Verify class exists
  const [cls] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.id, data.classId));
  if (!cls) throw new AppError(404, 'Class not found');

  // Verify school year exists
  const [sy] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.id, data.schoolYearId));
  if (!sy) throw new AppError(404, 'School year not found');

  // Check unique constraint
  const [existing] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(
      eq(enrollments.studentId, data.studentId),
      eq(enrollments.schoolYearId, data.schoolYearId),
    ));
  if (existing) throw new AppError(409, 'Student already enrolled for this school year');

  const [created] = await db
    .insert(enrollments)
    .values({ ...data, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'enrollments', created.id, null, created);
  return created;
}

async function getEnrollmentById(id) {
  const [enrollment] = await db
    .select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      classId: enrollments.classId,
      schoolYearId: enrollments.schoolYearId,
      createdAt: enrollments.createdAt,
      updatedAt: enrollments.updatedAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      className: classes.name,
      gradeLevel: classes.gradeLevel,
      annualTuitionFee: classes.annualTuitionFee,
      schoolYear: schoolYears.year,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(schoolYears, eq(enrollments.schoolYearId, schoolYears.id))
    .where(eq(enrollments.id, id));

  if (!enrollment) {
    throw new AppError(404, 'Enrollment not found');
  }

  return enrollment;
}

module.exports = { listEnrollments, createEnrollment, getEnrollmentById };
