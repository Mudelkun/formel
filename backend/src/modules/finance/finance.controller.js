const { asyncHandler } = require('../../lib/asyncHandler');
const financeService = require('./finance.service');

const getSummary = asyncHandler(async (req, res) => {
  const result = await financeService.getSummary(req.query);
  res.json(result);
});

const getVersementFinance = asyncHandler(async (req, res) => {
  const result = await financeService.getVersementFinance(req.params.id);
  res.json(result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await financeService.getDashboardStats();
  res.json(result);
});

module.exports = { getSummary, getVersementFinance, getDashboardStats };
