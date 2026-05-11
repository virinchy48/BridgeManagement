const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql
const { computeBhiBsi, MODE_PARAMS } = require('./bhi-bsi-engine')
const { isFeatureEnabled } = require('./feature-flags')

const FEATURE_FLAG_KEY = 'bhiBsiAssessment'
const FEATURE_DISABLED_MSG = 'BHI/BSI assessment engine not enabled. Enable in System Configuration → Feature Flags.'

async function checkFeatureFlag(res) {
  const enabled = await isFeatureEnabled(FEATURE_FLAG_KEY)
  if (!enabled) {
    res.status(503).json({ error: FEATURE_DISABLED_MSG })
    return false
  }
  return true
}

function deriveElementRatings(conditionRating) {
  return [
    { element: 'Deck',           rating: conditionRating, weight: 25 },
    { element: 'Substructure',   rating: conditionRating, weight: 30 },
    { element: 'Superstructure', rating: conditionRating, weight: 30 },
    { element: 'Approach',       rating: conditionRating, weight: 15 },
  ]
}

function mountBhiBsiApi(app, requiresAuthentication, validateCsrfToken) {
  const router = express.Router()
  router.use(express.json())

  router.get('/mode-params', (req, res) => {
    res.json({ modeParams: MODE_PARAMS })
  })

  router.post('/assess', requiresAuthentication, validateCsrfToken, async (req, res) => {
    try {
      if (!await checkFeatureFlag(res)) return

      let { bridgeId, structureMode, elementRatings, importanceClass, envPenalty, yearBuilt } = req.body

      if (!structureMode) structureMode = 'Road'
      if (!MODE_PARAMS[structureMode])
        return res.status(400).json({ error: `structureMode must be one of: ${Object.keys(MODE_PARAMS).join(', ')}` })

      let bridgeName = null
      let bridgeIdResolved = null

      if (bridgeId) {
        const db = await cds.connect.to('db')
        const bridge = await db.run(
          SELECT.one.from('bridge.management.Bridges')
            .columns('ID', 'bridgeId', 'bridgeName', 'yearBuilt', 'importanceLevel', 'conditionRating')
            .where({ bridgeId })
        )
        if (bridge) {
          bridgeName = bridge.bridgeName
          bridgeIdResolved = bridge.bridgeId
          if (yearBuilt == null && bridge.yearBuilt != null) yearBuilt = bridge.yearBuilt
          if (importanceClass == null && bridge.importanceLevel != null) importanceClass = bridge.importanceLevel
          if ((!elementRatings || elementRatings.length === 0) && bridge.conditionRating != null) {
            elementRatings = deriveElementRatings(bridge.conditionRating)
          }
        }
      }

      if (!elementRatings || elementRatings.length === 0)
        return res.status(400).json({ error: 'elementRatings is required (array of {element, rating, weight})' })

      const ic = Number(importanceClass) || 2
      if (ic < 1 || ic > 4)
        return res.status(400).json({ error: 'importanceClass must be between 1 and 4' })

      const ep = Number(envPenalty) || 0
      if (ep < 0 || ep > 2)
        return res.status(400).json({ error: 'envPenalty must be between 0 and 2' })

      const result = computeBhiBsi({
        structureMode,
        elementRatings,
        importanceClass: ic,
        envPenalty: ep,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined
      })

      res.json({
        ...result,
        bridgeId: bridgeIdResolved,
        bridgeName
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/network-summary', requiresAuthentication, async (req, res) => {
    try {
      if (!await checkFeatureFlag(res)) return

      const db = await cds.connect.to('db')
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges')
          .columns('ID', 'bridgeId', 'bridgeName', 'state', 'conditionRating', 'importanceLevel', 'yearBuilt')
          .where({ isActive: true })
          .limit(200)
      )

      const rated = bridges.filter(b => b.conditionRating != null)
      const byRag = { GREEN: 0, AMBER: 0, RED: 0 }
      let totalBhi = 0, totalBsi = 0
      const scored = []

      for (const b of rated) {
        const elementRatings = deriveElementRatings(b.conditionRating)
        const result = computeBhiBsi({
          structureMode: 'Road',
          elementRatings,
          importanceClass: b.importanceLevel || 2,
          envPenalty: 0,
          yearBuilt: b.yearBuilt
        })
        byRag[result.rag]++
        totalBhi += result.bhi
        totalBsi += result.bsi
        scored.push({ ID: b.ID, bridgeId: b.bridgeId, bridgeName: b.bridgeName, state: b.state, nbi: result.nbi, bhi: result.bhi, bsi: result.bsi, rag: result.rag })
      }

      const count = rated.length
      const averageBhi = count > 0 ? Math.round((totalBhi / count) * 100) / 100 : 0
      const averageBsi = count > 0 ? Math.round((totalBsi / count) * 100) / 100 : 0

      const worstBridges = scored
        .sort((a, b) => a.nbi - b.nbi)
        .slice(0, 10)

      res.json({
        total: bridges.length,
        rated: count,
        byRag,
        averageBhi,
        averageBsi,
        worstBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  app.use('/bhi-bsi/api', router)
}

module.exports = mountBhiBsiApi
