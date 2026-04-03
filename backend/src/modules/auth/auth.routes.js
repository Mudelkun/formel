const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { loginSchema, verifyDeviceSchema } = require('./auth.validation');
const { login, verifyDevice, refresh, logout } = require('./auth.controller');

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/verify-device', validate(verifyDeviceSchema), verifyDevice);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);

module.exports = router;
