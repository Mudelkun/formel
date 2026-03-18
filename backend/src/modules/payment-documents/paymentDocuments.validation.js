const { z } = require('zod');

const paymentIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const deletePaymentDocSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    docId: z.string().uuid(),
  }),
});

module.exports = { paymentIdParamSchema, deletePaymentDocSchema };
