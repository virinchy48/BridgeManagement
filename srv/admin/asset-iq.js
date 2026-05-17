'use strict'
const cds = require('@sap/cds')

const DEFAULT_MODEL = { bciWeight: 0.350, ageWeight: 0.150, trafficWeight: 0.200, defectWeight: 0.200, loadWeight: 0.100 }

const computeAssetIQScore = (bridge, defectCount, model) => {
  const bciNorm = bridge.conditionRating ? (bridge.conditionRating / 10) : 0.5
  const bciFactor = (1 - bciNorm) * 100 * model.bciWeight

  const age = bridge.yearBuilt ? (new Date().getFullYear() - bridge.yearBuilt) : 40
  const ageFactor = Math.min(1, age / 120) * 100 * model.ageWeight

  const hvPct = bridge.heavyVehiclePercent || 10
  const trafficFactor = Math.min(1, hvPct / 30) * 100 * model.trafficWeight

  const defectFactor = Math.min(1, defectCount / 5) * 100 * model.defectWeight

  const loadFactor = (bridge.postingStatus === 'Posted' || bridge.postingStatus === 'Closed')
    ? 100 * model.loadWeight
    : 20 * model.loadWeight

  const overall = bciFactor + ageFactor + trafficFactor + defectFactor + loadFactor
  const ragStatus = overall >= 60 ? 'RED' : overall >= 35 ? 'AMBER' : 'GREEN'

  return {
    bciFactor:     Math.round(bciFactor     * 100) / 100,
    ageFactor:     Math.round(ageFactor     * 100) / 100,
    trafficFactor: Math.round(trafficFactor * 100) / 100,
    defectFactor:  Math.round(defectFactor  * 100) / 100,
    loadFactor:    Math.round(loadFactor    * 100) / 100,
    overall:       Math.round(overall       * 100) / 100,
    ragStatus
  }
}

