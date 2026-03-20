const { z } = require('zod');

const sendMessageSchema = z.object({
  body: z.object({
    contactId: z.string().uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  }),
});

module.exports = { sendMessageSchema };
