const { asyncHandler } = require('../../lib/asyncHandler');
const balanceService = require('./balance.service');

const getBalance = asyncHandler(async (req, res) => {
  const result = await balanceService.getBalance(req.params.id);
  res.json(result);
});

const transferCredit = asyncHandler(async (req, res) => {
  const result = await balanceService.transferCredit(req.params.id, req.body);
  res.json(result);
});

module.exports = { getBalance, transferCredit };
