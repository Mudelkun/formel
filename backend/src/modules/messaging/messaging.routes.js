const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { sendMessageSchema, bulkPreviewSchema, sendBulkSchema } = require('./messaging.validation');
const { sendMessage, getBulkPreview, sendBulkMessages, getBulkJobStatus, sendStudentPaymentReminder, getMessageHistory } = require('./messaging.controller');

const router = Router();

router.post('/send', auth, authorize('admin'), validate(sendMessageSchema), sendMessage);
router.get('/bulk-preview', auth, authorize('admin'), validate(bulkPreviewSchema), getBulkPreview);
router.post('/send-bulk', auth, authorize('admin'), validate(sendBulkSchema), sendBulkMessages);
router.get('/bulk-status/:jobId', auth, authorize('admin'), getBulkJobStatus);
router.post('/send-payment-reminder/:studentId', auth, authorize('admin'), sendStudentPaymentReminder);
router.get('/history', auth, authorize('admin'), getMessageHistory);

module.exports = router;
