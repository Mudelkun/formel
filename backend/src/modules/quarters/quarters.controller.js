const { asyncHandler } = require('../../lib/asyncHandler');
const quartersService = require('./quarters.service');

const listQuarters = asyncHandler(async (req, res) => {
  const data = await quartersService.listQuarters(req.params.id);
  res.json({ data });
});

const createQuarter = asyncHandler(async (req, res) => {
  const result = await quartersService.createQuarter(req.params.id, req.body, req.user.userId);
  res.status(201).json(result);
});

const updateQuarter = asyncHandler(async (req, res) => {
  const result = await quartersService.updateQuarter(req.params.id, req.body, req.user.userId);
  res.json(result);
});

const deleteQuarter = asyncHandler(async (req, res) => {
  await quartersService.deleteQuarter(req.params.id, req.user.userId);
  res.status(204).send();
});

module.exports = { listQuarters, createQuarter, updateQuarter, deleteQuarter };