module.exports = function registerAssetIQ(svc) {
  svc.on('scoreAllBridges', async req => {
    const db = await cds.connect.to('db')
    const now = new Date().toISOString()

    const activeModel = await db.run(
      SELECT.one.from('bridge.management.AssetIQModels').where({ isActive: true })
    )
    const model = activeModel || { version: '1.0.0', ...DEFAULT_MODEL }

    const BATCH_SIZE = 500
    let skip = 0, scored = 0, skipped = 0

    while (true) {
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges')
          .columns('ID', 'conditionRating', 'yearBuilt', 'heavyVehiclePercent', 'postingStatus')
          .where({ isActive: true })
          .limit(BATCH_SIZE, skip)
      )
      if (!bridges.length) break

      const bridgeIds = bridges.map(b => b.ID)

      const defectCounts = await db.run(
        SELECT.from('bridge.management.BridgeDefects')
          .columns('bridge_ID', 'count(1) as cnt')
          .where({ bridge_ID: { in: bridgeIds }, severity: { '>=': 3 }, remediationStatus: 'Open' })
          .groupBy('bridge_ID')
      )
      const defectMap = Object.fromEntries((defectCounts || []).map(r => [r.bridge_ID, Number(r.cnt)]))

      const existingScores = await db.run(
        SELECT.from('bridge.management.AssetIQScores')
          .columns('ID', 'bridge_ID')
          .where({ bridge_ID: { in: bridgeIds } })
      )
      const existingMap = Object.fromEntries((existingScores || []).map(r => [r.bridge_ID, r.ID]))

      for (const bridge of bridges) {
        try {
          const defectCount = defectMap[bridge.ID] || 0
          const computed = computeAssetIQScore(bridge, defectCount, model)
          const scoreRecord = {
            overallScore:  computed.overall,
            ragStatus:     computed.ragStatus,
            bciFactor:     computed.bciFactor,
            ageFactor:     computed.ageFactor,
            trafficFactor: computed.trafficFactor,
            defectFactor:  computed.defectFactor,
            loadFactor:    computed.loadFactor,
            modelVersion:  model.version || '1.0.0',
            scoredAt:      now
          }
          const existingId = existingMap[bridge.ID]
          if (existingId) {
            await db.run(UPDATE('bridge.management.AssetIQScores').set(scoreRecord).where({ ID: existingId }))
          } else {
            await db.run(INSERT.into('bridge.management.AssetIQScores').entries({
              ID: cds.utils.uuid(), bridge_ID: bridge.ID, overrideFlag: false, ...scoreRecord
            }))
          }
          scored++
        } catch (_) { skipped++ }
      }

      skip += bridges.length
      if (bridges.length < BATCH_SIZE) break
    }

    if (scored === 0 && skipped === 0) return { scored: 0, skipped: 0, message: 'No active bridges found' }
    return { scored, skipped, message: `AssetIQ scored ${scored} bridges (${skipped} skipped)` }
  })

  svc.on('override', 'AssetIQScores', async req => {
    const { ID } = req.params[0]
    const reason = req.data?.reason
    if (!reason) return req.error(400, 'Override reason is required')
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQScores').set({
      overrideFlag:   true,
      overrideBy:     req.user?.id || 'system',
      overrideReason: reason,
      overrideAt:     new Date().toISOString()
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQScores').where({ ID }))
  })

  svc.on('dismissOverride', 'AssetIQScores', async req => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQScores').set({
      overrideFlag: false, overrideBy: null, overrideReason: null, overrideAt: null
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQScores').where({ ID }))
  })

  svc.on('activate', 'AssetIQModels', async req => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQModels').set({ isActive: false }))
    await db.run(UPDATE('bridge.management.AssetIQModels').set({
      isActive:    true,
      activatedAt: new Date().toISOString(),
      activatedBy: req.user?.id || 'system'
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQModels').where({ ID }))
  })

  svc.on('refreshKPISnapshots', async req => {
    const db = await cds.connect.to('db')
    const today = new Date().toISOString().slice(0, 10)
    const ninetyDaysOut = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    let overdueYears = 5
    try {
      const cfg = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'kpi.overdueInspectionYears' }))
      if (cfg?.value) overdueYears = parseInt(cfg.value) || 5
    } catch (_) {}
    const now = new Date()
    const overdueThreshold = new Date(now.getFullYear() - overdueYears, now.getMonth(), now.getDate()).toISOString().slice(0, 10)

    const [totalsByState, overdueByState, restrictionsByState, alertsByState, lrcByState] = await Promise.all([
      db.run(
        SELECT.from('bridge.management.Bridges')
          .columns('state', 'count(1) as totalBridges',
            'sum(case when conditionRating <= 3 then 1 else 0 end) as criticalCondition',
            'sum(case when highPriorityAsset = true then 1 else 0 end) as highPriority',
            'avg(conditionRating) as avgConditionRating')
          .where({ isActive: true }).groupBy('state')
      ),
      db.run(
        SELECT.from('bridge.management.Bridges').columns('state', 'count(1) as cnt')
          .where({ isActive: true }).and(`lastInspectionDate <= '${overdueThreshold}'`).groupBy('state')
      ),
      db.run(
        SELECT.from('bridge.management.Restrictions as r')
          .join('bridge.management.Bridges as b').on('r.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt').where({ 'r.active': true }).groupBy('b.state')
      ),
      db.run(
        SELECT.from('bridge.management.AlertsAndNotifications as a')
          .join('bridge.management.Bridges as b').on('a.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt').where({ 'a.status': 'Open' }).groupBy('b.state')
      ),
      db.run(
        SELECT.from('bridge.management.LoadRatingCertificates as l')
          .join('bridge.management.Bridges as b').on('l.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt')
          .where({ 'l.active': true }).and(`l.certificateExpiryDate <= '${ninetyDaysOut}'`).groupBy('b.state')
      )
    ])

    const toMap = (rows, key = 'cnt') => Object.fromEntries(rows.map(r => [r.state, parseInt(r[key] || 0)]))
    const totalMap    = toMap(totalsByState, 'totalBridges')
    const critMap     = toMap(totalsByState, 'criticalCondition')
    const hpMap       = toMap(totalsByState, 'highPriority')
    const avgMap      = Object.fromEntries(totalsByState.map(r => [r.state, parseFloat(r.avgConditionRating || 0)]))
    const overdueMap  = toMap(overdueByState)
    const restrictMap = toMap(restrictionsByState)
    const alertMap    = toMap(alertsByState)
    const lrcMap      = toMap(lrcByState)

    const sumAll = map => Object.values(map).reduce((a, b) => a + b, 0)
    const allTotal = sumAll(totalMap)
    const allAvgCond = Object.values(avgMap).length
      ? Object.values(avgMap).reduce((a, b) => a + b, 0) / Object.values(avgMap).length
      : 0

    const statesToProcess = [...new Set([...Object.keys(totalMap), 'ALL'])]
    let statesProcessed = 0

    for (const state of statesToProcess) {
      const isAll = state === 'ALL'
      const snapshot = {
        snapshotDate:       today,
        snapshotType:       'Daily',
        state,
        totalBridges:       isAll ? allTotal : (totalMap[state] || 0),
        activeBridges:      isAll ? allTotal : (totalMap[state] || 0),
        criticalCondition:  isAll ? sumAll(critMap) : (critMap[state] || 0),
        highPriority:       isAll ? sumAll(hpMap) : (hpMap[state] || 0),
        overdueInspections: isAll ? sumAll(overdueMap) : (overdueMap[state] || 0),
        activeRestrictions: isAll ? sumAll(restrictMap) : (restrictMap[state] || 0),
        openAlerts:         isAll ? sumAll(alertMap) : (alertMap[state] || 0),
        avgConditionRating: Math.round((isAll ? allAvgCond : (avgMap[state] || 0)) * 100) / 100 || null,
        highRiskCount:      0,
        lrcExpiringCount:   isAll ? sumAll(lrcMap) : (lrcMap[state] || 0),
        nhvrExpiringCount:  0
      }

      const existing = await db.run(
        SELECT.one.from('bridge.management.KPISnapshots')
          .where({ snapshotDate: today, snapshotType: 'Daily', state })
      )
      if (existing) {
        await db.run(UPDATE('bridge.management.KPISnapshots').set(snapshot)
          .where({ snapshotDate: today, snapshotType: 'Daily', state }))
      } else {
        await db.run(INSERT.into('bridge.management.KPISnapshots').entries(snapshot))
      }
      statesProcessed++
    }

    return { snapshotDate: today, statesProcessed, message: `KPI snapshot refreshed for ${statesProcessed} states` }
  })
}
