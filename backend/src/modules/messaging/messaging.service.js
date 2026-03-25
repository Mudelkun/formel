const { randomUUID } = require('crypto');
const { eq, and, inArray } = require('drizzle-orm');
const { db } = require('../../config/database');
const { contacts } = require('../../db/schema/contacts');
const { students } = require('../../db/schema/students');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { env } = require('../../config/env');
const { AppError } = require('../../lib/apiError');
const { getBalance, getBulkBalances } = require('../balance/balance.service');

// ---------------------------------------------------------------------------
// In-memory job store for background bulk sends
// ---------------------------------------------------------------------------
const jobs = new Map();

function createJob() {
  const id = randomUUID();
  jobs.set(id, { id, status: 'pending', total: 0, sent: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null, errors: [] });
  return id;
}

function getJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new AppError(404, 'Job introuvable');
  return job;
}

/**
 * Run async tasks with a max concurrency limit.
 * Wall-clock time ≈ ceil(N / limit) × avg_send_time instead of N × avg_send_time.
 */
async function runWithConcurrency(tasks, limit = 20) {
  for (let i = 0; i < tasks.length; i += limit) {
    await Promise.all(tasks.slice(i, i + limit).map((fn) => fn()));
  }
}

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
    from: env.RESEND_FROM_EMAIL,
    to: contact.email,
    subject,
    text: body,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new AppError(500, `Failed to send email: ${error.message}`);
  }

  return { success: true, to: contact.email };
}

/**
 * Resolve the list of students matching the recipient criteria, along with
 * their resolved contact(s) to email.
 *
 * Contact resolution:
 *  - 1 contact → use it regardless of isPrimary
 *  - multiple contacts + sendToAllContacts → use all with email
 *  - multiple contacts + !sendToAllContacts → use primary; fall back to first with email
 */
/**
 * Resolve send targets using bulk queries — O(1) DB round trips regardless of N.
 *
 * Query breakdown:
 *   1. active school year          (1 query)
 *   2. all active enrollments      (1 query, with classGroupId filter if provided)
 *   3-7. getBulkBalances           (5 parallel queries — only when recipientType = 'outstanding_balance')
 *   3|8. all contacts              (1 query for all studentIds at once)
 *
 * Total: 3–8 queries for any N, vs. the previous O(N×7).
 */
