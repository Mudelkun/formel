const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { loginSchema } = require('./auth.validation');
const { login, refresh, logout } = require('./auth.controller');

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);

module.exports = router;
