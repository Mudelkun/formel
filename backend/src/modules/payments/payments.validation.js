const { z } = require('zod');

const listAllPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'completed', 'failed']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const listPaymentsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const createPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    paymentMethod: z.string().min(1).max(50).optional(),
    isBookPayment: z.preprocess((v) => v === true || v === 'true', z.boolean()).optional().default(false),
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
  listAllPaymentsSchema,
  listPaymentsSchema,
  createPaymentSchema,
  getPaymentSchema,
  updatePaymentSchema,
};
