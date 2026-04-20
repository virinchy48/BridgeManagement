const cds = require('@sap/cds')
const { INSERT, UPDATE, SELECT } = cds.ql

async function recordActivity(userId, displayName, path) {
  if (!userId || userId === 'system' || userId === 'anonymous') return
  try {
    const db = await cds.connect.to('db')
    const existing = await db.run(
      SELECT.one.from('bridge.management.UserActivity').where({ userId })
    )
    if (existing) {
      await db.run(
        UPDATE('bridge.management.UserActivity')
          .set({
            lastSeenAt: new Date().toISOString(),
            lastPath: path || null,
            actionCount: (existing.actionCount || 0) + 1
          })
          .where({ userId })
      )
    } else {
      await db.run(
        INSERT.into('bridge.management.UserActivity').entries({
          userId,
          displayName: displayName || userId,
          lastSeenAt: new Date().toISOString(),
          lastPath: path || null,
          sessionCount: 1,
          actionCount: 1
        })
      )
    }
  } catch (error) {
    // Never block the request
    console.error('[user-activity]', error.message)
  }
}

module.exports = { recordActivity }
