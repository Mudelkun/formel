const { asyncHandler } = require('../../lib/asyncHandler');
const paymentsService = require('./payments.service');

const listPayments = asyncHandler(async (req, res) => {
  const data = await paymentsService.listPayments(req.params.id);
  res.json({ data });
});

const createPayment = asyncHandler(async (req, res) => {
  const result = await paymentsService.createPayment(
    req.params.id,
    req.body,
    req.user.role,
    req.user.userId,
  );
  res.status(201).json(result);
});

const getPayment = asyncHandler(async (req, res) => {
  const result = await paymentsService.getPaymentById(req.params.id);
  res.json(result);
});

const updatePayment = asyncHandler(async (req, res) => {
  const result = await paymentsService.updatePayment(
    req.params.id,
    req.body,
    req.user.role,
    req.user.userId,
  );
  res.json(result);
});

module.exports = { listPayments, createPayment, getPayment, updatePayment };
