const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

async function loadDashboardAnalytics({ state } = {}) {
  const db = await cds.connect.to('db')

  const bridgeQuery = SELECT.from('bridge.management.Bridges').columns(
    'ID', 'bridgeId', 'bridgeName', 'state',
    'condition', 'conditionRating', 'structuralAdequacyRating',
    'postingStatus', 'scourRisk',
    'nextInspectionDue', 'gazetteExpiryDate'
  )
  if (state) bridgeQuery.where({ state })

  const [bridges, restrictions] = await Promise.all([
    db.run(bridgeQuery),
    db.run(SELECT.from('bridge.management.Restrictions').columns(
      'ID', 'active', 'restrictionStatus'
    ).where({ active: true }))
  ])

  const bridgeList      = bridges      || []
  const restrictionList = restrictions || []
  const total           = bridgeList.length

  const condKey = (b) => {
    const c = b.condition
    if (c == null) return 'good'
    if (typeof c === 'number' || /^\d+(\.\d+)?$/.test(String(c))) {
      const n = Number(c)
      if (n >= 5) return 'critical'
      if (n >= 3) return 'poor'
      if (n >= 2) return 'fair'
      return 'good'
    }
    const s = String(c).toLowerCase()
    if (s === 'critical') return 'critical'
    if (s === 'poor' || s === 'very poor') return 'poor'
    if (s === 'fair') return 'fair'
    return 'good'
  }

  const dist = { good: 0, fair: 0, poor: 0, critical: 0 }
  for (const b of bridgeList) dist[condKey(b)]++

  const nci = total > 0
    ? Math.round((dist.good * 100 + dist.fair * 67 + dist.poor * 33) / total)
    : 0
  const deficiencyRate = total > 0 ? Math.round((dist.poor + dist.critical) / total * 100) : 0

  const stateMap = {}
  for (const b of bridgeList) {
    const s = b.state || 'Unknown'
    if (!stateMap[s]) stateMap[s] = { state: s, good: 0, fair: 0, poor: 0, critical: 0, total: 0 }
    stateMap[s].total++
    stateMap[s][condKey(b)]++
  }
  const conditionByState = Object.values(stateMap).sort((a, b) => b.total - a.total)

  const ratedBridges = bridgeList.filter(b => b.structuralAdequacyRating != null && b.structuralAdequacyRating > 0)
  let sufficiencyPct = 0
  if (ratedBridges.length > 0) {
    const sumRating = ratedBridges.reduce((s, b) => s + Number(b.structuralAdequacyRating), 0)
    sufficiencyPct  = Math.round((sumRating / ratedBridges.length / 10) * 100)
  } else {
    const condAdequacy = { 1: 85, 2: 65, 3: 40, 4: 20, 5: 10 }
    const hasCond = bridgeList.filter(b => b.conditionRating > 0)
    if (hasCond.length > 0) {
      sufficiencyPct = Math.round(hasCond.reduce((s, b) => s + (condAdequacy[b.conditionRating] || 50), 0) / hasCond.length)
    }
  }

  const closedBridges      = bridgeList.filter(b => b.postingStatus === 'Closed').length
  const scourCritical      = bridgeList.filter(b => b.scourRisk === 'High' || b.scourRisk === 'VeryHigh').length
  const deficient          = dist.poor + dist.critical
  const activeRestrictions = restrictionList.length
  const postedRestrictions = restrictionList.filter(r => r.restrictionStatus === 'Active').length

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const allOverdue = bridgeList
    .filter(b => b.nextInspectionDue && new Date(b.nextInspectionDue) < today)
    .map(b => ({
      ID: b.ID,
      bridgeName: b.bridgeName || b.bridgeId || String(b.ID),
      bridgeId:   b.bridgeId,
      state:      b.state,
      daysOverdue: Math.floor((today - new Date(b.nextInspectionDue)) / 86400000),
      nextInspectionDue: b.nextInspectionDue
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
  const overdueInspections = allOverdue.slice(0, 5)

  const gazetteUrgency = (date) => {
    if (!date) return null
    const d = new Date(date); d.setHours(0, 0, 0, 0)
    const days = Math.floor((d - today) / 86400000)
    if (days < 0)   return 'EXPIRED'
    if (days <= 30) return 'RED'
    if (days <= 90) return 'AMBER'
    return null
  }
  const urgOrd = { EXPIRED: 0, RED: 1, AMBER: 2 }
  const gazetteWatchlist = bridgeList
    .map(b => ({ ...b, urg: gazetteUrgency(b.gazetteExpiryDate) }))
    .filter(b => b.urg != null)
    .sort((a, b) => urgOrd[a.urg] - urgOrd[b.urg])
    .slice(0, 5)
    .map(b => ({
      ID:                   b.ID,
      bridgeName:           b.bridgeName || b.bridgeId || String(b.ID),
      bridgeId:             b.bridgeId,
      state:                b.state,
      gazetteExpiryUrgency: b.urg,
      gazetteExpiryDate:    b.gazetteExpiryDate
    }))

  return {
    totalBridges: total,
    nci,
    deficiencyRate,
    activeRestrictions,
    closedBridges,
    postedRestrictions,
    scourCritical,
    deficient,
    sufficiencyPct,
    conditionDistribution: { good: dist.good, fair: dist.fair, poor: dist.poor, critical: dist.critical, total },
    conditionByState,
    overdueCount:       allOverdue.length,
    overdueInspections,
    gazetteIssueCount:  bridgeList.filter(b => gazetteUrgency(b.gazetteExpiryDate) != null).length,
    gazetteWatchlist
  }
}

const router = express.Router()

const dashboardHandler = async (req, res) => {
  try {
    const { state } = req.query
    const data = await loadDashboardAnalytics({ state: state || undefined })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load analytics' } })
  }
}

router.get('/analytics', dashboardHandler)
router.get('/overview',  dashboardHandler)

module.exports = router
