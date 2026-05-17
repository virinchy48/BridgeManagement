const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

const router = express.Router()

router.get('/activity', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const users = await db.run(
      SELECT.from('bridge.management.UserActivity')
        .columns('userId', 'lastSeenAt', 'sessionId', 'status', 'ipAddress')
        .orderBy('lastSeenAt desc')
        .limit(50)
    )
    res.json({ users: users || [] })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

router.get('/summary', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const [total, activeToday, activeThisWeek] = await Promise.all([
      db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')),
      db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')
        .where('lastSeenAt >=', new Date(Date.now() - 86400000).toISOString())),
      db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')
        .where('lastSeenAt >=', new Date(Date.now() - 7 * 86400000).toISOString()))
    ])
    res.json({
      totalUsers: Number(total?.cnt || 0),
      activeToday: Number(activeToday?.cnt || 0),
      activeThisWeek: Number(activeThisWeek?.cnt || 0)
    })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

module.exports = router
