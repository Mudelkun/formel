const { asyncHandler } = require('../../lib/asyncHandler');
const usersService = require('./users.service');

const listUsers = asyncHandler(async (req, res) => {
  const result = await usersService.listUsers(req.query);
  res.json(result);
});

const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json(user);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  res.json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  res.json(user);
});

const deleteUser = asyncHandler(async (req, res) => {
  await usersService.deactivateUser(req.params.id, req.user.userId);
  res.json({ message: 'User deactivated' });
});

module.exports = { listUsers, createUser, getUser, updateUser, deleteUser };
