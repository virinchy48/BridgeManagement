const cds = require('@sap/cds')
const express = require('express')

const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload
} = require('./mass-upload')

const { SELECT } = cds.ql

async function loadDashboardAnalytics() {
  const db = await cds.connect.to('db')

  const [
    totalBridges,
    activeRestrictions,
    closedBridges,
    postedRestrictions,
    scourCritical,
    deficient,
    avgAdequacy,
    conditionDist
  ] = await Promise.all([
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt')),
    db.run(SELECT.one.from('bridge.management.Restrictions').columns('count(1) as cnt').where({ active: true })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ postingStatus: 'CLOSED' })),
    db.run(SELECT.one.from('bridge.management.Restrictions').columns('count(1) as cnt').where({ restrictionStatus: 'POSTED' })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ scourRisk: { in: ['HIGH', 'VERY_HIGH'] } })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ condition: { in: ['POOR', 'CRITICAL'] } })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('avg(structuralAdequacyRating) as avg').where('structuralAdequacyRating is not null')),
    db.run(SELECT.from('bridge.management.Bridges').columns('condition', 'count(1) as cnt').groupBy('condition'))
  ])

  const total = Number(totalBridges?.cnt || 0)

  const conditionMap = {}
  for (const row of (conditionDist || [])) {
    const key = (row.condition || 'UNKNOWN').toUpperCase()
    conditionMap[key] = Number(row.cnt || 0)
  }

  const avgRating = avgAdequacy?.avg ? Number(avgAdequacy.avg) : null
  const sufficiencyPct = avgRating !== null ? Math.round((avgRating / 10) * 100) : 0

  return {
    totalBridges: total,
    activeRestrictions: Number(activeRestrictions?.cnt || 0),
    closedBridges: Number(closedBridges?.cnt || 0),
    postedRestrictions: Number(postedRestrictions?.cnt || 0),
    scourCritical: Number(scourCritical?.cnt || 0),
    deficient: Number(deficient?.cnt || 0),
    sufficiencyPct,
    conditionDistribution: {
      good: conditionMap['GOOD'] || 0,
      fair: conditionMap['FAIR'] || 0,
      poor: conditionMap['POOR'] || 0,
      critical: conditionMap['CRITICAL'] || 0,
      total
    }
  }
}

