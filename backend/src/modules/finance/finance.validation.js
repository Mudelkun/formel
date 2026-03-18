const { z } = require('zod');

const financeSummarySchema = z.object({
  query: z.object({
    classId: z.string().uuid().optional(),
    classGroupId: z.string().uuid().optional(),
  }),
});

const versementFinanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { financeSummarySchema, versementFinanceSchema };
