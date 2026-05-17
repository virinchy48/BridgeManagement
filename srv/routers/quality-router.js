const cds = require('@sap/cds')
const express = require('express')
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

const ALLOWED_RULE_FIELDS = new Set([
  'bridgeId', 'bridgeName', 'state', 'region', 'assetOwner', 'latitude', 'longitude',
  'structureType', 'condition', 'conditionRating', 'postingStatus', 'lastInspectionDate',
  'geoJson', 'yearBuilt', 'scourRisk', 'nhvrAssessed', 'freightRoute'
])

const QUALITY_COMPLETENESS_FIELDS_DEFAULT = [
  'bridgeName', 'bridgeId', 'state', 'region', 'assetOwner',
  'latitude', 'longitude', 'structureType', 'condition',
  'conditionRating', 'postingStatus', 'lastInspectionDate', 'geoJson'
]

function getCompletenessFields(rules) {
  const fromRules = rules
    .filter(r => r.ruleType === 'required_field' && r.field)
    .map(r => r.field)
  return fromRules.length > 0 ? fromRules : QUALITY_COMPLETENESS_FIELDS_DEFAULT
}

async function loadQualityBridges() {
  const db = await cds.connect.to('db')
  const bridges = await db.run(
    SELECT.from('bridge.management.Bridges').columns(
      'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'assetOwner',
      'latitude', 'longitude', 'condition', 'conditionRating',
      'postingStatus', 'scourRisk', 'lastInspectionDate',
      'nhvrAssessed', 'freightRoute', 'geoJson', 'structureType', 'yearBuilt'
    )
  )
  return bridges || []
}

async function loadActiveRestrictionBridgeIds() {
  const db = await cds.connect.to('db')
  const rows = await db.run(
    SELECT.from('bridge.management.Restrictions').columns('bridge_ID').where({ active: true })
  )
  return new Set((rows || []).map(r => r.bridge_ID).filter(Boolean))
}

async function loadEnabledRules() {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.DataQualityRules')
        .columns('ID', 'name', 'enabled', 'sortOrder', 'config')
        .where({ enabled: true })
        .orderBy('sortOrder')
    )
    return (rows || []).map(r => {
      let cfg = {}
      try { cfg = JSON.parse(r.config || '{}') } catch (_) {}
      return { ...r, _cfg: cfg }
    })
  } catch (_) {
    return []
  }
}

function execRule(rule, bridge, ruleEvaluation) {
  const { ruleType, field, _cfg } = rule
  switch (ruleType) {
    case 'required_field': {
      const v = bridge[field]
      return v == null || (typeof v === 'string' && v.trim() === '')
    }
    case 'non_zero': {
      const n = Number(bridge[field])
      return bridge[field] == null || !Number.isFinite(n) || n === 0
    }
    case 'not_older_than_days': {
      if (!bridge[field]) return false
      const maxAgeMs = (_cfg.days || 730) * 24 * 60 * 60 * 1000
      return Date.now() - new Date(bridge[field]).getTime() > maxAgeMs
    }
    case 'condition_requires_restriction': {
      const conditions = _cfg.conditions || ['Poor', 'Critical']
      if (!conditions.includes(bridge.condition)) return false
      return !ruleEvaluation.activeRestrictionBridgeIds.has(bridge.ID)
    }
    case 'freight_requires_nhvr':
      return !!(bridge.freightRoute && !bridge.nhvrAssessed)
    default:
      return false
  }
}

function evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules) {
  const ruleEvaluation = { activeRestrictionBridgeIds }
  return rules
    .filter(rule => execRule(rule, bridge, ruleEvaluation))
    .map(rule => ({
      ruleId:   rule.id,
      category: rule.category,
      severity: rule.severity,
      message:  rule.message,
      weight:   rule.weight || 10
    }))
}

function calcCompletenessScore(bridge, completenessFields) {
  const fields = completenessFields || QUALITY_COMPLETENESS_FIELDS_DEFAULT
  const populated = fields.filter(f => {
    const v = bridge[f]
    if (v == null) return false
    if (typeof v === 'string' && v.trim() === '') return false
    if (f === 'latitude' || f === 'longitude') return Number(v) !== 0 && Number.isFinite(Number(v))
    return true
  })
  return fields.length > 0 ? Math.round((populated.length / fields.length) * 100) : 100
}

function calcWeightedScore(issues, rules) {
  const totalWeight = rules.reduce((sum, r) => sum + (r.weight || 10), 0)
  if (totalWeight === 0) return 100
  const violatedWeight = issues.reduce((sum, i) => sum + (i.weight || 10), 0)
  return Math.max(0, Math.round((1 - violatedWeight / totalWeight) * 100))
}

function maxSeverity(issues) {
  if (issues.some(i => i.severity === 'critical')) return 'critical'
  if (issues.some(i => i.severity === 'warning')) return 'warning'
  if (issues.some(i => i.severity === 'info')) return 'info'
  return 'none'
}

const router = express.Router()
router.use(express.json())

