const { z } = require('zod');

const listClassGroupsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const createClassGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
  }),
});

const updateClassGroupSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
  }),
});

const classGroupIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  listClassGroupsSchema,
  createClassGroupSchema,
  updateClassGroupSchema,
  classGroupIdParamSchema,
};
