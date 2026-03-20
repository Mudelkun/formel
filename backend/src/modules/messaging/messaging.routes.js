const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { sendMessageSchema } = require('./messaging.validation');
const { sendMessage } = require('./messaging.controller');

const router = Router();

router.post('/send', auth, authorize('admin', 'secretary'), validate(sendMessageSchema), sendMessage);

module.exports = router;
