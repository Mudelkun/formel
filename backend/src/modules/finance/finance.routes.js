const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { financeSummarySchema, versementFinanceSchema } = require('./finance.validation');
const { getSummary, getVersementFinance, getDashboardStats } = require('./finance.controller');

const router = Router();

router.get('/summary', auth, authorize('admin'), validate(financeSummarySchema), getSummary);
router.get('/dashboard', auth, authorize('admin', 'secretary'), getDashboardStats);
router.get('/versement/:id', auth, authorize('admin'), validate(versementFinanceSchema), getVersementFinance);

module.exports = router;