router.get('/summary', async (_req, res) => {
  try {
    const [bridges, activeRestrictionBridgeIds, rules] = await Promise.all([
      loadQualityBridges(),
      loadActiveRestrictionBridgeIds(),
      loadEnabledRules()
    ])

    const completenessFields = getCompletenessFields(rules)
    const categoryCountMap = {}
    let issueCount = 0, criticalCount = 0, warningCount = 0
    let totalCompleteness = 0, totalWeightedScore = 0

    for (const bridge of bridges) {
      const issues = evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules)
      totalCompleteness += calcCompletenessScore(bridge, completenessFields)
      totalWeightedScore += calcWeightedScore(issues, rules)
      if (issues.length > 0) issueCount++
      for (const issue of issues) {
        if (issue.severity === 'critical') criticalCount++
        else if (issue.severity === 'warning') warningCount++
        categoryCountMap[issue.category] = (categoryCountMap[issue.category] || 0) + 1
      }
    }

    const total = bridges.length
    const completenessPercent = total > 0 ? Math.round(totalCompleteness / total) : 0
    const avgWeightedScore = total > 0 ? Math.round(totalWeightedScore / total) : 100
    const byCategory = Object.entries(categoryCountMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    res.json({ totalBridges: total, issueCount, completenessPercent, criticalCount, warningCount, byCategory, avgWeightedScore })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load quality summary' } })
  }
})

router.get('/issues', async (req, res) => {
  try {
    const { severity, state, name } = req.query

    const [bridges, activeRestrictionBridgeIds, rules] = await Promise.all([
      loadQualityBridges(),
      loadActiveRestrictionBridgeIds(),
      loadEnabledRules()
    ])

    const completenessFields = getCompletenessFields(rules)
    let results = bridges.map(bridge => {
      const issues = evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules)
      return {
        ID: bridge.ID,
        bridgeId: bridge.bridgeId || null,
        bridgeName: bridge.bridgeName || null,
        state: bridge.state || null,
        issues,
        issueCount: issues.length,
        maxSeverity: maxSeverity(issues),
        completenessScore: calcCompletenessScore(bridge, completenessFields),
        weightedScore: calcWeightedScore(issues, rules)
      }
    }).filter(bridge => bridge.issueCount > 0)

    if (severity) {
      const sev = severity.toLowerCase()
      results = results.filter(b => b.issues.some(i => i.severity === sev) || b.maxSeverity === sev)
    }
    if (state) {
      const st = state.toUpperCase()
      results = results.filter(b => (b.state || '').toUpperCase() === st)
    }
    if (name) {
      const needle = name.toLowerCase()
      results = results.filter(b =>
        (b.bridgeName || '').toLowerCase().includes(needle) ||
        (b.bridgeId || '').toLowerCase().includes(needle)
      )
    }

    results.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2, none: 3 }
      const diff = (sevOrder[a.maxSeverity] || 3) - (sevOrder[b.maxSeverity] || 3)
      return diff !== 0 ? diff : b.issueCount - a.issueCount
    })

    res.json({ bridges: results })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load quality issues' } })
  }
})

router.get('/rules', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.DataQualityRules').orderBy('sortOrder', 'name')
    )
    res.json({ rules: rows || [] })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

router.post('/rules', async (req, res) => {
  try {
    const { name, category, severity, ruleType, field, config, message, enabled, sortOrder, weight } = req.body || {}
    if (!name || !category || !severity || !ruleType || !message) {
      return res.status(400).json({ error: { message: 'name, category, severity, ruleType, and message are required' } })
    }
    if (field && !ALLOWED_RULE_FIELDS.has(field)) {
      return res.status(400).json({ error: { message: `Invalid field: "${field}"` } })
    }
    const id = cds.utils.uuid()
    const db = await cds.connect.to('db')
    await db.run(
      INSERT.into('bridge.management.DataQualityRules').entries({
        id, name, category, severity, ruleType,
        field: field || null, config: config || null, message,
        enabled: enabled !== false, sortOrder: sortOrder || 0, weight: weight || 10
      })
    )
    res.status(201).json({ id })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, category, severity, ruleType, field, config, message, enabled, sortOrder, weight } = req.body || {}
    if (!name || !category || !severity || !ruleType || !message) {
      return res.status(400).json({ error: { message: 'name, category, severity, ruleType, and message are required' } })
    }
    if (field && !ALLOWED_RULE_FIELDS.has(field)) {
      return res.status(400).json({ error: { message: `Invalid field: "${field}"` } })
    }
    const db = await cds.connect.to('db')
    const existing = await db.run(SELECT.one.from('bridge.management.DataQualityRules').where({ id }))
    if (!existing) return res.status(404).json({ error: { message: 'Rule not found' } })
    await db.run(
      UPDATE('bridge.management.DataQualityRules')
        .set({ name, category, severity, ruleType, field: field || null, config: config || null, message, enabled: enabled !== false, sortOrder: sortOrder || 0, weight: weight || 10 })
        .where({ id })
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = await cds.connect.to('db')
    const existing = await db.run(SELECT.one.from('bridge.management.DataQualityRules').where({ id }))
    if (!existing) return res.status(404).json({ error: { message: 'Rule not found' } })
    await db.run(DELETE.from('bridge.management.DataQualityRules').where({ id }))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

module.exports = router
