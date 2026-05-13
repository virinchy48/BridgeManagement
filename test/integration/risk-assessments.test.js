'use strict'

// ─── Pure helpers (mirroring srv/handlers/risk-assessments.js) ────────────────

function scoreToLevel(score) {
  if (score >= 15) return 'Extreme'
  if (score >= 10) return 'High'
  if (score >= 5)  return 'Medium'
  return 'Low'
}

function generateAssessmentId(lastId) {
  const m = lastId?.match(/^RSK-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `RSK-${String(seq).padStart(4, '0')}`
}

function computeInherentRisk(data) {
  const likelihood = data.likelihood ?? null
  const consequence = data.consequence ?? null
  if (likelihood === null || consequence === null) return {}
  const inherentRiskScore = likelihood * consequence
  return {
    inherentRiskScore,
    inherentRiskLevel: scoreToLevel(inherentRiskScore)
  }
}

function applyRiskDefaults(data) {
  const out = Object.assign({}, data)
  if (out.active === undefined) out.active = true
  const computed = computeInherentRisk(out)
  if (computed.inherentRiskScore !== undefined) {
    out.inherentRiskScore = computed.inherentRiskScore
    out.inherentRiskLevel = computed.inherentRiskLevel
  }
  // residualRiskScore is NEVER auto-set — it is an explicit engineering input
  return out
}

function buildRiskRecord(overrides) {
  return applyRiskDefaults(Object.assign({
    ID: 'test-rsk-uuid-0001',
    bridge_ID: 'bridge-uuid-test-001',
    riskType: 'Structural',
    likelihood: 3,
    consequence: 4,
  }, overrides))
}

// ─── scoreToLevel ─────────────────────────────────────────────────────────────

describe('scoreToLevel — TfNSW 5×5 risk matrix', () => {
  test('score >= 15 is Extreme', () => {
    expect(scoreToLevel(15)).toBe('Extreme')
    expect(scoreToLevel(25)).toBe('Extreme')
    expect(scoreToLevel(20)).toBe('Extreme')
  })

  test('score 10–14 is High', () => {
    expect(scoreToLevel(10)).toBe('High')
    expect(scoreToLevel(12)).toBe('High')
    expect(scoreToLevel(14)).toBe('High')
  })

  test('score 5–9 is Medium', () => {
    expect(scoreToLevel(5)).toBe('Medium')
    expect(scoreToLevel(9)).toBe('Medium')
    expect(scoreToLevel(7)).toBe('Medium')
  })

  test('score <= 4 is Low', () => {
    expect(scoreToLevel(4)).toBe('Low')
    expect(scoreToLevel(1)).toBe('Low')
    expect(scoreToLevel(0)).toBe('Low')
  })

  test('boundary values are correct', () => {
    expect(scoreToLevel(15)).toBe('Extreme')
    expect(scoreToLevel(14)).toBe('High')
    expect(scoreToLevel(10)).toBe('High')
    expect(scoreToLevel(9)).toBe('Medium')
    expect(scoreToLevel(5)).toBe('Medium')
    expect(scoreToLevel(4)).toBe('Low')
  })
})

// ─── generateAssessmentId ─────────────────────────────────────────────────────

describe('generateAssessmentId', () => {
  test('generates RSK-0001 when no prior assessment exists', () => {
    expect(generateAssessmentId(null)).toBe('RSK-0001')
    expect(generateAssessmentId(undefined)).toBe('RSK-0001')
    expect(generateAssessmentId('')).toBe('RSK-0001')
  })

  test('increments sequence correctly', () => {
    expect(generateAssessmentId('RSK-0001')).toBe('RSK-0002')
    expect(generateAssessmentId('RSK-0099')).toBe('RSK-0100')
  })

  test('does not produce NaN from malformed input', () => {
    const result = generateAssessmentId('INVALID')
    expect(result).toBe('RSK-0001')
    expect(result).not.toContain('NaN')
  })

  test('matches RSK-NNNN pattern', () => {
    expect(generateAssessmentId(null)).toMatch(/^RSK-\d{4,}$/)
    expect(generateAssessmentId('RSK-0042')).toMatch(/^RSK-\d{4,}$/)
  })
})

// ─── computeInherentRisk ──────────────────────────────────────────────────────

describe('computeInherentRisk', () => {
  test('likelihood=3, consequence=4 gives inherentRiskScore=12 (High)', () => {
    const result = computeInherentRisk({ likelihood: 3, consequence: 4 })
    expect(result.inherentRiskScore).toBe(12)
    expect(result.inherentRiskLevel).toBe('High')
  })

  test('likelihood=5, consequence=5 gives inherentRiskScore=25 (Extreme)', () => {
    const result = computeInherentRisk({ likelihood: 5, consequence: 5 })
    expect(result.inherentRiskScore).toBe(25)
    expect(result.inherentRiskLevel).toBe('Extreme')
  })

  test('likelihood=1, consequence=2 gives inherentRiskScore=2 (Low)', () => {
    const result = computeInherentRisk({ likelihood: 1, consequence: 2 })
    expect(result.inherentRiskScore).toBe(2)
    expect(result.inherentRiskLevel).toBe('Low')
  })

  test('returns empty object when likelihood is missing', () => {
    const result = computeInherentRisk({ consequence: 4 })
    expect(result.inherentRiskScore).toBeUndefined()
    expect(result.inherentRiskLevel).toBeUndefined()
  })

  test('returns empty object when consequence is missing', () => {
    const result = computeInherentRisk({ likelihood: 3 })
    expect(result.inherentRiskScore).toBeUndefined()
    expect(result.inherentRiskLevel).toBeUndefined()
  })
})

// ─── applyRiskDefaults (residualRiskScore not auto-set) ───────────────────────

describe('applyRiskDefaults', () => {
  test('residualRiskScore is NOT auto-set — must remain null/undefined', () => {
    const record = buildRiskRecord({ likelihood: 3, consequence: 4 })
    expect(record.residualRiskScore).toBeUndefined()
  })

  test('explicit residualRiskScore is preserved unchanged', () => {
    const record = buildRiskRecord({ likelihood: 3, consequence: 4, residualRiskScore: 6 })
    expect(record.residualRiskScore).toBe(6)
  })

  test('inherentRiskScore is auto-computed from likelihood × consequence', () => {
    const record = buildRiskRecord({ likelihood: 3, consequence: 4 })
    expect(record.inherentRiskScore).toBe(12)
    expect(record.inherentRiskLevel).toBe('High')
  })

  test('active defaults to true', () => {
    const record = buildRiskRecord({})
    expect(record.active).toBe(true)
  })
})
