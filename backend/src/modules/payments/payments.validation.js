const { z } = require('zod');

const listPaymentsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const createPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    paymentMethod: z.string().min(1).max(50).optional(),
    isBookPayment: z.boolean().optional().default(false),
    notes: z.string().optional(),
  }),
});

const getPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const updatePaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['pending', 'completed', 'failed']).optional(),
    notes: z.string().nullable().optional(),
  }),
});

module.exports = {
  listPaymentsSchema,
  createPaymentSchema,
  getPaymentSchema,
  updatePaymentSchema,
};
