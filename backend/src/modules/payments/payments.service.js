const { eq, and, ilike, or, count, desc, sql } = require('drizzle-orm');
const { db } = require('../../config/database');
const { payments } = require('../../db/schema/payments');
const { paymentDocuments } = require('../../db/schema/paymentDocuments');
const { enrollments } = require('../../db/schema/enrollments');
const { students } = require('../../db/schema/students');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { uploadFile } = require('../../lib/uploadService');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function verifyEnrollmentExists(enrollmentId) {
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId));

  if (!enrollment) {
    throw new AppError(404, 'Enrollment not found');
  }
}

async function listPayments(enrollmentId) {
  await verifyEnrollmentExists(enrollmentId);

  const data = await db
    .select()
    .from(payments)
    .where(eq(payments.enrollmentId, enrollmentId))
    .orderBy(payments.paymentDate);

  return data;
}

async function createPayment(enrollmentId, data, file, role, userId) {
  await verifyEnrollmentExists(enrollmentId);

  if (!file) {
    throw new AppError(400, 'Un document justificatif est requis');
  }

  const { autoConfirm, ...paymentData } = data;
  const status = (role === 'admin' && autoConfirm) ? 'completed' : 'pending';

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(payments)
      .values({ ...paymentData, enrollmentId, status, updatedAt: new Date() })
      .returning();

    const key = `payments/${created.id}/documents/${Date.now()}-${file.originalname}`;
    const url = await uploadFile(file.buffer, key, file.mimetype);

    const [doc] = await tx
      .insert(paymentDocuments)
      .values({ paymentId: created.id, documentUrl: url, updatedAt: new Date() })
      .returning();

    logAudit(userId, 'create', 'payments', created.id, null, created);
    logAudit(userId, 'create', 'payment_documents', doc.id, null, doc);

    return created;
  });

  return result;
}

async function getPaymentById(id) {
  const [payment] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      isBookPayment: payments.isBookPayment,
      status: payments.status,
      notes: payments.notes,
      enrollmentId: payments.enrollmentId,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      studentId: students.id,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      className: classes.name,
    })
    .from(payments)
    .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(payments.id, id));

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  return payment;
}

async function updatePayment(id, data, role, userId) {
  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id));

  if (!existing) {
    throw new AppError(404, 'Payment not found');
  }

  if (data.status && role !== 'admin') {
    throw new AppError(403, 'Only admin can change payment status');
  }

  const [updated] = await db
    .update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();

  logAudit(userId, 'update', 'payments', id, existing, updated);
  return updated;
}

function decodePaymentCursor(cursor) {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const { pd, id } = JSON.parse(json);
    if (typeof pd === 'string' && typeof id === 'string') {
      return { paymentDate: pd, id };
    }
    return null;
  } catch {
    return null;
  }
}

function encodePaymentCursor(row) {
  return Buffer.from(
    JSON.stringify({ pd: row.paymentDate, id: row.id })
  ).toString('base64url');
}

async function listAllPayments({ status, search, classId, classGroupId, cursor, limit }) {
  const conditions = [];

  // Only show payments from active school year
  conditions.push(eq(schoolYears.isActive, true));

  if (status) {
    conditions.push(eq(payments.status, status));
  }

  if (classId) {
    conditions.push(eq(enrollments.classId, classId));
  }

  if (classGroupId) {
    conditions.push(eq(classes.classGroupId, classGroupId));
  }

  if (search) {
    const words = search.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      const pattern = `%${word}%`;
      conditions.push(or(ilike(students.firstName, pattern), ilike(students.lastName, pattern)));
    }
  }

  const filterWhere = conditions.length > 0 ? and(...conditions) : undefined;

  // Descending order: next page means "older" rows, so use < for cursor
  if (cursor) {
    const parsed = decodePaymentCursor(cursor);
    if (parsed) {
      conditions.push(
        sql`(${payments.paymentDate}, ${payments.id}) < (${parsed.paymentDate}, ${parsed.id})`
      );
    }
  }

  const where = and(...conditions);

  const selectFields = {
    id: payments.id,
    amount: payments.amount,
    paymentDate: payments.paymentDate,
    paymentMethod: payments.paymentMethod,
    isBookPayment: payments.isBookPayment,
    status: payments.status,
    notes: payments.notes,
    enrollmentId: payments.enrollmentId,
    createdAt: payments.createdAt,
    studentId: students.id,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    className: classes.name,
    schoolYear: schoolYears.year,
  };

  const baseJoins = (qb) =>
    qb
      .from(payments)
      .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .innerJoin(schoolYears, eq(enrollments.schoolYearId, schoolYears.id));

  const [rows, [{ total: totalCount }]] = await Promise.all([
    baseJoins(db.select(selectFields))
      .where(where)
      .limit(limit + 1)
      .orderBy(desc(payments.paymentDate), desc(payments.id)),
    baseJoins(db.select({ total: count() }))
      .where(filterWhere),
  ]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? encodePaymentCursor(data[data.length - 1]) : null;

  return {
    data,
    pagination: { limit, totalCount, nextCursor, hasNextPage },
  };
}

module.exports = { listPayments, listAllPayments, createPayment, getPaymentById, updatePayment };
