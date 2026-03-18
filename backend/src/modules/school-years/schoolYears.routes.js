const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  listSchoolYearsSchema,
  createSchoolYearSchema,
  updateSchoolYearSchema,
  schoolYearIdParamSchema,
} = require('./schoolYears.validation');
const {
  listSchoolYears,
  createSchoolYear,
  getSchoolYear,
  updateSchoolYear,
  activateSchoolYear,
} = require('./schoolYears.controller');

// Quarters (nested under school years)
const { listQuartersSchema, createQuarterSchema } = require('../quarters/quarters.validation');
const { listQuarters, createQuarter } = require('../quarters/quarters.controller');

const router = Router();

// School Years CRUD
router.get('/', auth, authorize('admin', 'secretary'), validate(listSchoolYearsSchema), listSchoolYears);
router.post('/', auth, authorize('admin'), validate(createSchoolYearSchema), createSchoolYear);
router.get('/:id', auth, authorize('admin', 'secretary'), validate(schoolYearIdParamSchema), getSchoolYear);
router.patch('/:id', auth, authorize('admin'), validate(updateSchoolYearSchema), updateSchoolYear);
router.patch('/:id/activate', auth, authorize('admin'), validate(schoolYearIdParamSchema), activateSchoolYear);

// Nested Quarters
router.get('/:id/quarters', auth, authorize('admin', 'secretary'), validate(listQuartersSchema), listQuarters);
router.post('/:id/quarters', auth, authorize('admin'), validate(createQuarterSchema), createQuarter);

module.exports = router;
