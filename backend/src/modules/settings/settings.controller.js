const { asyncHandler } = require('../../lib/asyncHandler');
const settingsService = require('./settings.service');

const getSettings = asyncHandler(async (req, res) => {
  const result = await settingsService.getSettings();
  res.json(result);
});

const updateSettings = asyncHandler(async (req, res) => {
  const result = await settingsService.updateSettings(req.body, req.user.userId);
  res.json(result);
});

module.exports = { getSettings, updateSettings };
