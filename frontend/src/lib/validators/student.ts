import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  gender: z.enum(['male', 'female'], { error: 'Genre requis' }),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ requis'),
  nie: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  scholarshipRecipient: z.boolean().optional().default(false),
  classId: z.string().min(1, 'Classe requise'),
  schoolYearId: z.string().min(1, 'Année scolaire requise'),
});

export type CreateStudentFormData = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  gender: z.enum(['male', 'female']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ requis'),
  nie: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

export type UpdateStudentFormData = z.infer<typeof updateStudentSchema>;

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().optional().or(z.literal('')),
  relationship: z.string().min(1, 'Relation requise').max(50),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateContactFormData = z.infer<typeof createContactSchema>;
