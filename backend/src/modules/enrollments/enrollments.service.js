const { eq, and, or, count, sql, ilike } = require('drizzle-orm');
const { db } = require('../../config/database');
const { enrollments } = require('../../db/schema/enrollments');
const { students } = require('../../db/schema/students');
const { classes } = require('../../db/schema/classes');
const { classGroups } = require('../../db/schema/classGroups');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

function decodeEnrollmentCursor(cursor) {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const { ln, fn, id } = JSON.parse(json);
    if (typeof ln === 'string' && typeof fn === 'string' && typeof id === 'string') {
      return { lastName: ln, firstName: fn, id };
    }
    return null;
  } catch {
    return null;
  }
}

function encodeEnrollmentCursor(row) {
  return Buffer.from(
    JSON.stringify({ ln: row.studentLastName, fn: row.studentFirstName, id: row.id })
  ).toString('base64url');
}

async function listEnrollments({ schoolYearId, classId, search, cursor, limit }) {
  const conditions = [];
  if (schoolYearId) conditions.push(eq(enrollments.schoolYearId, schoolYearId));
  if (classId) conditions.push(eq(enrollments.classId, classId));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(students.firstName, pattern),
        ilike(students.lastName, pattern),
      )
    );
  }

  if (cursor) {
    const parsed = decodeEnrollmentCursor(cursor);
    if (parsed) {
      conditions.push(
        sql`(${students.lastName}, ${students.firstName}, ${enrollments.id}) > (${parsed.lastName}, ${parsed.firstName}, ${parsed.id})`
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = {
    id: enrollments.id,
    studentId: enrollments.studentId,
    classId: enrollments.classId,
    schoolYearId: enrollments.schoolYearId,
    status: enrollments.status,
    createdAt: enrollments.createdAt,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    className: classes.name,
    schoolYear: schoolYears.year,
  };

  const baseQuery = (qb) =>
    qb
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .innerJoin(schoolYears, eq(enrollments.schoolYearId, schoolYears.id));

  const [rows, [{ total: totalCount }]] = await Promise.all([
    baseQuery(db.select(selectFields))
      .where(where)
      .limit(limit + 1)
      .orderBy(students.lastName, students.firstName, enrollments.id),
    baseQuery(db.select({ total: count() }))
      .where(where),
  ]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? encodeEnrollmentCursor(data[data.length - 1]) : null;

  return {
    data,
    pagination: {
      limit,
      totalCount,
      nextCursor,
      hasNextPage,
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
      status: enrollments.status,
      createdAt: enrollments.createdAt,
      updatedAt: enrollments.updatedAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      className: classes.name,
      gradeLevel: classes.gradeLevel,
      classGroupId: classes.classGroupId,
      classGroupName: classGroups.name,
      schoolYear: schoolYears.year,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(classGroups, eq(classes.classGroupId, classGroups.id))
    .innerJoin(schoolYears, eq(enrollments.schoolYearId, schoolYears.id))
    .where(eq(enrollments.id, id));

  if (!enrollment) {
    throw new AppError(404, 'Enrollment not found');
  }

  return enrollment;
}

async function updateEnrollment(id, data, userId) {
  const [existing] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.id, id));

  if (!existing) {
    throw new AppError(404, 'Enrollment not found');
  }

  const [updated] = await db
    .update(enrollments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(enrollments.id, id))
    .returning();

  logAudit(userId, 'update', 'enrollments', id, existing, updated);
  return updated;
}

module.exports = { listEnrollments, createEnrollment, getEnrollmentById, updateEnrollment };