async function resolveRecipients({ recipientType, classGroupId, dueDateBefore, sendToAllContacts = false }) {
  const effectiveCutoff = dueDateBefore || new Date().toISOString().split('T')[0];

  const [activeYear] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  if (!activeYear) return [];

  const conditions = [
    eq(enrollments.schoolYearId, activeYear.id),
    eq(enrollments.status, 'enrolled'),
  ];
  if (classGroupId) conditions.push(eq(classes.classGroupId, classGroupId));

  const activeEnrollments = await db
    .select({
      enrollmentId: enrollments.id,
      studentId: enrollments.studentId,
      classGroupId: classes.classGroupId,
      schoolYearId: enrollments.schoolYearId,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(and(...conditions));

  if (activeEnrollments.length === 0) return [];

  const studentIds = activeEnrollments.map((e) => e.studentId);

  // Bulk fetch balances + contacts in parallel when possible
  const [balanceMap, allContacts] = await Promise.all([
    recipientType === 'outstanding_balance'
      ? getBulkBalances(activeEnrollments, activeYear.id)
      : Promise.resolve(new Map()),
    db.select().from(contacts).where(inArray(contacts.studentId, studentIds)),
  ]);

  const contactsByStudent = new Map();
  for (const c of allContacts) {
    if (!contactsByStudent.has(c.studentId)) contactsByStudent.set(c.studentId, []);
    contactsByStudent.get(c.studentId).push(c);
  }

  const targets = [];

  for (const enrollment of activeEnrollments) {
    const student = { id: enrollment.studentId, firstName: enrollment.studentFirstName, lastName: enrollment.studentLastName };

    let balance = null;
    if (recipientType === 'outstanding_balance') {
      balance = balanceMap.get(student.id);
      if (!balance) continue;
      const hasOutstanding = balance.versements.some((v) => v.amountRemaining > 0 && v.dueDate <= effectiveCutoff);
      if (!hasOutstanding) continue;
    }

    const studentContacts = contactsByStudent.get(student.id) || [];
    let resolvedContacts;
    if (studentContacts.length === 0) {
      resolvedContacts = [];
    } else if (studentContacts.length === 1) {
      resolvedContacts = studentContacts[0].email ? [studentContacts[0]] : [];
    } else if (sendToAllContacts) {
      resolvedContacts = studentContacts.filter((c) => c.email);
    } else {
      const primary = studentContacts.find((c) => c.isPrimary && c.email);
      resolvedContacts = primary ? [primary] : (studentContacts.find((c) => c.email) ? [studentContacts.find((c) => c.email)] : []);
    }

    targets.push({ student, balance, resolvedContacts });
  }

  return targets;
}

async function getBulkPreview({ recipientType, classGroupId, dueDateBefore, sendToAllContacts }) {
  const targets = await resolveRecipients({ recipientType, classGroupId, dueDateBefore, sendToAllContacts });

  return {
    totalStudents: targets.length,
    willNotify: targets.filter((t) => t.resolvedContacts.length > 0).length,
    skipped: targets.filter((t) => t.resolvedContacts.length === 0).length,
    students: targets.map((t) => ({
      id: t.student.id,
      name: `${t.student.firstName} ${t.student.lastName}`,
      amountRemaining: t.balance?.total.amountRemaining ?? null,
      contactEmails: t.resolvedContacts.map((c) => c.email),
      hasContacts: t.resolvedContacts.length > 0,
    })),
  };
}

function buildPaymentReminderHtml(student, balance) {
  const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' HTG';

  const unpaidVersements = balance.versements.filter((v) => v.amountRemaining > 0);

  const versementRows = unpaidVersements.map((v) => {
    const partial = v.amountPaid > 0;
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">
        ${v.name}
        ${partial ? `<span style="margin-left:6px;font-size:11px;color:#6b7280;">(partiel)</span>` : ''}
      </td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${v.dueDate || '—'}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626;text-align:right;border-bottom:1px solid #f3f4f6;">${fmt(v.amountRemaining)}</td>
    </tr>`;
  }).join('');

  const bookRow = balance.books.amountRemaining > 0
    ? `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">
          Frais de livres
          ${balance.books.amountPaid > 0 ? `<span style="margin-left:6px;font-size:11px;color:#6b7280;">(partiel)</span>` : ''}
        </td>
        <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">—</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626;text-align:right;border-bottom:1px solid #f3f4f6;">${fmt(balance.books.amountRemaining)}</td>
      </tr>`
    : '';

  const hasRows = unpaidVersements.length > 0 || bookRow;
  const versementSection = hasRows
    ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">D&#233;tail</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">&#201;ch&#233;ance</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Restant</th>
          </tr>
        </thead>
        <tbody>${versementRows}${bookRow}</tbody>
      </table>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#1e40af;padding:28px 24px;text-align:center;">
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Rappel de paiement</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="color:#111827;font-size:15px;">Cher parent / tuteur de <strong>${student.firstName} ${student.lastName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.6;">Nous vous contactons pour vous informer qu&apos;un solde reste d&ucirc; pour l&apos;ann&eacute;e scolaire en cours.</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:18px 16px;border-radius:4px;margin:24px 0;">
        <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Montant restant d&ucirc;</p>
        <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#dc2626;">${fmt(balance.total.amountRemaining)}</p>
      </div>
      ${versementSection}
      <p style="color:#374151;font-size:14px;line-height:1.6;">Nous vous prions de bien vouloir r&eacute;gulariser ce solde dans les meilleurs d&eacute;lais.</p>
      <p style="color:#374151;font-size:14px;line-height:1.6;">Pour toute question, n&apos;h&eacute;sitez pas &agrave; contacter l&apos;administration.</p>
    </div>
    <div style="background:#f3f4f6;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
        L&apos;administration de l'ecole
      </div>
  </div>
</body>
</html>`;

  return {
    subject: `Rappel de paiement - ${student.firstName} ${student.lastName}`,
    html,
  };
}

/**
 * Kick off a bulk send in the background and return a jobId immediately.
 * The caller gets { jobId } with HTTP 202; poll GET /messages/bulk-status/:jobId for progress.
 */
function sendBulkMessages({ recipients, message, sendToAllContacts = false, excludedStudentIds = [] }) {
  if (!env.RESEND_API_KEY) {
    throw new AppError(500, 'Email service not configured (missing RESEND_API_KEY)');
  }

  const jobId = createJob();
  const job = jobs.get(jobId);

  setImmediate(async () => {
    job.status = 'running';
    try {
      const targets = await resolveRecipients({
        recipientType: recipients.type,
        classGroupId: recipients.classGroupId,
        dueDateBefore: recipients.dueDateBefore,
        sendToAllContacts,
      });

      const filtered = targets.filter((t) => !excludedStudentIds.includes(t.student.id));

      // Build flat list of email tasks
      const emailTasks = [];
      for (const { student, balance, resolvedContacts } of filtered) {
        if (resolvedContacts.length === 0) continue;

        let subject, html, text;
        if (message.type === 'payment_reminder' && balance) {
          const built = buildPaymentReminderHtml(student, balance);
          subject = built.subject;
          html = built.html;
        } else {
          subject = message.subject;
          text = message.body;
        }

        for (const contact of resolvedContacts) {
          emailTasks.push({ contact, student, subject, html, text });
        }
      }

      job.total = emailTasks.length;

      const { Resend } = require('resend');
      const resend = new Resend(env.RESEND_API_KEY);

      // Send in batches of 20 concurrently — O(ceil(N/20)) rounds instead of O(N)
      await runWithConcurrency(
        emailTasks.map(({ contact, student, subject, html, text }) => async () => {
          try {
            const payload = { from: env.RESEND_FROM_EMAIL, to: contact.email, subject };
            if (html) payload.html = html;
            else payload.text = text;

            const { error } = await resend.emails.send(payload);
            if (error) throw new Error(error.message);
            job.sent++;
          } catch (err) {
            job.failed++;
            job.errors.push({ studentName: `${student.firstName} ${student.lastName}`, email: contact.email, reason: err.message });
          }
        }),
        20,
      );

      job.status = 'done';
    } catch (err) {
      job.status = 'error';
      job.errors.push({ reason: err.message });
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  });

  return { jobId };
}

/**
 * Send a payment reminder email for a single student.
 * Uses the same contact resolution and HTML template as bulk reminders.
 */
async function sendStudentPaymentReminder(studentId) {
  const balance = await getBalance(studentId);

  if (balance.total.amountRemaining <= 0) {
    throw new AppError(400, 'Aucun solde impayé pour cet élève');
  }

  const [student] = await db
    .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) throw new AppError(404, 'Student not found');

  const studentContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.studentId, studentId));

  if (studentContacts.length === 0) {
    throw new AppError(400, 'Cet élève n\'a aucun contact enregistré');
  }

  let resolvedContacts = [];
  if (studentContacts.length === 1) {
    resolvedContacts = studentContacts[0].email ? [studentContacts[0]] : [];
  } else {
    const primary = studentContacts.find((c) => c.isPrimary && c.email);
    if (primary) {
      resolvedContacts = [primary];
    } else {
      const fallback = studentContacts.find((c) => c.email);
      resolvedContacts = fallback ? [fallback] : [];
    }
  }

  if (resolvedContacts.length === 0) {
    throw new AppError(400, 'Aucun contact avec adresse email trouvé');
  }

  if (!env.RESEND_API_KEY) {
    throw new AppError(500, 'Email service not configured (missing RESEND_API_KEY)');
  }

  const { Resend } = require('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  const { subject, html } = buildPaymentReminderHtml(student, balance);

  const contact = resolvedContacts[0];
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: contact.email,
    subject,
    html,
  });

  if (error) {
    throw new AppError(500, `Échec de l'envoi : ${error.message}`);
  }

  return { success: true, to: contact.email };
}

module.exports = { sendEmail, getBulkPreview, sendBulkMessages, getJobStatus, sendStudentPaymentReminder };
