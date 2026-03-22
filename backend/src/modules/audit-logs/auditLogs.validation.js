const { z } = require('zod');

const listAuditLogsSchema = z.object({
  query: z.object({
    tableName: z.string().optional(),
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

module.exports = { listAuditLogsSchema };
