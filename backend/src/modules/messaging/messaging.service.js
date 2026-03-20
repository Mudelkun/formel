const { eq } = require('drizzle-orm');
const { db } = require('../../config/database');
const { contacts } = require('../../db/schema/contacts');
const { env } = require('../../config/env');
const { AppError } = require('../../lib/apiError');

async function sendEmail({ contactId, subject, body }) {
  // Look up contact
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId));

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  if (!contact.email) {
    throw new AppError(400, 'Contact has no email address');
  }

  if (!env.RESEND_API_KEY) {
    throw new AppError(500, 'Email service not configured (missing RESEND_API_KEY)');
  }

  const { Resend } = require('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: 'Formel <onboarding@resend.dev>',
    to: contact.email,
    subject,
    text: body,
  });

  if (error) {
    throw new AppError(500, `Failed to send email: ${error.message}`);
  }

  return { success: true, to: contact.email };
}

module.exports = { sendEmail };
