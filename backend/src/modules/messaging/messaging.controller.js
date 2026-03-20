const { asyncHandler } = require('../../lib/asyncHandler');
const messagingService = require('./messaging.service');

const sendMessage = asyncHandler(async (req, res) => {
  const result = await messagingService.sendEmail(req.body);
  res.json(result);
});

module.exports = { sendMessage };
