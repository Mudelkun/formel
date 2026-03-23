const { z } = require('zod');

const getBalanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const creditTransferSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    from: z.enum(['tuition', 'books']),
    amount: z.number().positive(),
  }),
});

module.exports = { getBalanceSchema, creditTransferSchema };
