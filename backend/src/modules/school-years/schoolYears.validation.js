const { z } = require('zod');

const listSchoolYearsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const createSchoolYearSchema = z.object({
  body: z.object({
    year: z.string().min(1).max(20),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const updateSchoolYearSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    year: z.string().min(1).max(20).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

const schoolYearIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  listSchoolYearsSchema,
  createSchoolYearSchema,
  updateSchoolYearSchema,
  schoolYearIdParamSchema,
};
