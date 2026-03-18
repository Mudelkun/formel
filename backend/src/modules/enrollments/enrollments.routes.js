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
  getScholarshipSchema,
  createScholarshipSchema,
  updateScholarshipSchema,
  deleteScholarshipSchema,
} = require('../scholarships/scholarships.validation');
const {
  getScholarship,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} = require('../scholarships/scholarships.controller');

// Payments (nested under enrollments)
const { listPaymentsSchema, createPaymentSchema } = require('../payments/payments.validation');
const { listPayments, createPayment } = require('../payments/payments.controller');

const router = Router();

// Enrollments CRUD
router.get('/', auth, authorize('admin', 'secretary'), validate(listEnrollmentsSchema), listEnrollments);
router.post('/', auth, authorize('admin', 'secretary'), validate(createEnrollmentSchema), createEnrollment);
router.get('/:id', auth, authorize('admin', 'secretary'), validate(enrollmentIdParamSchema), getEnrollment);

// Scholarships
router.get('/:id/scholarship', auth, authorize('admin', 'secretary'), validate(getScholarshipSchema), getScholarship);
router.post('/:id/scholarship', auth, authorize('admin'), validate(createScholarshipSchema), createScholarship);
router.patch('/:id/scholarship', auth, authorize('admin'), validate(updateScholarshipSchema), updateScholarship);
router.delete('/:id/scholarship', auth, authorize('admin'), validate(deleteScholarshipSchema), deleteScholarship);

// Payments
router.get('/:id/payments', auth, authorize('admin', 'secretary'), validate(listPaymentsSchema), listPayments);
router.post('/:id/payments', auth, authorize('admin', 'secretary'), validate(createPaymentSchema), createPayment);

module.exports = router;
