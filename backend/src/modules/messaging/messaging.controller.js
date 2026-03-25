const { asyncHandler } = require('../../lib/asyncHandler');
const messagingService = require('./messaging.service');

const sendMessage = asyncHandler(async (req, res) => {
  const result = await messagingService.sendEmail(req.body);
  res.json(result);
});

const getBulkPreview = asyncHandler(async (req, res) => {
  const { sendToAllContacts, ...rest } = req.query;
  const result = await messagingService.getBulkPreview({
    ...rest,
    sendToAllContacts: sendToAllContacts === 'true',
  });
  res.json(result);
});

const sendBulkMessages = asyncHandler(async (req, res) => {
  const result = messagingService.sendBulkMessages(req.body);
  res.status(202).json(result);
});

const getBulkJobStatus = asyncHandler(async (req, res) => {
  const result = messagingService.getJobStatus(req.params.jobId);
  res.json(result);
});

const sendStudentPaymentReminder = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const result = await messagingService.sendStudentPaymentReminder(studentId);
  res.json(result);
});

module.exports = { sendMessage, getBulkPreview, sendBulkMessages, getBulkJobStatus, sendStudentPaymentReminder };
