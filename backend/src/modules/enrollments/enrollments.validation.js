const { z } = require('zod');

const listEnrollmentsSchema = z.object({
  query: z.object({
    schoolYearId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const createEnrollmentSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    classId: z.string().uuid(),
    schoolYearId: z.string().uuid(),
  }),
});

const enrollmentIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  listEnrollmentsSchema,
  createEnrollmentSchema,
  enrollmentIdParamSchema,
};
