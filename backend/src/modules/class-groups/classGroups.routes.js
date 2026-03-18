const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  listClassGroupsSchema,
  createClassGroupSchema,
  updateClassGroupSchema,
  classGroupIdParamSchema,
} = require('./classGroups.validation');
const {
  listClassGroups,
  createClassGroup,
  getClassGroup,
  updateClassGroup,
  deleteClassGroup,
} = require('./classGroups.controller');

// Fees (nested under class-groups)
const { getFeesSchema, createFeesSchema, updateFeesSchema } = require('../fees/fees.validation');
const { getFees, createFees, updateFees } = require('../fees/fees.controller');

const router = Router();

// Class Groups CRUD
router.get('/', auth, authorize('admin', 'secretary'), validate(listClassGroupsSchema), listClassGroups);
router.post('/', auth, authorize('admin'), validate(createClassGroupSchema), createClassGroup);
router.get('/:id', auth, authorize('admin', 'secretary'), validate(classGroupIdParamSchema), getClassGroup);
router.patch('/:id', auth, authorize('admin'), validate(updateClassGroupSchema), updateClassGroup);
router.delete('/:id', auth, authorize('admin'), validate(classGroupIdParamSchema), deleteClassGroup);

// Fees (nested)
router.get('/:id/fees', auth, authorize('admin', 'secretary'), validate(getFeesSchema), getFees);
router.post('/:id/fees', auth, authorize('admin'), validate(createFeesSchema), createFees);
router.put('/:id/fees', auth, authorize('admin'), validate(updateFeesSchema), updateFees);

module.exports = router;
