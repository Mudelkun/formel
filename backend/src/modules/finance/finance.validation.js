const { z } = require('zod');

const financeSummarySchema = z.object({
  query: z.object({
    classId: z.string().uuid().optional(),
    quarterId: z.string().uuid().optional(),
  }),
});

const quarterFinanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { financeSummarySchema, quarterFinanceSchema };
