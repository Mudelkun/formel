const { eq, ilike, or, and, sql, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { students } = require('../../db/schema/students');
const { contacts } = require('../../db/schema/contacts');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');

async function listStudents({ name, status, classId, page, limit }) {
  const conditions = [];

  if (name) {
    const pattern = `%${name}%`;
    conditions.push(or(
      ilike(students.firstName, pattern),
      ilike(students.lastName, pattern)
    ));
  }

  if (status) {
    conditions.push(eq(students.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let query;
  let countQuery;

  if (classId) {
    // Join with enrollments to filter by class in active school year
    query = db
      .select({
        id: students.id,
        nie: students.nie,
        firstName: students.firstName,
        lastName: students.lastName,
        gender: students.gender,
        birthDate: students.birthDate,
        address: students.address,
        scholarshipRecipient: students.scholarshipRecipient,
        status: students.status,
        profilePhotoUrl: students.profilePhotoUrl,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(schoolYears, and(
        eq(enrollments.schoolYearId, schoolYears.id),
        eq(schoolYears.isActive, true)
      ))
      .where(and(eq(enrollments.classId, classId), where))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(students.lastName, students.firstName);

    countQuery = db
      .select({ total: count() })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(schoolYears, and(
        eq(enrollments.schoolYearId, schoolYears.id),
        eq(schoolYears.isActive, true)
      ))
      .where(and(eq(enrollments.classId, classId), where));
  } else {
    query = db
      .select()
      .from(students)
      .where(where)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(students.lastName, students.firstName);

    countQuery = db
      .select({ total: count() })
      .from(students)
      .where(where);
  }

  const [data, [{ total: totalCount }]] = await Promise.all([query, countQuery]);

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

async function createStudent(data) {
  const [student] = await db
    .insert(students)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return student;
}

async function getStudentById(id) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, id));

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Get contacts
  const studentContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.studentId, id));

  // Get current enrollment (active school year)
  const [currentEnrollment] = await db
    .select({
      enrollmentId: enrollments.id,
      className: classes.name,
      gradeLevel: classes.gradeLevel,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(schoolYears, and(
      eq(enrollments.schoolYearId, schoolYears.id),
      eq(schoolYears.isActive, true)
    ))
    .where(eq(enrollments.studentId, id));

  return {
    ...student,
    contacts: studentContacts,
    currentEnrollment: currentEnrollment || null,
  };
}

async function updateStudent(id, data) {
  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, id));

  if (!existing) {
    throw new AppError(404, 'Student not found');
  }

  const [updated] = await db
    .update(students)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();

  return updated;
}

module.exports = { listStudents, createStudent, getStudentById, updateStudent };
