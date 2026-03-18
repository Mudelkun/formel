const { asyncHandler } = require('../../lib/asyncHandler');
const classesService = require('./classes.service');

const listClasses = asyncHandler(async (req, res) => {
  const result = await classesService.listClasses(req.query);
  res.json(result);
});

const createClass = asyncHandler(async (req, res) => {
  const result = await classesService.createClass(req.body, req.user.userId);
  res.status(201).json(result);
});

const getClass = asyncHandler(async (req, res) => {
  const result = await classesService.getClassById(req.params.id);
  res.json(result);
});

const updateClass = asyncHandler(async (req, res) => {
  const result = await classesService.updateClass(req.params.id, req.body, req.user.userId);
  res.json(result);
});

module.exports = { listClasses, createClass, getClass, updateClass };
