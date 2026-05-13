const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

function gazetteUrgency(expiryDate, today) {
  if (!expiryDate) return ''
  const d = new Date(expiryDate); d.setHours(0, 0, 0, 0)
  const days = Math.floor((d - today) / 86400000)
  if (days < 0) return 'EXPIRED'
  if (days <= 30) return 'RED'
  if (days <= 90) return 'AMBER'
  return 'GREEN'
}

function conditionKey(c) {
  const n = Number(c)
  if (!isNaN(n) && n > 0) {
    // TfNSW 1–5 scale: 5=Critical, 4=Poor, 3=Fair, 2=Satisfactory, 1=Good
    if (n >= 5) return 'critical'
    if (n >= 4) return 'poor'
    if (n >= 3) return 'fair'
    return 'good'
  }
  const s = (c || '').toLowerCase()
  if (s === 'critical' || s === 'very poor' || s === 'verypoor') return 'critical'
  if (s === 'poor') return 'poor'
  if (s === 'fair' || s === 'satisfactory') return 'fair'
  return 'good'
}

function computeBsi(b) {
  if (!b.conditionRating) return null
  const struct = (b.conditionRating / 10) * 55
  const dw = b.deckWidth || 0
  const wr = dw >= 7.3 ? 9 : dw >= 4.5 ? 5 : 2
  const width = (wr / 10) * 15
  return Math.min(100, Math.round(struct + width + 15))
}

