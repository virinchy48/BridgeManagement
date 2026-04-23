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
    if (n >= 5) return 'critical'
    if (n >= 4) return 'poor'
    if (n >= 3) return 'poor'
    if (n >= 2) return 'fair'
    return 'good'
  }
  const s = (c || '').toLowerCase()
  if (s === 'critical' || s === 'very poor' || s === 'verypoor') return 'critical'
  if (s === 'poor') return 'poor'
  if (s === 'fair') return 'fair'
  return 'good'
}

function mountReportsApi(app, requiresAuthentication) {
  const router = express.Router()
  router.use(express.json())

  router.get('/network-health', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'condition',
          'conditionRating', 'structuralAdequacyRating', 'postingStatus',
          'importanceLevel', 'yearBuilt', 'structureType'
        )
      )

      const total = bridges.length
      const dist = { good: 0, fair: 0, poor: 0, critical: 0 }
      for (const b of bridges) dist[conditionKey(b.condition)]++

      const weightMap = { good: 100, fair: 75, poor: 40, critical: 10 }
      const nci = total > 0
        ? Math.round(
            (dist.good * 100 + dist.fair * 75 + dist.poor * 40 + dist.critical * 10) / total
          )
        : 0
      const deficiencyRate = total > 0
        ? Math.round(((dist.poor + dist.critical) / total) * 100)
        : 0

      const ratedBridges = bridges.filter(b => b.structuralAdequacyRating > 0)
      const structuralAdequacyPct = ratedBridges.length > 0
        ? Math.round(
            ratedBridges.reduce((s, b) => s + b.structuralAdequacyRating, 0) /
            ratedBridges.length / 10 * 100
          )
        : 0

      const byState = {}
      for (const b of bridges) {
        const st = b.state || 'Unknown'
        if (!byState[st]) byState[st] = { state: st, good: 0, fair: 0, poor: 0, critical: 0, total: 0 }
        byState[st][conditionKey(b.condition)]++
        byState[st].total++
      }
      const conditionByState = Object.values(byState).sort((a, b) => b.total - a.total)

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
        kpis: { totalBridges: total, networkConditionIndex: nci, deficiencyRate, structuralAdequacyPct },
        conditionDistribution: { ...dist, total },
        conditionByState,
        worstBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/inspection-compliance', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region',
          'lastInspectionDate', 'nextInspectionDue', 'condition', 'postingStatus'
        )
      )

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

  router.get('/regulatory-compliance', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const [bridges, restrictions] = await Promise.all([
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

  router.get('/risk-register', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const raw = await db.run(
        SELECT.from('nhvr.Bridge').columns(
          'ID', 'bridgeId', 'name', 'state', 'region', 'condition',
          'conditionRating', 'scourRisk', 'criticalDefectFlag', 'highPriorityAsset',
          'importanceLevel', 'postingStatus', 'yearBuilt'
        )
      )
      const bridges = raw.map(b => ({ ...b, bridgeName: b.name }))

      let criticalCondition = 0, highScour = 0, criticalDefects = 0, highPriority = 0
      const riskByStateMap = {}
      const scourMap = {}

      const scoredBridges = bridges.map(b => {
        const ck = conditionKey(b.condition)
        const condScore = ck === 'critical' ? 40 : ck === 'poor' ? 25 : ck === 'fair' ? 10 : 0
        const scour = (b.scourRisk || '').replace(/\s/g, '')
        const scourScore = scour === 'VeryHigh' ? 35 : scour === 'High' ? 30 : scour === 'Medium' ? 15 : scour === 'Low' ? 5 : 0
        const defectScore = b.criticalDefectFlag ? 20 : 0
        const priorityScore = b.highPriorityAsset ? 5 : 0
        const il = b.importanceLevel
        const ilScore = il === 'Critical' || il === 1 ? 10 : il === 'Essential' || il === 2 ? 7 : il === 'Important' || il === 3 ? 4 : il === 'Ordinary' || il === 4 ? 1 : 0
        const riskScore = condScore + scourScore + defectScore + priorityScore + ilScore

        if (ck === 'critical' || ck === 'poor') criticalCondition++
        const scourNorm = (b.scourRisk || '').replace(/\s/g, '')
        if (scourNorm === 'High' || scourNorm === 'VeryHigh') highScour++
        if (b.criticalDefectFlag) criticalDefects++
        if (b.highPriorityAsset) highPriority++

        const scourKey = b.scourRisk || 'Unknown'
        scourMap[scourKey] = (scourMap[scourKey] || 0) + 1

        const st = b.state || 'Unknown'
        if (!riskByStateMap[st]) riskByStateMap[st] = { state: st, critical: 0, highScour: 0, defect: 0, total: 0 }
        if (ck === 'critical' || ck === 'poor') riskByStateMap[st].critical++
        if (scourNorm === 'High' || scourNorm === 'VeryHigh') riskByStateMap[st].highScour++
        if (b.criticalDefectFlag) riskByStateMap[st].defect++
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
        scourDistribution,
        riskByState,
        topRiskBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/data-quality', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rawBridges = await db.run(
        SELECT.from('nhvr.Bridge').columns(
          'ID', 'bridgeId', 'name', 'state', 'region', 'dataQualityScore'
        )
      )
      const bridges = rawBridges.map(b => ({ ...b, bridgeName: b.name }))

      const total = bridges.length
      const withScore = bridges.filter(b => b.dataQualityScore != null)
      const avgScore = withScore.length > 0
        ? Math.round(withScore.reduce((s, b) => s + b.dataQualityScore, 0) / withScore.length)
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
        kpis: { avgScore, complete100, partial75, incomplete50, total, withScore: withScore.length },
        scoreDistribution,
        lowestBridges
      })
    } catch (err) { res.status(500).json({ error: { message: err.message } }) }
  })

  router.get('/bridges-restrictions', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(
          'ID', 'bridgeId', 'bridgeName', 'state', 'region',
          'postingStatus', 'condition', 'conditionRating',
          'clearanceHeight', 'loadRating', 'hmlApproved',
          'bDoubleApproved', 'freightRoute', 'overMassRoute', 'nhvrAssessed'
        )
      )

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
