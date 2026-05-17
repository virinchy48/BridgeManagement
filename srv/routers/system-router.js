const cds = require('@sap/cds')
const express = require('express')
const { SELECT, UPDATE } = cds.ql

const router = express.Router()
router.use(express.json())

router.get('/config', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.SystemConfig').orderBy('category', 'sortOrder')
    )
    res.json({ configs: rows || [] })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.patch('/config/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { value } = req.body || {}
    if (value === undefined) return res.status(400).json({ error: { message: 'value is required' } })
    const db = await cds.connect.to('db')
    const existing = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: key }))
    if (!existing) return res.status(404).json({ error: { message: 'Config key not found' } })
    if (existing.isReadOnly) return res.status(403).json({ error: { message: 'This setting is read-only' } })
    await db.run(
      UPDATE('bridge.management.SystemConfig')
        .set({ value: String(value), modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
        .where({ configKey: key })
    )
    const { invalidateCache } = require('../system-config')
    invalidateCache(key)
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.get('/banner', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const [modeRow, msgRow] = await Promise.all([
      db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'appMaintenanceMode' })),
      db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'appMaintenanceMessage' }))
    ])
    const active = modeRow?.value === 'true'
    res.json({ active, message: active ? (msgRow?.value || '') : '' })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

module.exports = router
