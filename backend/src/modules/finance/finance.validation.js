const { z } = require('zod');

const financeSummarySchema = z.object({
  query: z.object({
    classId: z.string().uuid().optional(),
    classGroupId: z.string().uuid().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  }),
});

const versementFinanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const groupBreakdownSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  }),
});

module.exports = { financeSummarySchema, versementFinanceSchema, groupBreakdownSchema };
