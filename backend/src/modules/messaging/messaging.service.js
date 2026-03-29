const { randomUUID } = require('crypto');
const { eq, and, inArray } = require('drizzle-orm');
const { db } = require('../../config/database');
const { contacts } = require('../../db/schema/contacts');
const { students } = require('../../db/schema/students');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { schoolYears } = require('../../db/schema/schoolYears');
const { env } = require('../../config/env');
const { desc } = require('drizzle-orm');
const { AppError } = require('../../lib/apiError');
const { getBalance, getBulkBalances } = require('../balance/balance.service');
const { schoolSettings } = require('../../db/schema/schoolSettings');
const { messageLogs } = require('../../db/schema/messageLogs');

async function fetchSchoolSettings() {
  const [s] = await db.select().from(schoolSettings).limit(1);
  return s || {};
}

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

async function sendEmail({ contactId, subject, body }, userId) {
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

  const school = await fetchSchoolSettings();

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: contact.email,
    subject,
    html: buildCustomEmailHtml(subject, body, school),
  });

  if (error) {
    console.error('Resend error:', error);
    // Log failed send
    if (userId) {
      await db.insert(messageLogs).values({
        type: 'individual', messageType: 'custom', subject, body,
        recipientSummary: `${contact.firstName} ${contact.lastName} — ${contact.email}`,
        totalRecipients: 1, sent: 0, failed: 1, status: 'error',
        errors: JSON.stringify([{ email: contact.email, reason: error.message }]),
        sentById: userId, finishedAt: new Date(),
      }).catch((e) => console.error('Failed to insert message log:', e));
    }
    throw new AppError(500, `Failed to send email: ${error.message}`);
  }

  // Log successful send
  if (userId) {
    await db.insert(messageLogs).values({
      type: 'individual', messageType: 'custom', subject, body,
      recipientSummary: `${contact.firstName} ${contact.lastName} — ${contact.email}`,
      totalRecipients: 1, sent: 1, failed: 0, status: 'done',
      errors: '[]', sentById: userId, finishedAt: new Date(),
    }).catch((e) => console.error('Failed to insert message log:', e));
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

function buildSchoolInfoBlock(school) {
  const lines = [
    school.schoolName,
    school.address,
    school.phone,
    school.email,
  ].filter(Boolean);
  return lines.map((l) => `<span>${l.replace(/</g, '&lt;')}</span>`).join('<br>');
}

function buildPaymentReminderHtml(student, balance, school = {}) {
  const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' HTG';

  const unpaidVersements = balance.versements.filter((v) => v.amountRemaining > 0);

  const versementRows = unpaidVersements.map((v) => {
    const partial = v.amountPaid > 0;
    return `<tr>
      <td style="padding:10px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #f3f4f6;">
        ${v.name}${partial ? `&nbsp;<span style="font-size:11px;color:#9ca3af;font-style:italic;">(paiement partiel)</span>` : ''}
      </td>
      <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${v.dueDate || '—'}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#dc2626;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${fmt(v.amountRemaining)}</td>
    </tr>`;
  }).join('');

  const bookRow = balance.books.amountRemaining > 0
    ? `<tr>
        <td style="padding:10px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #f3f4f6;">
          Frais de livres${balance.books.amountPaid > 0 ? `&nbsp;<span style="font-size:11px;color:#9ca3af;font-style:italic;">(paiement partiel)</span>` : ''}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">—</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#dc2626;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${fmt(balance.books.amountRemaining)}</td>
      </tr>`
    : '';

  const hasRows = unpaidVersements.length > 0 || bookRow;
  const versementSection = hasRows
    ? `<table style="width:100%;border-collapse:collapse;margin:24px 0;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;">D&eacute;tail</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;">&Eacute;ch&eacute;ance</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;">Restant d&ucirc;</th>
          </tr>
        </thead>
        <tbody>${versementRows}${bookRow}</tbody>
      </table>`
    : '';

  const schoolInfo = buildSchoolInfoBlock(school);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rappel de paiement</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <!-- Header -->
    <div style="background:#1e3a8a;border-radius:10px 10px 0 0;padding:24px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#93c5fd;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Rappel de paiement</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:15px;color:#111827;">Cher(e) parent&nbsp;/ tuteur de <strong>${student.firstName} ${student.lastName}</strong>,</p>
      <p style="margin:16px 0 0;font-size:14px;color:#4b5563;line-height:1.7;">
        Nous vous contactons afin de vous informer qu&rsquo;un montant demeure impay&eacute; pour l&rsquo;ann&eacute;e scolaire en cours.
        Nous vous prions de bien vouloir r&eacute;gulariser cette situation dans les meilleurs d&eacute;lais.
      </p>

      <!-- Amount box -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px 24px;margin:24px 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Montant total restant d&ucirc;</p>
        <p style="margin:8px 0 0;font-size:30px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;">${fmt(balance.total.amountRemaining)}</p>
      </div>

      ${versementSection}

      <p style="margin:20px 0 0;font-size:14px;color:#4b5563;line-height:1.7;">
        Pour effectuer votre paiement ou pour toute question concernant votre situation, veuillez contacter directement l&rsquo;administration de l&rsquo;&eacute;tablissement.
      </p>
      <p style="margin:16px 0 0;font-size:14px;color:#4b5563;line-height:1.7;">
        Nous vous remercions de votre diligence et restons &agrave; votre disposition.
      </p>
      <p style="margin:24px 0 0;font-size:14px;color:#374151;">
        Veuillez agr&eacute;er, cher(e) parent, l&rsquo;expression de nos salutations distingu&eacute;es.
      </p>
      <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#1f2937;">L&rsquo;Administration</p>
    </div>

    <!-- Footer: school info -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 28px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Informations de l&rsquo;&eacute;cole</p>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.8;">${schoolInfo}</p>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">Ce message est envoy&eacute; automatiquement &mdash; merci de ne pas r&eacute;pondre directement &agrave; cet email.</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: `Rappel de paiement – ${student.firstName} ${student.lastName}`,
    html,
  };
}

