const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { updateSettingsSchema } = require('./settings.validation');
const { getSettings, updateSettings } = require('./settings.controller');

const router = Router();

router.get('/', auth, authorize('admin', 'secretary'), getSettings);
router.patch('/', auth, authorize('admin'), validate(updateSettingsSchema), updateSettings);

module.exports = router;
