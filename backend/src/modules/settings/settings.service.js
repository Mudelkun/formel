const { db } = require('../../config/database');
const { schoolSettings } = require('../../db/schema/schoolSettings');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function getSettings() {
  const [settings] = await db.select().from(schoolSettings).limit(1);

  if (!settings) {
    throw new AppError(404, 'School settings not configured');
  }

  return settings;
}

async function updateSettings(data, userId) {
  const [existing] = await db.select().from(schoolSettings).limit(1);

  let result;

  if (!existing) {
    const [created] = await db
      .insert(schoolSettings)
      .values({ ...data })
      .returning();
    logAudit(userId, 'create', 'school_settings', created.id, null, created);
    result = created;
  } else {
    const [updated] = await db
      .update(schoolSettings)
      .set({ ...data, updatedAt: new Date() })
      .returning();
    logAudit(userId, 'update', 'school_settings', existing.id, existing, updated);
    result = updated;
  }

  return result;
}

module.exports = { getSettings, updateSettings };