/**
 * Wrap a plain-text custom message in a branded HTML email layout.
 */
function buildCustomEmailHtml(subject, body, school = {}) {
  const escapedSubject = subject.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const escapedBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const schoolInfo = buildSchoolInfoBlock(school);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapedSubject}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <!-- Header -->
    <div style="background:#1e3a8a;border-radius:10px 10px 0 0;padding:24px 28px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Communication officielle</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#111827;">${escapedSubject}</p>
      <div style="font-size:14px;color:#374151;line-height:1.75;">${escapedBody}</div>
    </div>

    <!-- Footer: school info -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 28px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Informations de l&rsquo;&eacute;cole</p>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.8;">${schoolInfo}</p>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">Ce message est envoy&eacute; automatiquement &mdash; merci de ne pas r&eacute;pondre directement &agrave; cet email.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Kick off a bulk send in the background and return a jobId immediately.
 * The caller gets { jobId } with HTTP 202; poll GET /messages/bulk-status/:jobId for progress.
 */
function sendBulkMessages({ recipients, message, sendToAllContacts = false, excludedStudentIds = [] }, userId) {
  if (!env.RESEND_API_KEY) {
    throw new AppError(500, 'Email service not configured (missing RESEND_API_KEY)');
  }

  const jobId = createJob();
  const job = jobs.get(jobId);

  // Build a human-readable recipient summary for the log
  function buildRecipientSummary(type, filtered) {
    const count = filtered.length;
    if (type === 'all') return `Tous les élèves — ${count} élèves`;
    if (type === 'class_group') return `Groupe de classe — ${count} élèves`;
    if (type === 'outstanding_balance') return `Élèves avec solde impayé — ${count} élèves`;
    return `${count} élèves`;
  }

  setImmediate(async () => {
    job.status = 'running';
    let logId = null;
    try {
      const school = await fetchSchoolSettings();

      const targets = await resolveRecipients({
        recipientType: recipients.type,
        classGroupId: recipients.classGroupId,
        dueDateBefore: recipients.dueDateBefore,
        sendToAllContacts,
      });

      const filtered = targets.filter((t) => !excludedStudentIds.includes(t.student.id));

      const recipientSummary = buildRecipientSummary(recipients.type, filtered);

      // Build flat list of email tasks
      const emailTasks = [];
      for (const { student, balance, resolvedContacts } of filtered) {
        if (resolvedContacts.length === 0) continue;

        let subject, html;
        if (message.type === 'payment_reminder' && balance) {
          const built = buildPaymentReminderHtml(student, balance, school);
          subject = built.subject;
          html = built.html;
        } else {
          subject = message.subject;
          html = buildCustomEmailHtml(message.subject, message.body, school);
        }

        for (const contact of resolvedContacts) {
          emailTasks.push({ contact, student, subject, html });
        }
      }

      job.total = emailTasks.length;

      // Create DB log entry
      const logSubject = message.type === 'payment_reminder'
        ? 'Rappel de paiement'
        : (message.subject || 'Message groupé');
      const [inserted] = await db.insert(messageLogs).values({
        jobId,
        type: 'bulk',
        messageType: message.type,
        subject: logSubject,
        body: message.type === 'payment_reminder' ? null : (message.body || null),
        recipientSummary,
        totalRecipients: emailTasks.length,
        sent: 0,
        failed: 0,
        status: 'running',
        errors: '[]',
        sentById: userId,
      }).returning({ id: messageLogs.id });
      logId = inserted.id;

      const { Resend } = require('resend');
      const resend = new Resend(env.RESEND_API_KEY);

      // Send in batches of 20 concurrently — O(ceil(N/20)) rounds instead of O(N)
      await runWithConcurrency(
        emailTasks.map(({ contact, student, subject, html }) => async () => {
          try {
            const payload = { from: env.RESEND_FROM_EMAIL, to: contact.email, subject, html };

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
      console.error('Bulk send error:', err);
      job.status = 'error';
      job.errors.push({ reason: "Une erreur interne est survenue lors de l'envoi." });
    } finally {
      job.finishedAt = new Date().toISOString();

      // Update DB log with final results
      if (logId) {
        await db.update(messageLogs).set({
          sent: job.sent,
          failed: job.failed,
          status: job.status,
          errors: JSON.stringify(job.errors),
          finishedAt: new Date(),
        }).where(eq(messageLogs.id, logId)).catch((e) => console.error('Failed to update message log:', e));
      }
    }
  });

  return { jobId };
}

/**
 * Send a payment reminder email for a single student.
 * Uses the same contact resolution and HTML template as bulk reminders.
 */
async function sendStudentPaymentReminder(studentId, userId) {
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

  const school = await fetchSchoolSettings();
  const { subject, html } = buildPaymentReminderHtml(student, balance, school);

  const contact = resolvedContacts[0];
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: contact.email,
    subject,
    html,
  });

  const studentName = `${student.firstName} ${student.lastName}`;

  if (error) {
    if (userId) {
      await db.insert(messageLogs).values({
        type: 'individual', messageType: 'payment_reminder', subject,
        recipientSummary: `${studentName} → ${contact.email}`,
        totalRecipients: 1, sent: 0, failed: 1, status: 'error',
        errors: JSON.stringify([{ studentName, email: contact.email, reason: error.message }]),
        sentById: userId, finishedAt: new Date(),
      }).catch((e) => console.error('Failed to insert message log:', e));
    }
    throw new AppError(500, `Échec de l'envoi : ${error.message}`);
  }

  if (userId) {
    await db.insert(messageLogs).values({
      type: 'individual', messageType: 'payment_reminder', subject,
      recipientSummary: `${studentName} → ${contact.email}`,
      totalRecipients: 1, sent: 1, failed: 0, status: 'done',
      errors: '[]', sentById: userId, finishedAt: new Date(),
    }).catch((e) => console.error('Failed to insert message log:', e));
  }

  return { success: true, to: contact.email };
}

async function getMessageHistory() {
  const rows = await db
    .select()
    .from(messageLogs)
    .orderBy(desc(messageLogs.sentAt))
    .limit(50);

  return rows.map((r) => ({
    ...r,
    errors: r.errors ? JSON.parse(r.errors) : [],
  }));
}

module.exports = { sendEmail, getBulkPreview, sendBulkMessages, getJobStatus, sendStudentPaymentReminder, getMessageHistory };
