const { z } = require('zod');

const createStudentSchema = z.object({
  body: z.object({
    nie: z.string().optional(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    gender: z.enum(['male', 'female', 'other']),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
    address: z.string().optional(),
    scholarshipRecipient: z.boolean().optional().default(false),
  }),
});

const updateStudentSchema = z.object({
  body: z.object({
    nie: z.string().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
    address: z.string().nullable().optional(),
    scholarshipRecipient: z.boolean().optional(),
    status: z.enum(['active', 'transfer', 'expelled', 'graduated']).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

const listStudentsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    status: z.enum(['active', 'transfer', 'expelled', 'graduated']).optional(),
    classId: z.string().uuid().optional(),
    scholarship: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

const studentIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
};
