const { asyncHandler } = require('../../lib/asyncHandler');
const enrollmentsService = require('./enrollments.service');

const listEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentsService.listEnrollments(req.query);
  res.json(result);
});

const createEnrollment = asyncHandler(async (req, res) => {
  const result = await enrollmentsService.createEnrollment(req.body, req.user.userId);
  res.status(201).json(result);
});

const getEnrollment = asyncHandler(async (req, res) => {
  const result = await enrollmentsService.getEnrollmentById(req.params.id);
  res.json(result);
});

const updateEnrollment = asyncHandler(async (req, res) => {
  const result = await enrollmentsService.updateEnrollment(req.params.id, req.body, req.user.userId);
  res.json(result);
});

module.exports = { listEnrollments, createEnrollment, getEnrollment, updateEnrollment };
