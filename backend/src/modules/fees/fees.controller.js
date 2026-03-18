const { asyncHandler } = require('../../lib/asyncHandler');
const feesService = require('./fees.service');

const getFees = asyncHandler(async (req, res) => {
  const result = await feesService.getFees(req.params.id, req.query.schoolYearId);
  res.json(result);
});

const createFees = asyncHandler(async (req, res) => {
  const result = await feesService.createFees(req.params.id, req.body, req.user.userId);
  res.status(201).json(result);
});

const updateFees = asyncHandler(async (req, res) => {
  const result = await feesService.updateFees(req.params.id, req.body, req.user.userId);
  res.json(result);
});

const updateVersement = asyncHandler(async (req, res) => {
  const result = await feesService.updateVersement(req.params.id, req.body, req.user.userId);
  res.json(result);
});

module.exports = { getFees, createFees, updateFees, updateVersement };
