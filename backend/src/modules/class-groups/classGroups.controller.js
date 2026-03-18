const { asyncHandler } = require('../../lib/asyncHandler');
const classGroupsService = require('./classGroups.service');

const listClassGroups = asyncHandler(async (req, res) => {
  const result = await classGroupsService.listClassGroups(req.query);
  res.json(result);
});

const createClassGroup = asyncHandler(async (req, res) => {
  const result = await classGroupsService.createClassGroup(req.body, req.user.userId);
  res.status(201).json(result);
});

const getClassGroup = asyncHandler(async (req, res) => {
  const result = await classGroupsService.getClassGroupById(req.params.id);
  res.json(result);
});

const updateClassGroup = asyncHandler(async (req, res) => {
  const result = await classGroupsService.updateClassGroup(req.params.id, req.body, req.user.userId);
  res.json(result);
});

const deleteClassGroup = asyncHandler(async (req, res) => {
  await classGroupsService.deleteClassGroup(req.params.id, req.user.userId);
  res.status(204).end();
});

module.exports = { listClassGroups, createClassGroup, getClassGroup, updateClassGroup, deleteClassGroup };
