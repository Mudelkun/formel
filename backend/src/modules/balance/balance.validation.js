const { z } = require('zod');

const getBalanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { getBalanceSchema };
