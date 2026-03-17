const { asyncHandler } = require('../../lib/asyncHandler');
const balanceService = require('./balance.service');

const getBalance = asyncHandler(async (req, res) => {
  const result = await balanceService.getBalance(req.params.id, req.query.quarterId);
  res.json(result);
});

module.exports = { getBalance };
