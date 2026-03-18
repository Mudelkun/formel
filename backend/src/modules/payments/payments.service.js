const { eq } = require('drizzle-orm');
const { db } = require('../../config/database');
const { payments } = require('../../db/schema/payments');
const { enrollments } = require('../../db/schema/enrollments');
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

async function createPayment(enrollmentId, data, role, userId) {
  await verifyEnrollmentExists(enrollmentId);

  const status = role === 'admin' ? 'completed' : 'pending';

  const [created] = await db
    .insert(payments)
    .values({ ...data, enrollmentId, status, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'payments', created.id, null, created);
  return created;
}

async function getPaymentById(id) {
  const [payment] = await db
    .select()
    .from(payments)
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

  if (data.status && data.status !== 'pending' && role !== 'admin') {
    throw new AppError(403, 'Only admin can approve or reject payments');
  }

  const [updated] = await db
    .update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();

  logAudit(userId, 'update', 'payments', id, existing, updated);
  return updated;
}

module.exports = { listPayments, createPayment, getPaymentById, updatePayment };
