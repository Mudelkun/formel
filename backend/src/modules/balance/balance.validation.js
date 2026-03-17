const { z } = require('zod');

const getBalanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    quarterId: z.string().uuid().optional(),
  }),
});

module.exports = { getBalanceSchema };
