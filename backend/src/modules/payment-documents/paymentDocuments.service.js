const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { payments } = require('../../db/schema/payments');
const { paymentDocuments } = require('../../db/schema/paymentDocuments');
const { uploadFile, deleteFile, extractKeyFromUrl } = require('../../lib/uploadService');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function verifyPaymentExists(paymentId) {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }
}

async function listDocuments(paymentId) {
  await verifyPaymentExists(paymentId);

  return db
    .select()
    .from(paymentDocuments)
    .where(eq(paymentDocuments.paymentId, paymentId))
    .orderBy(paymentDocuments.createdAt);
}

async function uploadDocument(paymentId, file, userId) {
  await verifyPaymentExists(paymentId);

  if (!file) {
    throw new AppError(400, 'No file provided');
  }

  const key = `payments/${paymentId}/documents/${Date.now()}-${file.originalname}`;
  const url = await uploadFile(file.buffer, key, file.mimetype);

  const [doc] = await db
    .insert(paymentDocuments)
    .values({
      paymentId,
      documentUrl: url,
      updatedAt: new Date(),
    })
    .returning();

  logAudit(userId, 'create', 'payment_documents', doc.id, null, doc);
  return doc;
}

async function deleteDocument(paymentId, docId, userId) {
  const [doc] = await db
    .select()
    .from(paymentDocuments)
    .where(and(eq(paymentDocuments.id, docId), eq(paymentDocuments.paymentId, paymentId)));

  if (!doc) {
    throw new AppError(404, 'Document not found');
  }

  const key = extractKeyFromUrl(doc.documentUrl);
  await deleteFile(key);
  await db.delete(paymentDocuments).where(eq(paymentDocuments.id, docId));

  logAudit(userId, 'delete', 'payment_documents', docId, doc, null);
}

module.exports = { listDocuments, uploadDocument, deleteDocument };
