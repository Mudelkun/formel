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
  promoteStudents,
} = require('./schoolYears.controller');

const router = Router();

// School Years CRUD
router.get('/', auth, authorize('admin', 'secretary'), validate(listSchoolYearsSchema), listSchoolYears);
router.post('/', auth, authorize('admin'), validate(createSchoolYearSchema), createSchoolYear);
router.get('/:id', auth, authorize('admin', 'secretary'), validate(schoolYearIdParamSchema), getSchoolYear);
router.patch('/:id', auth, authorize('admin'), validate(updateSchoolYearSchema), updateSchoolYear);
router.patch('/:id/activate', auth, authorize('admin'), validate(schoolYearIdParamSchema), activateSchoolYear);
router.post('/:id/promote', auth, authorize('admin'), validate(schoolYearIdParamSchema), promoteStudents);

module.exports = router;
