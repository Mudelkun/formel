const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { financeSummarySchema } = require('./finance.validation');
const { getSummary } = require('./finance.controller');

const router = Router();

router.get('/summary', auth, authorize('admin'), validate(financeSummarySchema), getSummary);

module.exports = router;
