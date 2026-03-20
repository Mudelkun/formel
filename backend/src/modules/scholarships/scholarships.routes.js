const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { updateScholarshipSchema, deleteScholarshipSchema } = require('./scholarships.validation');
const { updateScholarship, deleteScholarship } = require('./scholarships.controller');

const router = Router();

// Standalone scholarship routes (by scholarshipId)
router.patch('/:scholarshipId', auth, authorize('admin'), validate(updateScholarshipSchema), updateScholarship);
router.delete('/:scholarshipId', auth, authorize('admin'), validate(deleteScholarshipSchema), deleteScholarship);

module.exports = router;