async function loadMapBridges() {
  const db = await cds.connect.to('db')

  const bridges = await db.run(
    SELECT.from('bridge.management.Bridges').columns(
      'ID',
      'bridgeId',
      'bridgeName',
      'state',
      'latitude',
      'longitude',
      'postingStatus',
      'conditionRating',
      'yearBuilt',
      'structureType',
      'route',
      'region',
      'clearanceHeight',
      'spanLength',
      'lastInspectionDate',
      'nhvrAssessed',
      'scourRisk',
      'freightRoute',
      'overMassRoute',
      'hmlApproved',
      'bDoubleApproved',
      'restriction_ID'
    )
  )

  const restrictionIds = [...new Set(bridges.map((bridge) => bridge.restriction_ID).filter(Boolean))]
  let vehicleClassByRestriction = new Map()

  if (restrictionIds.length) {
    const restrictions = await db.run(
      SELECT.from('bridge.management.Restrictions')
        .columns(
          'ID',
          'bridge_ID',
          'active',
          'name',
          'restrictionType',
          'restrictionValue',
          'restrictionUnit',
          'restrictionStatus',
          'remarks',
          'appliesToVehicleClass'
        )
        .where({ ID: { in: restrictionIds } })
    )

    vehicleClassByRestriction = new Map(
      restrictions.map((restriction) => [restriction.ID, restriction.appliesToVehicleClass || null])
    )

    var activeRestrictionsByBridgeId = new Map()
    restrictions.forEach((restriction) => {
      if (!restriction.active || !restriction.bridge_ID) return
      if (!activeRestrictionsByBridgeId.has(restriction.bridge_ID)) {
        activeRestrictionsByBridgeId.set(restriction.bridge_ID, [])
      }
      activeRestrictionsByBridgeId.get(restriction.bridge_ID).push({
        name: restriction.name || restriction.restrictionType || 'Restriction',
        restrictionType: restriction.restrictionType || null,
        restrictionValue: restriction.restrictionValue || null,
        restrictionUnit: restriction.restrictionUnit || null,
        restrictionStatus: restriction.restrictionStatus || null,
        remarks: restriction.remarks || null
      })
    })
  }

  const restrictionsByBridgeId = typeof activeRestrictionsByBridgeId === 'undefined'
    ? new Map()
    : activeRestrictionsByBridgeId

  return bridges
    .filter((bridge) => Number.isFinite(Number(bridge.latitude)) && Number.isFinite(Number(bridge.longitude)))
    .map((bridge) => ({
      ID: bridge.ID,
      bridgeId: bridge.bridgeId,
      bridgeName: bridge.bridgeName,
      state: bridge.state,
      latitude: Number(bridge.latitude),
      longitude: Number(bridge.longitude),
      postingStatus: bridge.postingStatus || null,
      conditionRating: bridge.conditionRating == null ? null : Number(bridge.conditionRating),
      yearBuilt: bridge.yearBuilt == null ? null : Number(bridge.yearBuilt),
      structureType: bridge.structureType || null,
      route: bridge.route || null,
      region: bridge.region || null,
      clearanceHeight: bridge.clearanceHeight == null ? null : Number(bridge.clearanceHeight),
      spanLength: bridge.spanLength == null ? null : Number(bridge.spanLength),
      lastInspectionDate: bridge.lastInspectionDate || null,
      nhvrAssessed: Boolean(bridge.nhvrAssessed),
      scourRisk: bridge.scourRisk || null,
      freightRoute: Boolean(bridge.freightRoute),
      overMassRoute: Boolean(bridge.overMassRoute),
      hmlApproved: Boolean(bridge.hmlApproved),
      bDoubleApproved: Boolean(bridge.bDoubleApproved),
      vehicleClass: vehicleClassByRestriction.get(bridge.restriction_ID) || null,
      restrictions: restrictionsByBridgeId.get(bridge.ID) || []
    }))
}

cds.on('bootstrap', (app) => {
  const router = express.Router()

  router.use(express.json({ limit: '25mb' }))

  router.get('/datasets', (_req, res) => {
    res.json({ datasets: getDatasets() })
  })

  router.get('/template.xlsx', async (_req, res) => {
    try {
      const content = await buildWorkbookTemplate()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="BridgeManagement-MassUploadTemplate.xlsx"')
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to generate workbook template' } })
    }
  })

  router.get('/template.csv', async (req, res) => {
    try {
      const dataset = req.query.dataset
      const content = await buildCsvTemplate(dataset)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${dataset || 'lookup-template'}.csv"`)
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to generate CSV template' } })
    }
  })

  router.post('/upload', async (req, res) => {
    try {
      const { fileName, contentBase64, dataset } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }
      const buffer = Buffer.from(contentBase64, 'base64')
      const result = await importUpload({
        buffer,
        fileName,
        datasetName: dataset
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Upload failed' } })
    }
  })

  app.use('/mass-upload/api', router)

  // Dashboard analytics API
  const dashboardRouter = express.Router()

  dashboardRouter.get('/analytics', async (_req, res) => {
    try {
      const data = await loadDashboardAnalytics()
      res.json(data)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load analytics' } })
    }
  })

  app.use('/dashboard/api', dashboardRouter)

  const mapRouter = express.Router()

  mapRouter.get('/bridges', async (_req, res) => {
    try {
      const bridges = await loadMapBridges()
      res.json({ bridges })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load bridge map data' } })
    }
  })

  app.use('/map/api', mapRouter)
})

module.exports = cds.server
