const cds = require('@sap/cds')
const express = require('express')
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

const router = express.Router()
router.use(express.json({ limit: '10mb' }))

router.get('/environments', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(SELECT.from('bridge.management.BnacEnvironment').orderBy('environment'))
    res.json({ environments: rows || [] })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.post('/environments', async (req, res) => {
  try {
    const { environment, baseUrl, description, active } = req.body || {}
    if (!environment || !baseUrl) return res.status(400).json({ error: { message: 'environment and baseUrl are required' } })
    const db = await cds.connect.to('db')
    await db.run(INSERT.into('bridge.management.BnacEnvironment').entries({
      environment: environment.toUpperCase(),
      baseUrl: baseUrl.endsWith('/') ? baseUrl : baseUrl + '/',
      description: description || '',
      active: active !== false,
      modifiedAt: new Date().toISOString(),
      modifiedBy: req.user?.id || 'system'
    }))
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.patch('/environments/:env', async (req, res) => {
  try {
    const env = req.params.env.toUpperCase()
    const { baseUrl, description, active } = req.body || {}
    const db = await cds.connect.to('db')
    const patch = { modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' }
    if (baseUrl !== undefined) patch.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
    if (description !== undefined) patch.description = description
    if (active !== undefined) patch.active = active
    await db.run(UPDATE('bridge.management.BnacEnvironment').set(patch).where({ environment: env }))
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.delete('/environments/:env', async (req, res) => {
  try {
    const env = req.params.env.toUpperCase()
    const db = await cds.connect.to('db')
    await db.run(DELETE.from('bridge.management.BnacEnvironment').where({ environment: env }))
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.get('/history', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(SELECT.from('bridge.management.BnacLoadHistory').orderBy('loadedAt desc').limit(100))
    res.json({ history: rows || [] })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.get('/mapping/:bridgeId', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const row = await db.run(SELECT.one.from('bridge.management.BnacObjectIdMap').where({ bridgeId: req.params.bridgeId }))
    res.json({ mapping: row || null })
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

router.post('/upload', async (req, res) => {
  try {
    const { fileName, contentBase64, environment } = req.body || {}
    if (!contentBase64) return res.status(400).json({ error: { message: 'contentBase64 is required' } })

    const csvText = Buffer.from(contentBase64, 'base64').toString('utf8')
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (!lines.length) return res.status(400).json({ error: { message: 'CSV file is empty' } })

    const startIdx = /^bridge/i.test(lines[0].split(',')[0]) ? 1 : 0
    const dataLines = lines.slice(startIdx)

    const db = await cds.connect.to('db')
    const batchId = cds.utils.uuid()
    const loadedBy = req.user?.id || 'system'
    const loadedAt = new Date().toISOString()

    const targetEnv = (environment || 'PROD').toUpperCase()
    const envRow = await db.run(SELECT.one.from('bridge.management.BnacEnvironment').where({ environment: targetEnv }))
    const baseUrl = envRow?.baseUrl || ''

    let success = 0, failed = 0
    const errors = []
    const tx = db.tx()

    try {
      for (const line of dataLines) {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
        const [bridgeId, bnacObjectId] = parts
        if (!bridgeId || !bnacObjectId) {
          failed++
          errors.push(`Invalid row: "${line}"`)
          continue
        }
        const bnacUrl = baseUrl ? baseUrl + bnacObjectId : ''
        const existing = await tx.run(SELECT.one.from('bridge.management.BnacObjectIdMap').where({ bridgeId }))
        if (existing) {
          await tx.run(UPDATE('bridge.management.BnacObjectIdMap').set({ bnacObjectId, bnacUrl, loadedAt, loadedBy, loadBatchId: batchId }).where({ bridgeId }))
        } else {
          await tx.run(INSERT.into('bridge.management.BnacObjectIdMap').entries({ bridgeId, bnacObjectId, bnacUrl, loadedAt, loadedBy, loadBatchId: batchId }))
        }
        success++
      }

      await tx.run(INSERT.into('bridge.management.BnacLoadHistory').entries({
        ID: cds.utils.uuid(), loadedAt, loadedBy,
        fileName: fileName || 'upload.csv',
        environment: targetEnv, total: dataLines.length,
        success, failed,
        errors: errors.length ? errors.join('\n') : null,
        batchId
      }))

      await tx.commit()
      res.json({ success, failed, total: dataLines.length, batchId, errors: errors.slice(0, 20) })
    } catch (error) {
      await tx.rollback()
      throw error
    }
  } catch (error) { res.status(500).json({ error: { message: error.message } }) }
})

module.exports = router
