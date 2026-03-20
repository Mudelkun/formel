const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  listEnrollmentsSchema,
  createEnrollmentSchema,
  enrollmentIdParamSchema,
} = require('./enrollments.validation');
const {
  listEnrollments,
  createEnrollment,
  getEnrollment,
} = require('./enrollments.controller');

// Scholarships (nested under enrollments)
const {
  listScholarshipsSchema,
  createScholarshipSchema,
  updateScholarshipSchema,
  deleteScholarshipSchema,
} = require('../scholarships/scholarships.validation');
const {
  listScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} = require('../scholarships/scholarships.controller');

// Payments (nested under enrollments)
const { listPaymentsSchema, createPaymentSchema } = require('../payments/payments.validation');
const { listPayments, createPayment } = require('../payments/payments.controller');
const { upload } = require('../../middleware/upload');

const router = Router();

// Enrollments CRUD
router.get('/', auth, authorize('admin', 'secretary'), validate(listEnrollmentsSchema), listEnrollments);
router.post('/', auth, authorize('admin', 'secretary'), validate(createEnrollmentSchema), createEnrollment);
router.get('/:id', auth, authorize('admin', 'secretary'), validate(enrollmentIdParamSchema), getEnrollment);

// Scholarships — list & create nested under enrollment
router.get('/:id/scholarships', auth, authorize('admin', 'secretary'), validate(listScholarshipsSchema), listScholarships);
router.post('/:id/scholarships', auth, authorize('admin'), validate(createScholarshipSchema), createScholarship);

// Payments
router.get('/:id/payments', auth, authorize('admin', 'secretary'), validate(listPaymentsSchema), listPayments);
router.post('/:id/payments', auth, authorize('admin', 'secretary'), upload.single('file'), validate(createPaymentSchema), createPayment);

module.exports = router;
