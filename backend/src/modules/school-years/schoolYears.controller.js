const { asyncHandler } = require('../../lib/asyncHandler');
const schoolYearsService = require('./schoolYears.service');

const listSchoolYears = asyncHandler(async (req, res) => {
  const result = await schoolYearsService.listSchoolYears(req.query);
  res.json(result);
});

const createSchoolYear = asyncHandler(async (req, res) => {
  const result = await schoolYearsService.createSchoolYear(req.body, req.user.userId);
  res.status(201).json(result);
});

const getSchoolYear = asyncHandler(async (req, res) => {
  const result = await schoolYearsService.getSchoolYearById(req.params.id);
  res.json(result);
});

const updateSchoolYear = asyncHandler(async (req, res) => {
  const result = await schoolYearsService.updateSchoolYear(req.params.id, req.body, req.user.userId);
  res.json(result);
});

const activateSchoolYear = asyncHandler(async (req, res) => {
  const result = await schoolYearsService.activateSchoolYear(req.params.id, req.user.userId);
  res.json(result);
});

module.exports = {
  listSchoolYears,
  createSchoolYear,
  getSchoolYear,
  updateSchoolYear,
  activateSchoolYear,
};
