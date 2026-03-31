const { asyncHandler } = require('../../lib/asyncHandler');
const usersService = require('./users.service');
const { logAudit } = require('../../lib/auditLogger');

const listUsers = asyncHandler(async (req, res) => {
  const result = await usersService.listUsers(req.query);
  res.json(result);
});

const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body);
  await logAudit(req.user.userId, 'CREATE', 'users', user.id, null, user);
  res.status(201).json(user);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  res.json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  const before = await usersService.getUserById(req.params.id);
  const user = await usersService.updateUser(req.params.id, req.body);
  await logAudit(req.user.userId, 'UPDATE', 'users', user.id, before, user);
  res.json(user);
});

const deleteUser = asyncHandler(async (req, res) => {
  await usersService.deactivateUser(req.params.id, req.user.userId);
  await logAudit(req.user.userId, 'DEACTIVATE', 'users', req.params.id, null, null);
  res.json({ message: 'User deactivated' });
});

module.exports = { listUsers, createUser, getUser, updateUser, deleteUser };
