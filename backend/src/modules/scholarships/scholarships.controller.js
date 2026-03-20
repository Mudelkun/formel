const { asyncHandler } = require('../../lib/asyncHandler');
const scholarshipsService = require('./scholarships.service');

const listScholarships = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.listScholarships(req.params.id);
  res.json(result);
});

const createScholarship = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.createScholarship(req.params.id, req.body, req.user.userId);
  res.status(201).json(result);
});

const updateScholarship = asyncHandler(async (req, res) => {
  const result = await scholarshipsService.updateScholarship(req.params.scholarshipId, req.body, req.user.userId);
  res.json(result);
});

const deleteScholarship = asyncHandler(async (req, res) => {
  await scholarshipsService.deleteScholarship(req.params.scholarshipId, req.user.userId);
  res.status(204).send();
});

module.exports = { listScholarships, createScholarship, updateScholarship, deleteScholarship };
