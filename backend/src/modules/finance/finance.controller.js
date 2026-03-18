const { asyncHandler } = require('../../lib/asyncHandler');
const financeService = require('./finance.service');

const getSummary = asyncHandler(async (req, res) => {
  const result = await financeService.getSummary(req.query);
  res.json(result);
});

const getQuarterFinance = asyncHandler(async (req, res) => {
  const result = await financeService.getQuarterFinance(req.params.id);
  res.json(result);
});

module.exports = { getSummary, getQuarterFinance };
