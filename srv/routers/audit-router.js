const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

const router = express.Router()

router.get('/changes', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const { objectType, objectId, user: changedBy, source, from, to, batchId, fieldName, offset: offsetStr, limit: limitStr } = req.query

    const pageLimit  = Math.min(parseInt(limitStr)  || 200, 1000)
    const pageOffset = Math.max(parseInt(offsetStr) || 0,   0)

    let query = SELECT.from('bridge.management.ChangeLog')
      .columns('ID', 'changedAt', 'changedBy', 'objectType', 'objectId', 'objectName',
               'fieldName', 'oldValue', 'newValue', 'changeSource', 'batchId')
      .orderBy('changedAt desc', 'objectType', 'objectId', 'batchId')
      .limit(pageLimit, pageOffset)

    const filters = []
    if (objectType) filters.push({ objectType })
    if (objectId)   filters.push({ objectId })
    if (changedBy)  filters.push({ changedBy })
    if (source)     filters.push({ changeSource: source })
    if (batchId)    filters.push({ batchId })
    if (fieldName)  filters.push({ fieldName })

    for (const filter of filters) {
      query = query.where(filter)
    }
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
    if (from) {
      if (!ISO_DATE.test(from) || isNaN(Date.parse(from))) return res.status(400).json({ error: { message: 'Invalid from date — use YYYY-MM-DD' } })
      query = query.where('changedAt >=', new Date(from).toISOString())
    }
    if (to) {
      if (!ISO_DATE.test(to) || isNaN(Date.parse(to))) return res.status(400).json({ error: { message: 'Invalid to date — use YYYY-MM-DD' } })
      query = query.where('changedAt <=', new Date(to + 'T23:59:59Z').toISOString())
    }

    const rows = await db.run(query)
    res.json({
      changes: rows || [],
      value:   rows || [],
      count:   (rows || []).length,
      offset:  pageOffset,
      limit:   pageLimit,
      hasMore: (rows || []).length === pageLimit
    })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load change log' } })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const [totalChanges, byType, bySource, recentUsers] = await Promise.all([
      db.run(SELECT.one.from('bridge.management.ChangeLog').columns('count(1) as cnt')),
      db.run(SELECT.from('bridge.management.ChangeLog').columns('objectType', 'count(1) as cnt').groupBy('objectType')),
      db.run(SELECT.from('bridge.management.ChangeLog').columns('changeSource', 'count(1) as cnt').groupBy('changeSource')),
      db.run(SELECT.from('bridge.management.ChangeLog').columns('changedBy', 'count(1) as cnt').groupBy('changedBy').orderBy('cnt desc').limit(10))
    ])
    res.json({
      totalChanges: Number(totalChanges?.cnt || 0),
      byObjectType: byType || [],
      bySource: bySource || [],
      topUsers: recentUsers || []
    })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load audit summary' } })
  }
})

module.exports = router