function mountReportsApi(app, requiresAuthentication) {
  const router = express.Router()
  router.use(express.json())

  router.get('/network-health', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'condition',
          'conditionRating', 'structuralAdequacyRating', 'postingStatus',
          'importanceLevel', 'yearBuilt', 'structureType', 'deckWidth'
        )
      )
      if (state) bridges = bridges.filter(b => b.state === state)

      const total = bridges.length
      const dist = { good: 0, fair: 0, poor: 0, critical: 0 }
      for (const b of bridges) dist[conditionKey(b.condition)]++

      const nci = total > 0
        ? Math.round(
            (dist.good * 100 + dist.fair * 75 + dist.poor * 40 + dist.critical * 10) / total
          )
        : 0
      const deficiencyCount = dist.poor + dist.critical
      const deficiencyRate = total > 0
        ? Math.round((deficiencyCount / total) * 100)
        : 0

      const ratedBridges = bridges.filter(b => b.structuralAdequacyRating > 0)
      const structuralAdequacyPct = ratedBridges.length > 0
        ? Math.round(
            ratedBridges.reduce((s, b) => s + b.structuralAdequacyRating, 0) /
            ratedBridges.length / 10 * 100
          )
        : null
      const ratedCount = ratedBridges.length

      const bridgesWithBsi = bridges.map(b => ({ ...b, bsi: computeBsi(b) })).filter(b => b.bsi != null)
      const avgBsi = bridgesWithBsi.length > 0
        ? Math.round(bridgesWithBsi.reduce((s, b) => s + b.bsi, 0) / bridgesWithBsi.length)
        : null

      const byState = {}
      for (const b of bridges) {
        const st = b.state || 'Unknown'
        if (!byState[st]) byState[st] = { state: st, good: 0, fair: 0, poor: 0, critical: 0, total: 0 }
        byState[st][conditionKey(b.condition)]++
        byState[st].total++
      }
      const conditionByState = Object.values(byState).sort((a, b) => b.total - a.total)

      // Age profile by decade
      const ageProfile = { pre1940: 0, d1940s: 0, d1960s: 0, d1980s: 0, d2000s: 0, unknown: 0 }
      for (const b of bridges) {
        const y = b.yearBuilt
        if (!y) ageProfile.unknown++
        else if (y < 1940) ageProfile.pre1940++
        else if (y < 1960) ageProfile.d1940s++
        else if (y < 1980) ageProfile.d1960s++
        else if (y < 2000) ageProfile.d1980s++
        else ageProfile.d2000s++
      }

      // Structure type breakdown
      const typeMap = {}
      for (const b of bridges) {
        const t = b.structureType || 'Unknown'
        typeMap[t] = (typeMap[t] || 0) + 1
      }
      const structureTypeBreakdown = Object.entries(typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      // Importance breakdown
      const importanceBreakdown = { critical: 0, essential: 0, important: 0, ordinary: 0, unknown: 0 }
      for (const b of bridges) {
        const il = b.importanceLevel
        if (il === 1) importanceBreakdown.critical++
        else if (il === 2) importanceBreakdown.essential++
        else if (il === 3) importanceBreakdown.important++
        else if (il === 4) importanceBreakdown.ordinary++
        else importanceBreakdown.unknown++
      }

      const worstBridges = bridges
        .filter(b => b.conditionRating != null)
        .sort((a, b) => b.conditionRating - a.conditionRating)
        .slice(0, 15)
        .map(b => ({
          ID: b.ID,
          bridgeId: b.bridgeId,
          bridgeName: b.bridgeName,
          state: b.state,
          region: b.region,
          condition: b.condition,
          conditionRating: b.conditionRating,
          structuralAdequacyRating: b.structuralAdequacyRating,
          postingStatus: b.postingStatus
        }))

      res.json({
        kpis: {
          totalBridges: total,
          networkConditionIndex: nci,
          deficiencyCount,
          deficiencyRate,
          structuralAdequacyPct,
          ratedCount,
          avgBsi,
          criticalOrPoor: dist.critical + dist.poor,
          bridgesWithCondition: bridges.filter(b => b.condition).length
        },
        conditionDistribution: { ...dist, total },
        conditionByState,
        ageProfile,
        structureTypeBreakdown,
        importanceBreakdown,
        worstBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/inspection-compliance', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region',
          'lastInspectionDate', 'nextInspectionDue', 'condition', 'postingStatus'
        )
      )
      if (state) bridges = bridges.filter(b => b.state === state)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let overdue = 0, due30 = 0, due31to90 = 0
      let totalDaysSince = 0, countWithInspection = 0
      const overdueList = [], upcomingList = []

      for (const b of bridges) {
        if (b.lastInspectionDate) {
          const last = new Date(b.lastInspectionDate)
          const daysSince = Math.floor((today - last) / 86400000)
          totalDaysSince += daysSince
          countWithInspection++
        }
        if (b.nextInspectionDue) {
          const due = new Date(b.nextInspectionDue)
          due.setHours(0, 0, 0, 0)
          const daysUntil = Math.floor((due - today) / 86400000)
          if (daysUntil < 0) {
            overdue++
            overdueList.push({ ...b, daysOverdue: Math.abs(daysUntil) })
          } else if (daysUntil <= 30) {
            due30++
            upcomingList.push({ ...b, daysUntilDue: daysUntil })
          } else if (daysUntil <= 90) {
            due31to90++
            upcomingList.push({ ...b, daysUntilDue: daysUntil })
          }
        }
      }

      const avgDaysSince = countWithInspection > 0
        ? Math.round(totalDaysSince / countWithInspection)
        : 0

      const overdueByStateMap = {}
      for (const b of overdueList) {
        const st = b.state || 'Unknown'
        if (!overdueByStateMap[st]) overdueByStateMap[st] = { state: st, count: 0 }
        overdueByStateMap[st].count++
      }

      res.json({
        kpis: { overdue, due30, due31to90, avgDaysSince },
        overdueByState: Object.values(overdueByStateMap).sort((a, b) => b.count - a.count),
        overdueInspections: overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
        upcomingInspections: upcomingList.sort((a, b) => a.daysUntilDue - b.daysUntilDue).slice(0, 20)
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/regulatory-compliance', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let [bridges, restrictions] = await Promise.all([
        db.run(
          SELECT.from('bridge.management.Bridges').columns(
            'ID', 'bridgeId', 'bridgeName', 'state', 'region',
            'gazetteExpiryDate', 'pbsApprovalExpiry',
            'hmlApprovalExpiry', 'postingStatus', 'nhvrAssessed'
          )
        ),
        db.run(
          SELECT.from('bridge.management.Restrictions')
            .columns('ID', 'restrictionType', 'restrictionCategory', 'restrictionStatus', 'active')
            .where({ active: true })
        )
      ])
      if (state) bridges = bridges.filter(b => b.state === state)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let gazetteExpired = 0, gazetteRed = 0, gazetteAmber = 0, gazetteGreen = 0
      let pbsExpiring30 = 0, hmlExpiring30 = 0
      const urgentBridges = []

      for (const b of bridges) {
        b.gazetteExpiryUrgency = gazetteUrgency(b.gazetteExpiryDate, today)
        const urg = b.gazetteExpiryUrgency
        if (urg === 'EXPIRED') gazetteExpired++
        else if (urg === 'RED') gazetteRed++
        else if (urg === 'AMBER') gazetteAmber++
        else if (urg === 'GREEN') gazetteGreen++

        let pbsDays = null, hmlDays = null
        if (b.pbsApprovalExpiry) {
          const d = new Date(b.pbsApprovalExpiry)
          d.setHours(0, 0, 0, 0)
          pbsDays = Math.floor((d - today) / 86400000)
          if (pbsDays >= 0 && pbsDays <= 30) pbsExpiring30++
        }
        if (b.hmlApprovalExpiry) {
          const d = new Date(b.hmlApprovalExpiry)
          d.setHours(0, 0, 0, 0)
          hmlDays = Math.floor((d - today) / 86400000)
          if (hmlDays >= 0 && hmlDays <= 30) hmlExpiring30++
        }

        const isUrgent = (urg === 'EXPIRED' || urg === 'RED') ||
          (pbsDays !== null && pbsDays <= 90) ||
          (hmlDays !== null && hmlDays <= 90)
        if (isUrgent) urgentBridges.push(b)
      }

      const urgencyOrder = { EXPIRED: 0, RED: 1, AMBER: 2, GREEN: 3 }
      urgentBridges.sort((a, b) => {
        const ao = urgencyOrder[(a.gazetteExpiryUrgency || '').toUpperCase()] ?? 99
        const bo = urgencyOrder[(b.gazetteExpiryUrgency || '').toUpperCase()] ?? 99
        return ao - bo
      })

      const gazetteBreakdown = [
        { urgency: 'EXPIRED', label: 'Expired', count: gazetteExpired, color: '#6E0000' },
        { urgency: 'RED', label: 'Red', count: gazetteRed, color: '#BB0000' },
        { urgency: 'AMBER', label: 'Amber', count: gazetteAmber, color: '#E76500' },
        { urgency: 'GREEN', label: 'Green', count: gazetteGreen, color: '#107E3E' }
      ].filter(g => g.count > 0)

      const restrictionTypeMap = {}
      for (const r of restrictions) {
        const t = r.restrictionType || 'Unknown'
        restrictionTypeMap[t] = (restrictionTypeMap[t] || 0) + 1
      }
      const restrictionsByType = Object.entries(restrictionTypeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      res.json({
        kpis: {
          gazetteExpired, gazetteRed, gazetteAmber, gazetteGreen,
          pbsExpiring30, hmlExpiring30, totalRestrictions: restrictions.length
        },
        gazetteBreakdown,
        restrictionsByType,
        urgentBridges: urgentBridges.slice(0, 20)
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/risk-register', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let [bridges, riskAssessments] = await Promise.all([
        db.run(
          SELECT.from('bridge.management.Bridges').columns(
            'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'condition',
            'conditionRating', 'scourRisk', 'highPriorityAsset',
            'importanceLevel', 'postingStatus', 'yearBuilt'
          )
        ),
        db.run(
          SELECT.from('bridge.management.BridgeRiskAssessments')
            .columns('bridge_ID', 'inherentRiskLevel', 'inherentRiskScore', 'residualRiskLevel', 'riskRegisterStatus', 'active')
            .where({ active: true })
        )
      ])
      if (state) bridges = bridges.filter(b => b.state === state)

      const bridgeIdSet = new Set(bridges.map(b => b.ID))
      riskAssessments = riskAssessments.filter(r => bridgeIdSet.has(r.bridge_ID))

      const formalExtreme = riskAssessments.filter(r => r.inherentRiskLevel === 'Extreme').length
      const formalHigh    = riskAssessments.filter(r => r.inherentRiskLevel === 'High').length
      const formalMedium  = riskAssessments.filter(r => r.inherentRiskLevel === 'Medium').length
      const formalLow     = riskAssessments.filter(r => r.inherentRiskLevel === 'Low').length
      const openRisks     = riskAssessments.filter(r => ['Open', 'Escalated'].includes(r.riskRegisterStatus)).length

      let criticalCondition = 0, highScour = 0, criticalDefects = 0, highPriority = 0
      const riskByStateMap = {}
      const scourMap = {}

      const scoredBridges = bridges.map(b => {
        const ck = conditionKey(b.condition)
        const condScore = ck === 'critical' ? 40 : ck === 'poor' ? 25 : ck === 'fair' ? 10 : 0
        const scour = (b.scourRisk || '').replace(/\s/g, '')
        const scourScore = scour === 'VeryHigh' ? 35 : scour === 'High' ? 30 : scour === 'Medium' ? 15 : scour === 'Low' ? 5 : 0
        const priorityScore = b.highPriorityAsset ? 5 : 0
        const il = b.importanceLevel
        const ilScore = il === 'Critical' || il === 1 ? 10 : il === 'Essential' || il === 2 ? 7 : il === 'Important' || il === 3 ? 4 : il === 'Ordinary' || il === 4 ? 1 : 0
        const riskScore = condScore + scourScore + priorityScore + ilScore

        if (ck === 'critical' || ck === 'poor') criticalCondition++
        const scourNorm = (b.scourRisk || '').replace(/\s/g, '')
        if (scourNorm === 'High' || scourNorm === 'VeryHigh') highScour++
        if (b.highPriorityAsset) highPriority++
        if (b.conditionRating != null && b.conditionRating >= 4) criticalDefects++

        const scourKey = b.scourRisk || 'Unknown'
        scourMap[scourKey] = (scourMap[scourKey] || 0) + 1

        const st = b.state || 'Unknown'
        if (!riskByStateMap[st]) riskByStateMap[st] = { state: st, critical: 0, highScour: 0, defect: 0, total: 0 }
        if (ck === 'critical' || ck === 'poor') riskByStateMap[st].critical++
        if (scourNorm === 'High' || scourNorm === 'VeryHigh') riskByStateMap[st].highScour++
        riskByStateMap[st].total++

        return { ...b, riskScore }
      })

      const scourOrder = ['VeryHigh', 'High', 'Medium', 'Low', 'VeryLow', 'Unknown']
      const scourDistribution = scourOrder
        .filter(r => scourMap[r] > 0)
        .map(r => ({ risk: r, count: scourMap[r] }))

      const riskByState = Object.values(riskByStateMap)
        .sort((a, b) => (b.critical + b.highScour) - (a.critical + a.highScour))

      const topRiskBridges = scoredBridges
        .filter(b => b.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 20)

      res.json({
        kpis: { criticalCondition, highScour, criticalDefects, highPriority },
        formalRisk: { extreme: formalExtreme, high: formalHigh, medium: formalMedium, low: formalLow, total: riskAssessments.length, open: openRisks },
        scourDistribution,
        riskByState,
        topRiskBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/defects', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')

      let [defects, bridgesMap] = await Promise.all([
        db.run(SELECT.from('bridge.management.BridgeDefects')
          .columns('ID', 'bridge_ID', 'severity', 'elementType', 'defectType', 'active',
                   'requiresLoadRestriction', 'estimatedRepairCost', 'maintenancePriority', 'remediationStatus')
          .where({ active: true })),
        db.run(SELECT.from('bridge.management.Bridges')
          .columns('ID', 'bridgeId', 'bridgeName', 'state', 'region')
          .where({ isActive: true }))
          .then(rows => Object.fromEntries(rows.map(b => [b.ID, b])))
      ])

      defects = defects.map(d => ({ ...d, ...(bridgesMap[d.bridge_ID] || {}) }))
      if (state) defects = defects.filter(d => d.state === state)

      const total = defects.length
      const bySeverity = { 1: 0, 2: 0, 3: 0, 4: 0 }
      let requiresRestriction = 0, criticalDefects = 0
      let totalRepairCost = 0, repairCostCount = 0

      for (const d of defects) {
        bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1
        if (d.severity >= 4) criticalDefects++
        if (d.requiresLoadRestriction) requiresRestriction++
        if (d.estimatedRepairCost > 0) { totalRepairCost += d.estimatedRepairCost; repairCostCount++ }
      }

      const byBridgeMap = {}
      for (const d of defects) {
        const bid = d.bridge_ID
        if (!byBridgeMap[bid]) byBridgeMap[bid] = { bridgeId: d.bridgeId, bridgeName: d.bridgeName, state: d.state, count: 0, critical: 0 }
        byBridgeMap[bid].count++
        if (d.severity >= 4) byBridgeMap[bid].critical++
      }
      const topBridges = Object.values(byBridgeMap).sort((a, b) => b.count - a.count).slice(0, 15)

      const byPriority = {}
      for (const d of defects) {
        const p = d.maintenancePriority || 'Unset'
        byPriority[p] = (byPriority[p] || 0) + 1
      }

      const byElement = {}
      for (const d of defects) {
        const e = d.elementType || 'Unknown'
        byElement[e] = (byElement[e] || 0) + 1
      }
      const elementBreakdown = Object.entries(byElement).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 10)

      const avgRepairCost = repairCostCount > 0 ? Math.round(totalRepairCost / repairCostCount) : 0
      const totalRepairValue = Math.round(totalRepairCost)

      res.json({
        kpis: { total, criticalDefects, requiresRestriction, avgRepairCost, totalRepairValue },
        bySeverity: [
          { severity: 4, label: 'Critical (P1)', count: bySeverity[4] || 0, color: '#BB0000' },
          { severity: 3, label: 'High (P2)',     count: bySeverity[3] || 0, color: '#E76500' },
          { severity: 2, label: 'Medium (P3)',   count: bySeverity[2] || 0, color: '#E9730C' },
          { severity: 1, label: 'Low (P4)',      count: bySeverity[1] || 0, color: '#107E3E' }
        ],
        elementBreakdown,
        byPriority: Object.entries(byPriority).map(([p, c]) => ({ priority: p, count: c })).sort((a, b) => b.count - a.count),
        topBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/maintenance', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')

      let [restrictions, defects, bridges] = await Promise.all([
        db.run(
          SELECT.from('bridge.management.Restrictions')
            .columns('ID', 'bridge_ID', 'restrictionRef', 'restrictionType',
                     'repairsProposal', 'estimatedRepairCost', 'programmeYear',
                     'maintenancePriority', 'active')
            .where({ active: true })
        ).catch(() => []),
        db.run(
          SELECT.from('bridge.management.BridgeDefects')
            .columns('ID', 'bridge_ID', 'severity', 'estimatedRepairCost',
                     'maintenancePriority', 'plannedRemediationDate', 'actualRemediationDate', 'active')
            .where({ active: true })
        ),
        db.run(
          SELECT.from('bridge.management.Bridges')
            .columns('ID', 'bridgeId', 'bridgeName', 'state', 'region')
            .where({ isActive: true })
        )
      ])

      const bridgesMap = Object.fromEntries(bridges.map(b => [b.ID, b]))
      if (state) {
        restrictions = restrictions.filter(r => (bridgesMap[r.bridge_ID] || {}).state === state)
        defects      = defects.filter(d => (bridgesMap[d.bridge_ID] || {}).state === state)
      }

      const byYear = {}
      for (const r of restrictions) {
        if (r.programmeYear) {
          if (!byYear[r.programmeYear]) byYear[r.programmeYear] = { year: r.programmeYear, count: 0, cost: 0 }
          byYear[r.programmeYear].count++
          byYear[r.programmeYear].cost += r.estimatedRepairCost || 0
        }
      }

      const defectBacklogCost     = defects.reduce((s, d) => s + (d.estimatedRepairCost || 0), 0)
      const restrictionRepairCost = restrictions.reduce((s, r) => s + (r.estimatedRepairCost || 0), 0)

      const byPriority = { P1: 0, P2: 0, P3: 0, P4: 0, Unknown: 0 }
      for (const d of defects) {
        const p = d.maintenancePriority || 'Unknown'
        if (byPriority[p] !== undefined) byPriority[p]++
        else byPriority['Unknown']++
      }

      res.json({
        kpis: {
          openDefects: defects.length,
          restrictionsWithRepairs: restrictions.filter(r => r.repairsProposal).length,
          defectBacklogCost,
          restrictionRepairCost,
          totalMaintenanceValue: defectBacklogCost + restrictionRepairCost,
          programmeYears: Object.keys(byYear).length
        },
        programmeByYear: Object.values(byYear).sort((a, b) => a.year - b.year),
        priorityBreakdown: Object.entries(byPriority).map(([p, c]) => ({ priority: p, count: c })).filter(x => x.count > 0)
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/data-quality', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let rawBridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region',
          'condition', 'conditionRating', 'latitude', 'longitude',
          'yearBuilt', 'structureType', 'postingStatus',
          'lastInspectionDate', 'managingAuthority'
        )
      )

      if (state) rawBridges = rawBridges.filter(b => b.state === state)

      const QUALITY_FIELDS = [
        'bridgeName', 'state', 'condition', 'conditionRating',
        'latitude', 'longitude', 'yearBuilt', 'structureType',
        'postingStatus', 'lastInspectionDate', 'managingAuthority'
      ]
      const MAX_SCORE = QUALITY_FIELDS.length

      const scored = rawBridges.map(b => {
        const filled = QUALITY_FIELDS.filter(f => b[f] != null && b[f] !== '').length
        const dqScore = Math.round((filled / MAX_SCORE) * 100)
        return { ...b, dataQualityScore: dqScore }
      })

      const total = scored.length
      const withScore = scored

      const avgScore = total > 0
        ? Math.round(withScore.reduce((s, b) => s + b.dataQualityScore, 0) / total)
        : 0

      let complete100 = 0, partial75 = 0, incomplete50 = 0
      const bands = { '≥ 90%': 0, '75–89%': 0, '50–74%': 0, '< 50%': 0 }

      for (const b of withScore) {
        const s = b.dataQualityScore
        if (s >= 90) { complete100++; bands['≥ 90%']++ }
        else if (s >= 75) { partial75++; bands['75–89%']++ }
        else if (s >= 50) { bands['50–74%']++ }
        else { incomplete50++; bands['< 50%']++ }
      }

      const scoreDistribution = Object.entries(bands).map(([band, count]) => ({ band, count }))

      const lowestBridges = [...withScore]
        .sort((a, b) => a.dataQualityScore - b.dataQualityScore)
        .slice(0, 20)
        .map(b => ({
          ID: b.ID,
          bridgeId: b.bridgeId,
          bridgeName: b.bridgeName,
          state: b.state,
          region: b.region,
          dataQualityScore: b.dataQualityScore
        }))

      res.json({
        kpis: { avgScore, complete100, partial75, incomplete50, total, withScore: total },
        scoreDistribution,
        lowestBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/bridges-restrictions', async (req, res) => {
    try {
      const { state } = req.query
      const db = await cds.connect.to('db')
      let bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region',
          'postingStatus', 'condition', 'conditionRating',
          'clearanceHeight', 'loadRating', 'hmlApproved',
          'bDoubleApproved', 'freightRoute', 'overMassRoute', 'nhvrAssessed'
        )
      )
      if (state) bridges = bridges.filter(b => b.state === state)

      const statusCount = {}
      let withHeightLimit = 0, hmlCount = 0, bDoubleCount = 0, freightCount = 0

      for (const b of bridges) {
        const s = b.postingStatus || 'Unknown'
        statusCount[s] = (statusCount[s] || 0) + 1
        if (b.clearanceHeight != null) withHeightLimit++
        if (b.hmlApproved) hmlCount++
        if (b.bDoubleApproved) bDoubleCount++
        if (b.freightRoute) freightCount++
      }

      const postingBreakdown = Object.entries(statusCount)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)

      const massRestrictedBridges = bridges
        .filter(b => b.postingStatus === 'Restricted' || b.postingStatus === 'Under Review')
        .sort((a, b) => (b.conditionRating || 0) - (a.conditionRating || 0))

      const heightRestrictedBridges = bridges
        .filter(b => b.clearanceHeight != null)
        .sort((a, b) => a.clearanceHeight - b.clearanceHeight)

      const fullCapacityBridges = bridges
        .filter(b => b.hmlApproved || b.bDoubleApproved || b.overMassRoute)
        .sort((a, b) => (a.bridgeName || '').localeCompare(b.bridgeName || ''))

      res.json({
        kpis: {
          totalRestricted: statusCount['Restricted'] || 0,
          underReview: statusCount['Under Review'] || 0,
          unrestricted: statusCount['Unrestricted'] || 0,
          withHeightLimit,
          hmlApproved: hmlCount,
          bDoubleApproved: bDoubleCount,
          freightRoute: freightCount
        },
        postingBreakdown,
        massRestrictedBridges,
        heightRestrictedBridges,
        fullCapacityBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  const ALLOWED_GROUP_BY = ['state', 'region', 'condition', 'postingStatus', 'structureType', 'material', 'scourRisk']

  app.get('/reports/api/custom', requiresAuthentication, async (req, res) => {
    try {
      const { groupBy, filterField, filterValue, state } = req.query

      if (!groupBy || !ALLOWED_GROUP_BY.includes(groupBy))
        return res.status(400).json({ error: { message: `groupBy must be one of: ${ALLOWED_GROUP_BY.join(', ')}` } })

      if (filterField && !ALLOWED_GROUP_BY.includes(filterField))
        return res.status(400).json({ error: { message: `filterField must be one of: ${ALLOWED_GROUP_BY.join(', ')}` } })

      const db = await cds.connect.to('db')
      let bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'condition',
          'conditionRating', 'postingStatus', 'structureType', 'material', 'scourRisk'
        )
      )

      if (state) bridges = bridges.filter(b => b.state === state)
      if (filterField && filterValue !== undefined)
        bridges = bridges.filter(b => (b[filterField] || '').toString().toLowerCase() === filterValue.toLowerCase())

      const groupMap = {}
      for (const b of bridges) {
        const key = b[groupBy] || 'Unknown'
        if (!groupMap[key]) groupMap[key] = []
        groupMap[key].push(b)
      }

      const groups = Object.entries(groupMap)
        .map(([key, members]) => ({ key, count: members.length, bridges: members.slice(0, 5) }))
        .sort((a, b) => b.count - a.count)

      const filterApplied = (filterField && filterValue !== undefined)
        ? { field: filterField, value: filterValue }
        : state
          ? { field: 'state', value: state }
          : null

      res.json({ groupBy, filterApplied, totalCount: bridges.length, groups })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  app.use('/reports/api', requiresAuthentication, router)
}

module.exports = mountReportsApi
