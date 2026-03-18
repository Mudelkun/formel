const { z } = require('zod');

const listClassesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    gradeLevel: z.coerce.number().int().positive(),
    annualTuitionFee: z.string().regex(/^\d+(\.\d{1,2})?$/),
  }),
});

const updateClassSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    gradeLevel: z.coerce.number().int().positive().optional(),
    annualTuitionFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  }),
});

const classIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  listClassesSchema,
  createClassSchema,
  updateClassSchema,
  classIdParamSchema,
};
