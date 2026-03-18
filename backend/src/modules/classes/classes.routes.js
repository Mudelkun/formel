const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  listClassesSchema,
  createClassSchema,
  updateClassSchema,
  classIdParamSchema,
} = require('./classes.validation');
const { listClasses, createClass, getClass, updateClass } = require('./classes.controller');

const router = Router();

router.get('/', auth, authorize('admin', 'secretary', 'teacher'), validate(listClassesSchema), listClasses);
router.post('/', auth, authorize('admin'), validate(createClassSchema), createClass);
router.get('/:id', auth, authorize('admin', 'secretary', 'teacher'), validate(classIdParamSchema), getClass);
router.patch('/:id', auth, authorize('admin'), validate(updateClassSchema), updateClass);

module.exports = router;
