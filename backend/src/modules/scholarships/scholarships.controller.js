const { asyncHandler } = require('../../lib/asyncHandler');
const scholarshipsService = require('./scholarships.service');

const getScholarship = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.getScholarship(req.params.id);
  res.json(result);
});

const createScholarship = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.createScholarship(req.params.id, req.body, req.user.userId);
  res.status(201).json(result);
});

const updateScholarship = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.updateScholarship(req.params.id, req.body, req.user.userId);
  res.json(result);
});

const deleteScholarship = asyncHandler(async (req, res) => {
  await scholarshipsService.deleteScholarship(req.params.id, req.user.userId);
  res.status(204).send();
});

module.exports = { getScholarship, createScholarship, updateScholarship, deleteScholarship };
