const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { updateVersementSchema } = require('../fees/fees.validation');
const { updateVersement } = require('../fees/fees.controller');

// Finance (nested under versements)
const { versementFinanceSchema } = require('../finance/finance.validation');
const { getVersementFinance } = require('../finance/finance.controller');

const router = Router();

// Standalone versement update
router.patch('/:id', auth, authorize('admin'), validate(updateVersementSchema), updateVersement);

// Versement finance
router.get('/:id/finance', auth, authorize('admin'), validate(versementFinanceSchema), getVersementFinance);

module.exports = router;
