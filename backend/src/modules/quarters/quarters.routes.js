const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { updateQuarterSchema, quarterIdParamSchema } = require('./quarters.validation');
const { updateQuarter, deleteQuarter } = require('./quarters.controller');

// Finance (nested under quarters)
const { quarterFinanceSchema } = require('../finance/finance.validation');
const { getQuarterFinance } = require('../finance/finance.controller');

const router = Router();

// Standalone quarter routes
router.patch('/:id', auth, authorize('admin'), validate(updateQuarterSchema), updateQuarter);
router.delete('/:id', auth, authorize('admin'), validate(quarterIdParamSchema), deleteQuarter);

// Quarter finance
router.get('/:id/finance', auth, authorize('admin'), validate(quarterFinanceSchema), getQuarterFinance);

module.exports = router;
