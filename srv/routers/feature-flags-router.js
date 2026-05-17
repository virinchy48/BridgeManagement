const cds = require('@sap/cds')
const express = require('express')
const { SELECT, UPDATE } = cds.ql
const { writeChangeLogs } = require('../audit-log')
const { isFeatureEnabled, DEPENDENCIES } = require('../feature-flags')

const router = express.Router()
router.use(express.json())

router.get('/', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.SystemConfig')
        .where({ category: 'Feature Flags' })
        .orderBy('sortOrder')
    )
    const flags = rows.map(r => ({
      flagKey: r.configKey.replace(/^feature\./, ''),
      enabled: r.value === 'true',
      label:   r.label,
      description: r.description,
    }))
    res.json({ flags })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.patch('/:key', async (req, res) => {
  try {
    const flagKey = req.params.key
    const configKey = 'feature.' + flagKey
    const { enabled } = req.body || {}
    if (typeof enabled !== 'boolean')
      return res.status(400).json({ error: { message: "'enabled' must be a boolean" } })

    const db = await cds.connect.to('db')

    const existing = await db.run(
      SELECT.one.from('bridge.management.SystemConfig').where({ configKey })
    )
    if (!existing)
      return res.status(404).json({ error: { message: `Unknown feature flag: '${flagKey}'` } })

    if (enabled && DEPENDENCIES[flagKey]) {
      const parentKey = DEPENDENCIES[flagKey]
      const parentEnabled = await isFeatureEnabled(parentKey)
      if (!parentEnabled)
        return res.status(422).json({
          error: { message: `Cannot enable '${flagKey}': requires '${parentKey}' to be enabled first.` }
        })
    }

    const oldValue = existing.value
    const newValue = enabled ? 'true' : 'false'

    const cascaded = []
    if (!enabled && flagKey === 'bhiBsiAssessment') {
      const children = Object.keys(DEPENDENCIES).filter(k => DEPENDENCIES[k] === flagKey)
      for (const child of children) {
        const childKey = 'feature.' + child
        const childRow = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: childKey }))
        if (childRow && childRow.value === 'true') {
          await db.run(UPDATE('bridge.management.SystemConfig')
            .set({ value: 'false', modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
            .where({ configKey: childKey }))
          cascaded.push(child)
          await writeChangeLogs(db, {
            objectType: 'SystemConfig', objectId: childKey,
            objectName: childRow.label, source: 'FeatureFlags',
            batchId: `ff-cascade-${Date.now()}`,
            changedBy: req.user?.id || 'system',
            changes: [{ fieldName: 'value', oldValue: 'true', newValue: 'false' }]
          })
          const { invalidateCache } = require('../system-config')
          invalidateCache(childKey)
        }
      }
    }

    await db.run(UPDATE('bridge.management.SystemConfig')
      .set({ value: newValue, modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
      .where({ configKey }))

    const { invalidateCache } = require('../system-config')
    invalidateCache(configKey)

    await writeChangeLogs(db, {
      objectType: 'SystemConfig', objectId: configKey,
      objectName: existing.label, source: 'FeatureFlags',
      batchId: `ff-${Date.now()}`,
      changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'value', oldValue, newValue }]
    })

    res.json({
      flagKey, previousValue: oldValue === 'true', newValue: enabled,
      cascadeDisabled: cascaded,
      changedBy: req.user?.id || 'system',
      changedAt: new Date().toISOString(),
    })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

module.exports = router
