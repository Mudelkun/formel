const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { upload } = require('../../middleware/upload');
const { listAllPaymentsSchema, getPaymentSchema, updatePaymentSchema } = require('./payments.validation');
const { listAllPayments, getPayment, updatePayment } = require('./payments.controller');

// Payment Documents (nested under payments)
const {
  paymentIdParamSchema,
  deletePaymentDocSchema,
} = require('../payment-documents/paymentDocuments.validation');
const {
  listDocuments,
  uploadDocument,
  deleteDocument,
} = require('../payment-documents/paymentDocuments.controller');

const router = Router();

// Global payments list (must be before /:id)
router.get('/', auth, authorize('admin', 'secretary'), validate(listAllPaymentsSchema), listAllPayments);

// Standalone payment routes
router.get('/:id', auth, authorize('admin', 'secretary'), validate(getPaymentSchema), getPayment);
router.patch('/:id', auth, authorize('admin', 'secretary'), validate(updatePaymentSchema), updatePayment);

// Payment Documents
router.get('/:id/documents', auth, authorize('admin', 'secretary'), validate(paymentIdParamSchema), listDocuments);
router.post('/:id/documents', auth, authorize('admin', 'secretary'), upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', auth, authorize('admin'), validate(deletePaymentDocSchema), deleteDocument);

module.exports = router;
