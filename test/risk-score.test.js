'use strict'

// ─── Inline pure functions (mirrored from srv/handlers/risk-assessments.js) ───

function scoreToLevel(score) {
  if (score >= 15) return 'Extreme'
  if (score >= 10) return 'High'
  if (score >= 5)  return 'Medium'
  return 'Low'
}

function computeInherentRisk(likelihood, consequence) {
  if (likelihood == null || consequence == null) return null
  const inherentRiskScore = likelihood * consequence
  return { inherentRiskScore, inherentRiskLevel: scoreToLevel(inherentRiskScore) }
}

// ─── Auto-ref sequence generation (NaN guard pattern) ─────────────────────────

function nextAssessmentId(lastRef) {
  const m = lastRef?.match(/^RSK-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `RSK-${String(seq).padStart(4, '0')}`
}

// ─── scoreToLevel — TfNSW 5×5 risk matrix ────────────────────────────────────

describe('BridgeRiskAssessments — scoreToLevel (TfNSW 5×5 risk matrix)', () => {
  test('score of 0 is Low', () => {
    expect(scoreToLevel(0)).toBe('Low')
  })

  test('score of 1 is Low', () => {
    expect(scoreToLevel(1)).toBe('Low')
  })

  test('score of 4 is Low (≤4 threshold)', () => {
    expect(scoreToLevel(4)).toBe('Low')
  })

  test('score of 5 is Medium (boundary)', () => {
    expect(scoreToLevel(5)).toBe('Medium')
  })

  test('score of 9 is Medium (≤9 threshold)', () => {
    expect(scoreToLevel(9)).toBe('Medium')
  })

  test('score of 10 is High (boundary)', () => {
    expect(scoreToLevel(10)).toBe('High')
  })

  test('score of 14 is High (≤14 threshold)', () => {
    expect(scoreToLevel(14)).toBe('High')
  })

  test('score of 15 is Extreme (boundary)', () => {
    expect(scoreToLevel(15)).toBe('Extreme')
  })

  test('score of 25 is Extreme (maximum on 5×5 matrix)', () => {
    expect(scoreToLevel(25)).toBe('Extreme')
  })

  test('score of 100 is still Extreme', () => {
    expect(scoreToLevel(100)).toBe('Extreme')
  })
})

// ─── computeInherentRisk — score = likelihood × consequence ──────────────────

describe('BridgeRiskAssessments — inherentRiskScore computation', () => {
  test('1×1 → score 1, level Low', () => {
    const r = computeInherentRisk(1, 1)
    expect(r.inherentRiskScore).toBe(1)
    expect(r.inherentRiskLevel).toBe('Low')
  })

  test('2×2 → score 4, level Low', () => {
    const r = computeInherentRisk(2, 2)
    expect(r.inherentRiskScore).toBe(4)
    expect(r.inherentRiskLevel).toBe('Low')
  })

  test('1×5 → score 5, level Medium (boundary)', () => {
    const r = computeInherentRisk(1, 5)
    expect(r.inherentRiskScore).toBe(5)
    expect(r.inherentRiskLevel).toBe('Medium')
  })

  test('2×5 → score 10, level High (boundary)', () => {
    const r = computeInherentRisk(2, 5)
    expect(r.inherentRiskScore).toBe(10)
    expect(r.inherentRiskLevel).toBe('High')
  })

  test('3×5 → score 15, level Extreme (boundary)', () => {
    const r = computeInherentRisk(3, 5)
    expect(r.inherentRiskScore).toBe(15)
    expect(r.inherentRiskLevel).toBe('Extreme')
  })

  test('5×5 → score 25, level Extreme (maximum)', () => {
    const r = computeInherentRisk(5, 5)
    expect(r.inherentRiskScore).toBe(25)
    expect(r.inherentRiskLevel).toBe('Extreme')
  })

  test('returns null when likelihood is null', () => {
    expect(computeInherentRisk(null, 3)).toBeNull()
  })

  test('returns null when consequence is null', () => {
    expect(computeInherentRisk(3, null)).toBeNull()
  })

  test('returns null when both are null', () => {
    expect(computeInherentRisk(null, null)).toBeNull()
  })

  test('score is always likelihood × consequence regardless of matrix level', () => {
    for (let l = 1; l <= 5; l++) {
      for (let c = 1; c <= 5; c++) {
        const r = computeInherentRisk(l, c)
        expect(r.inherentRiskScore).toBe(l * c)
      }
    }
  })
})

// ─── residualRiskScore must NOT auto-default to inherentRiskScore ─────────────

describe('BridgeRiskAssessments — residualRiskScore isolation', () => {
  function applyCreate(d) {
    if (d.likelihood != null && d.consequence != null) {
      d.inherentRiskScore = d.likelihood * d.consequence
      d.inherentRiskLevel = scoreToLevel(d.inherentRiskScore)
    }
    return d
  }

  test('residualRiskScore remains undefined after CREATE with likelihood+consequence', () => {
    const d = applyCreate({ likelihood: 4, consequence: 3 })
    expect(d.inherentRiskScore).toBe(12)
    expect(d.inherentRiskLevel).toBe('High')
    expect(d.residualRiskScore).toBeUndefined()
  })

  test('residualRiskLevel remains undefined after CREATE', () => {
    const d = applyCreate({ likelihood: 5, consequence: 5 })
    expect(d.residualRiskLevel).toBeUndefined()
  })

  test('explicit residualRiskScore is preserved unchanged by CREATE logic', () => {
    const d = applyCreate({ likelihood: 4, consequence: 4, residualRiskScore: 8 })
    expect(d.inherentRiskScore).toBe(16)
    expect(d.residualRiskScore).toBe(8)
  })
})

// ─── Auto-ref sequence — RSK-NNNN NaN guard ───────────────────────────────────

describe('BridgeRiskAssessments — nextAssessmentId auto-ref NaN guard', () => {
  test('first record ever (no existing) → RSK-0001', () => {
    expect(nextAssessmentId(undefined)).toBe('RSK-0001')
    expect(nextAssessmentId(null)).toBe('RSK-0001')
  })

  test('empty string (corrupt last ref) → RSK-0001, not RSK-0NaN', () => {
    const result = nextAssessmentId('')
    expect(result).toBe('RSK-0001')
    expect(result).not.toContain('NaN')
  })

  test('malformed ref (no numeric part) → RSK-0001', () => {
    expect(nextAssessmentId('RSK-ABC')).toBe('RSK-0001')
    expect(nextAssessmentId('RSK-')).toBe('RSK-0001')
    expect(nextAssessmentId('INVALID')).toBe('RSK-0001')
  })

  test('valid last ref RSK-0001 → RSK-0002', () => {
    expect(nextAssessmentId('RSK-0001')).toBe('RSK-0002')
  })

  test('valid last ref RSK-0009 → RSK-0010', () => {
    expect(nextAssessmentId('RSK-0009')).toBe('RSK-0010')
  })

  test('valid last ref RSK-0099 → RSK-0100', () => {
    expect(nextAssessmentId('RSK-0099')).toBe('RSK-0100')
  })

  test('valid last ref RSK-0999 → RSK-1000', () => {
    expect(nextAssessmentId('RSK-0999')).toBe('RSK-1000')
  })

  test('result always starts with RSK-', () => {
    ['RSK-0001', 'RSK-0050', '', null, undefined, 'RSK-ABC'].forEach(ref => {
      expect(nextAssessmentId(ref)).toMatch(/^RSK-/)
    })
  })

  test('result never contains NaN', () => {
    ['', null, undefined, 'RSK-', 'RSK-ABC', 'RSK-0NaN'].forEach(ref => {
      expect(nextAssessmentId(ref)).not.toContain('NaN')
    })
  })

  test('numeric part is always zero-padded to 4 digits', () => {
    expect(nextAssessmentId('RSK-0001')).toMatch(/^RSK-\d{4}$/)
    expect(nextAssessmentId(null)).toMatch(/^RSK-\d{4}$/)
  })
})

// ─── scoreToLevel boundary completeness check ─────────────────────────────────

describe('BridgeRiskAssessments — scoreToLevel covers all 5×5 matrix cells', () => {
  const matrix = {}
  for (let l = 1; l <= 5; l++) {
    for (let c = 1; c <= 5; c++) {
      const score = l * c
      const level = scoreToLevel(score)
      matrix[score] = level
    }
  }

  test('all 25 matrix cells produce a valid risk level', () => {
    const validLevels = new Set(['Low', 'Medium', 'High', 'Extreme'])
    Object.values(matrix).forEach(level => {
      expect(validLevels.has(level)).toBe(true)
    })
  })

  test('TfNSW 5×5 matrix has at least one cell in each level', () => {
    const levels = new Set(Object.values(matrix))
    expect(levels.has('Low')).toBe(true)
    expect(levels.has('Medium')).toBe(true)
    expect(levels.has('High')).toBe(true)
    expect(levels.has('Extreme')).toBe(true)
  })
})
