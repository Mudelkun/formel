const { z } = require('zod');

const sendMessageSchema = z.object({
  body: z.object({
    contactId: z.string().uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  }),
});

const bulkPreviewSchema = z.object({
  query: z.object({
    recipientType: z.enum(['all', 'class_group', 'outstanding_balance']),
    classGroupId: z.string().uuid().optional(),
    dueDateBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sendToAllContacts: z.enum(['true', 'false']).optional(),
  }),
});

const sendBulkSchema = z.object({
  body: z.object({
    recipients: z.object({
      type: z.enum(['all', 'class_group', 'outstanding_balance']),
      classGroupId: z.string().uuid().optional(),
      dueDateBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    message: z.object({
      type: z.enum(['payment_reminder', 'custom']),
      subject: z.string().min(1).max(200).optional(),
      body: z.string().min(1).max(5000).optional(),
    }),
    sendToAllContacts: z.boolean().optional().default(false),
    excludedStudentIds: z.array(z.string().uuid()).optional().default([]),
  }),
});

module.exports = { sendMessageSchema, bulkPreviewSchema, sendBulkSchema };
