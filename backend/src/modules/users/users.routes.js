const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersSchema,
} = require('./users.validation');
const {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} = require('./users.controller');

const router = Router();

router.get('/', auth, authorize('admin'), validate(listUsersSchema), listUsers);
router.post('/', auth, authorize('admin'), validate(createUserSchema), createUser);
router.get('/:id', auth, authorize('admin'), validate(userIdParamSchema), getUser);
router.patch('/:id', auth, authorize('admin'), validate(updateUserSchema), updateUser);
router.delete('/:id', auth, authorize('admin'), validate(userIdParamSchema), deleteUser);

module.exports = router;
