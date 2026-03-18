const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { upload } = require('../../middleware/upload');
const { getPaymentSchema, updatePaymentSchema } = require('./payments.validation');
const { getPayment, updatePayment } = require('./payments.controller');

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

// Standalone payment routes
router.get('/:id', auth, authorize('admin', 'secretary'), validate(getPaymentSchema), getPayment);
router.patch('/:id', auth, authorize('admin', 'secretary'), validate(updatePaymentSchema), updatePayment);

// Payment Documents
router.get('/:id/documents', auth, authorize('admin', 'secretary'), validate(paymentIdParamSchema), listDocuments);
router.post('/:id/documents', auth, authorize('admin', 'secretary'), upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', auth, authorize('admin'), validate(deletePaymentDocSchema), deleteDocument);

module.exports = router;
