const { eq, ilike, or, and, sql, count, gt, lte, inArray, exists } = require('drizzle-orm');
const { db } = require('../../config/database');
const { students } = require('../../db/schema/students');
const { contacts } = require('../../db/schema/contacts');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { scholarships } = require('../../db/schema/scholarships');
const { versements } = require('../../db/schema/versements');
const { payments } = require('../../db/schema/payments');
const { AppError } = require('../../lib/apiError');

function buildNameConditions(name) {
  // Split by whitespace and create AND conditions where each word matches firstName or lastName
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.map((word) => {
    const pattern = `%${word}%`;
    return or(ilike(students.firstName, pattern), ilike(students.lastName, pattern));
  });
}

function decodeCursor(cursor) {
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

function encodeCursor(student) {
  return Buffer.from(
    JSON.stringify({ ln: student.lastName, fn: student.firstName, id: student.id })
  ).toString('base64url');
}

/**
 * Build a SQL expression that evaluates to true when a student has overdue
 * payments, taking scholarships into account.
 *
 * Mirrors the logic in balance.service.js:
 *   effectiveOverdue = rawOverdue * (1 - discountRatio) - overdueAnnulations
 *   hasOverdue = effectiveOverdue > totalPaid
 */
function buildHasOverdueSql(today) {
  // Total versement amount for the class group + school year
  const vTotal = sql`(
    SELECT COALESCE(SUM(${versements.amount}), 0)
    FROM ${versements}
    WHERE ${versements.classGroupId} = ${classes.classGroupId}
      AND ${versements.schoolYearId} = ${enrollments.schoolYearId}
  )`;

  // Discount ratio from proportional scholarships (full, partial, fixed_amount), capped at 1
  const discountRatio = sql`LEAST(1, COALESCE((
    SELECT SUM(
      CASE
        WHEN ${scholarships.type} = 'full' THEN 1
        WHEN ${scholarships.type} = 'partial' THEN ${scholarships.percentage}::numeric / 100
        WHEN ${scholarships.type} = 'fixed_amount' THEN ${scholarships.fixedAmount}::numeric / NULLIF(${vTotal}, 0)
        ELSE 0
      END
    )
    FROM ${scholarships}
    WHERE ${scholarships.enrollmentId} = ${enrollments.id}
      AND ${scholarships.type} IN ('full', 'partial', 'fixed_amount')
  ), 0))`;

  // Sum of versement_annulation amounts targeting overdue versements
  const overdueAnnulations = sql`COALESCE((
    SELECT SUM(${scholarships.fixedAmount}::numeric)
    FROM ${scholarships}
    INNER JOIN ${versements} ON ${scholarships.targetVersementId} = ${versements.id}
    WHERE ${scholarships.enrollmentId} = ${enrollments.id}
      AND ${scholarships.type} = 'versement_annulation'
      AND ${versements.dueDate} <= ${today}
  ), 0)`;

  // Raw overdue versement total (before scholarship adjustments)
  const rawOverdue = sql`(
    SELECT COALESCE(SUM(${versements.amount}), 0)
    FROM ${versements}
    WHERE ${versements.classGroupId} = ${classes.classGroupId}
      AND ${versements.schoolYearId} = ${enrollments.schoolYearId}
      AND ${versements.dueDate} <= ${today}
  )`;

  // Total completed non-book payments
  const totalPaid = sql`(
    SELECT COALESCE(SUM(${payments.amount}), 0)
    FROM ${payments}
    WHERE ${payments.enrollmentId} = ${enrollments.id}
      AND ${payments.status} = 'completed'
      AND ${payments.isBookPayment} = false
  )`;

  return sql`GREATEST(0, ${rawOverdue} * (1 - ${discountRatio}) - ${overdueAnnulations}) > ${totalPaid}`;
}

async function listStudents({ name, status, enrollmentStatus, overdue, classId, scholarship, cursor, limit }) {
  const conditions = [];

  if (name) {
    conditions.push(...buildNameConditions(name));
  }

  if (status) {
    conditions.push(eq(students.status, status));
  }

  // Filter by enrollment status (defaults to 'enrolled' if not specified)
  const effectiveEnrollmentStatus = enrollmentStatus || 'enrolled';
  const isGraduatedFilter = effectiveEnrollmentStatus === 'graduated';

  if (isGraduatedFilter) {
    // Graduated students are identified by students.status, not enrollment
    conditions.push(eq(students.status, 'graduated'));
  } else {
    conditions.push(eq(enrollments.status, effectiveEnrollmentStatus));
  }

  if (scholarship === 'true') {
    conditions.push(eq(students.scholarshipRecipient, true));
  } else if (scholarship === 'false') {
    conditions.push(eq(students.scholarshipRecipient, false));
  }

  // Filter students with unpaid overdue versements (scholarship-aware)
  if (overdue === 'true' && !isGraduatedFilter) {
    const today = new Date().toISOString().split('T')[0];
    conditions.push(buildHasOverdueSql(today));
  }

  // Cursor-based keyset condition: (lastName, firstName, id) > (cursorLN, cursorFN, cursorID)
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (parsed) {
      conditions.push(
        sql`(${students.lastName}, ${students.firstName}, ${students.id}) > (${parsed.lastName}, ${parsed.firstName}, ${parsed.id})`
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const today = new Date().toISOString().split('T')[0];

  let query, countQuery;

  if (isGraduatedFilter) {
    // Graduated students: query from students table directly, left join for last known class
    const selectFields = {
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
      className: sql`NULL`.as('class_name'),
      gradeLevel: sql`NULL`.as('grade_level'),
      enrollmentStatus: sql`'graduated'`.as('enrollment_status'),
      hasOverdue: sql`false`.as('has_overdue'),
    };

    query = db.select(selectFields)
      .from(students)
      .where(where)
      .limit(limit + 1)
      .orderBy(students.lastName, students.firstName, students.id);

    countQuery = db.select({ total: count() })
      .from(students)
      .where(where);
  } else {
    const selectFields = {
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
      className: classes.name,
      gradeLevel: classes.gradeLevel,
      enrollmentStatus: enrollments.status,
      hasOverdue: sql`${buildHasOverdueSql(today)}`.as('has_overdue'),
    };

    const baseJoins = (qb) =>
      qb
        .from(students)
        .innerJoin(enrollments, eq(enrollments.studentId, students.id))
        .innerJoin(classes, eq(enrollments.classId, classes.id))
        .innerJoin(schoolYears, and(
          eq(enrollments.schoolYearId, schoolYears.id),
          eq(schoolYears.isActive, true)
        ));

    const effectiveWhere = classId
      ? and(eq(enrollments.classId, classId), where)
      : where;

    query = baseJoins(db.select(selectFields))
      .where(effectiveWhere)
      .limit(limit + 1)
      .orderBy(students.lastName, students.firstName, students.id);

    countQuery = baseJoins(db.select({ total: count() }))
      .where(effectiveWhere);
  }

  const [rows, [{ total: totalCount }]] = await Promise.all([query, countQuery]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? encodeCursor(data[data.length - 1]) : null;

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

  // Get current enrollment (active school year, enrolled status)
  const [currentEnrollment] = await db
    .select({
      enrollmentId: enrollments.id,
      className: classes.name,
      gradeLevel: classes.gradeLevel,
      enrollmentStatus: enrollments.status,
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

/**
 * When a student moves to a class in a different class group, re-map
 * versement_annulation scholarships to the new group's versements
 * (matched by versement number). Scholarships of other types are unaffected.
 */
async function remapScholarshipsForClassGroup(enrollmentId, oldClassId, newClassId, schoolYearId) {
  // Get class group IDs for old and new classes
  const [[oldClass], [newClass]] = await Promise.all([
    db.select({ classGroupId: classes.classGroupId }).from(classes).where(eq(classes.id, oldClassId)),
    db.select({ classGroupId: classes.classGroupId }).from(classes).where(eq(classes.id, newClassId)),
  ]);

  if (!oldClass || !newClass) return;

  // Same class group — versement IDs are identical, nothing to remap
  if (oldClass.classGroupId === newClass.classGroupId) return;

  // Get versement_annulation scholarships for this enrollment
  const annulations = await db
    .select()
    .from(scholarships)
    .where(and(
      eq(scholarships.enrollmentId, enrollmentId),
      eq(scholarships.type, 'versement_annulation'),
    ));

  if (annulations.length === 0) return;

  // Get old versements (to find their numbers)
  const oldVersements = await db
    .select({ id: versements.id, number: versements.number })
    .from(versements)
    .where(and(
      eq(versements.classGroupId, oldClass.classGroupId),
      eq(versements.schoolYearId, schoolYearId),
    ));

  // Get new versements (to map by number)
  const newVersements = await db
    .select({ id: versements.id, number: versements.number, amount: versements.amount })
    .from(versements)
    .where(and(
      eq(versements.classGroupId, newClass.classGroupId),
      eq(versements.schoolYearId, schoolYearId),
    ));

  // Build lookup maps
  const oldIdToNumber = new Map(oldVersements.map((v) => [v.id, v.number]));
  const newNumberToVersement = new Map(newVersements.map((v) => [v.number, v]));

  // Partition annulations into updates and deletes for batch operations
  const toDelete = [];
  const updateCases = [];

  for (const annul of annulations) {
    const versementNumber = oldIdToNumber.get(annul.targetVersementId);
    if (versementNumber == null) continue;

    const newVersement = newNumberToVersement.get(versementNumber);
    if (newVersement) {
      updateCases.push({ id: annul.id, targetVersementId: newVersement.id, fixedAmount: String(newVersement.amount) });
    } else {
      toDelete.push(annul.id);
    }
  }

  // Batch delete annulations with no matching versement
  if (toDelete.length > 0) {
    await db.delete(scholarships).where(inArray(scholarships.id, toDelete));
  }

  // Update each remapped scholarship (few per student, typically 2-5)
  await Promise.all(updateCases.map((u) =>
    db.update(scholarships)
      .set({ targetVersementId: u.targetVersementId, fixedAmount: u.fixedAmount, updatedAt: new Date() })
      .where(eq(scholarships.id, u.id))
  ));
}

async function promoteStudent(studentId) {
  // Get active school year
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) {
    throw new AppError(400, 'No active school year found');
  }

  // Get current enrollment for active year
  const [currentEnrollment] = await db
    .select({
      id: enrollments.id,
      classId: enrollments.classId,
      gradeLevel: classes.gradeLevel,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.schoolYearId, activeYear.id)
    ));

  if (!currentEnrollment) {
    throw new AppError(400, 'Student has no enrollment for the active school year');
  }

  // Find class at next grade level
  const nextGrade = currentEnrollment.gradeLevel + 1;
  const [nextClass] = await db
    .select({ id: classes.id, name: classes.name, gradeLevel: classes.gradeLevel })
    .from(classes)
    .where(eq(classes.gradeLevel, nextGrade))
    .limit(1);

  if (!nextClass) {
    // No higher grade — mark student as graduated
    await db.update(students)
      .set({ status: 'graduated', updatedAt: new Date() })
      .where(eq(students.id, studentId));

    await db.update(enrollments)
      .set({ status: 'graduated', updatedAt: new Date() })
      .where(eq(enrollments.id, currentEnrollment.id));

    return { enrollment: null, className: null, gradeLevel: null, graduated: true };
  }

  // Re-map scholarships if class group changed
  await remapScholarshipsForClassGroup(currentEnrollment.id, currentEnrollment.classId, nextClass.id, activeYear.id);

  // Update enrollment to the next class
  const [updated] = await db
    .update(enrollments)
    .set({ classId: nextClass.id, updatedAt: new Date() })
    .where(eq(enrollments.id, currentEnrollment.id))
    .returning();

  return { enrollment: updated, className: nextClass.name, gradeLevel: nextClass.gradeLevel, graduated: false };
}

async function downgradeStudent(studentId) {
  // Get active school year
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) {
    throw new AppError(400, 'No active school year found');
  }

  // Get current enrollment for active year
  const [currentEnrollment] = await db
    .select({
      id: enrollments.id,
      classId: enrollments.classId,
      gradeLevel: classes.gradeLevel,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.schoolYearId, activeYear.id)
    ));

  if (!currentEnrollment) {
    throw new AppError(400, 'Student has no enrollment for the active school year');
  }

  // Find class at previous grade level
  const prevGrade = currentEnrollment.gradeLevel - 1;
  if (prevGrade < 1) {
    throw new AppError(400, 'Student is already at the lowest grade level');
  }

  const [prevClass] = await db
    .select({ id: classes.id, name: classes.name, gradeLevel: classes.gradeLevel })
    .from(classes)
    .where(eq(classes.gradeLevel, prevGrade))
    .limit(1);

  if (!prevClass) {
    throw new AppError(400, 'No class found for the previous grade level');
  }

  // Re-map scholarships if class group changed
  await remapScholarshipsForClassGroup(currentEnrollment.id, currentEnrollment.classId, prevClass.id, activeYear.id);

  // Update enrollment to the previous class
  const [updated] = await db
    .update(enrollments)
    .set({ classId: prevClass.id, updatedAt: new Date() })
    .where(eq(enrollments.id, currentEnrollment.id))
    .returning();

  return { enrollment: updated, className: prevClass.name, gradeLevel: prevClass.gradeLevel };
}

module.exports = { listStudents, createStudent, getStudentById, updateStudent, promoteStudent, downgradeStudent };
